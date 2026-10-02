import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, type Page } from 'playwright'
import { buildPreviewUrl, readPreviewCapture, readPreviewClicks, readPreviewRoute, readPreviewShow } from './route.ts'
import type { PreviewCapture, PreviewRecordingOptions, PreviewRecordingResult } from './types.ts'

// Software GL so canvas and WebGL scenes render on runners without a GPU.
const chromiumArguments = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

const readOptionsFromEnvironment = (environment: NodeJS.ProcessEnv): PreviewRecordingOptions => ({
  capture: readPreviewCapture(environment.PREVIEW_CAPTURE),
  baseUrl: environment.PREVIEW_BASE_URL ?? 'http://localhost:3000',
  route: readPreviewRoute(environment.PR_BODY ?? '', environment.PREVIEW_DEFAULT_ROUTE ?? '/'),
  clickSelectors: readPreviewClicks(environment.PR_BODY ?? ''),
  showSelector: readPreviewShow(environment.PR_BODY ?? ''),
  outputDirectory: environment.PREVIEW_OUTPUT_DIRECTORY ?? 'pr-preview',
  settleMilliseconds: Number(environment.PREVIEW_SETTLE_MS ?? '8000'),
  viewportWidth: 1280,
  viewportHeight: 800,
})

// The video ends where the screenshot is taken, so it lingers on the feature long enough to be seen.
const featureHoldMilliseconds = 3000
// Long enough for an unfold or a tab switch to finish its transition before the next step.
const clickSettleMilliseconds = 800
const clickTimeoutMilliseconds = 5000

// On the pull request a selector that matches nothing fails the recording: a preview without the
// feature on screen is the very thing these lines exist to prevent. On the base branch the
// feature may not exist yet, which is what the before picture is for, so the step is skipped.
const runStep = async (capture: PreviewCapture, stepName: string, step: () => Promise<void>): Promise<void> => {
  if (capture === 'pull-request') return step()
  await step().catch((stepError: unknown) => {
    const reason = stepError instanceof Error ? stepError.message.split('\n')[0] : String(stepError)
    process.stdout.write(`Skipped on the base branch: ${stepName} (${reason})\n`)
  })
}

const clickOnce = async (page: Page, clickSelector: string): Promise<void> => {
  const clickTarget = page.locator(clickSelector).first()
  await clickTarget.scrollIntoViewIfNeeded({ timeout: clickTimeoutMilliseconds })
  await clickTarget.click({ timeout: clickTimeoutMilliseconds })
  await page.waitForTimeout(clickSettleMilliseconds)
}

const clickInOrder = (page: Page, capture: PreviewCapture, clickSelectors: string[]): Promise<void> =>
  clickSelectors.reduce(async (previousClick, clickSelector) => {
    await previousClick
    await runStep(capture, `click ${clickSelector}`, () => clickOnce(page, clickSelector))
  }, Promise.resolve())

const scrollToTop = async (page: Page, capture: PreviewCapture, showSelector: string | null): Promise<void> => {
  if (showSelector === null) return
  await runStep(capture, `show ${showSelector}`, async () => {
    await page
      .locator(showSelector)
      .first()
      .evaluate((shownElement) => shownElement.scrollIntoView({ block: 'start' }), undefined, {
        timeout: clickTimeoutMilliseconds,
      })
    await page.waitForTimeout(clickSettleMilliseconds)
  })
}

const findRecordedVideo = async (videoDirectory: string): Promise<string> => {
  const recordedFiles = await readdir(videoDirectory)
  const recordedVideo = recordedFiles.find((fileName) => fileName.endsWith('.webm'))
  if (recordedVideo === undefined) throw new Error(`No video was recorded in ${videoDirectory}`)
  return join(videoDirectory, recordedVideo)
}

// The pull request's capture is the screenshot and video the preview has always had; the base
// branch's is one screenshot, taken the same way so the two line up.
const screenshotFileNames: Record<PreviewCapture, string> = { 'pull-request': 'screenshot.png', base: 'before.png' }

export const recordPreview = async (options: PreviewRecordingOptions): Promise<PreviewRecordingResult> => {
  const recordsVideo = options.capture === 'pull-request'
  const videoDirectory = join(options.outputDirectory, 'raw-video')
  await mkdir(recordsVideo ? videoDirectory : options.outputDirectory, { recursive: true })

  const url = buildPreviewUrl(options.baseUrl, options.route)
  const viewport = { width: options.viewportWidth, height: options.viewportHeight }
  const browser = await chromium.launch({ args: chromiumArguments })
  const context = await browser.newContext(
    recordsVideo ? { viewport, recordVideo: { dir: videoDirectory, size: viewport } } : { viewport },
  )
  const page = await context.newPage()

  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(options.settleMilliseconds)
  await clickInOrder(page, options.capture, options.clickSelectors)
  await scrollToTop(page, options.capture, options.showSelector)
  const screenshotPath = join(options.outputDirectory, screenshotFileNames[options.capture])
  await page.screenshot({ path: screenshotPath })
  if (recordsVideo) await page.waitForTimeout(featureHoldMilliseconds)

  await context.close()
  await browser.close()
  if (!recordsVideo) return { screenshotPath, videoPath: null, url }

  const videoPath = join(options.outputDirectory, 'video.webm')
  await rename(await findRecordedVideo(videoDirectory), videoPath)
  await rm(videoDirectory, { recursive: true, force: true })
  return { screenshotPath, videoPath, url }
}

const recordingResult = await recordPreview(readOptionsFromEnvironment(process.env))
const recordedPaths = [recordingResult.screenshotPath, recordingResult.videoPath].filter((recordedPath) => recordedPath !== null)
process.stdout.write(`Recorded ${recordingResult.url}\n${recordedPaths.map((recordedPath) => `  ${recordedPath}\n`).join('')}`)
