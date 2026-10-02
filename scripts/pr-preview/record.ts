import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, type Page } from 'playwright'
import { buildPreviewUrl, readPreviewClicks, readPreviewRoute, readPreviewShow } from './route.ts'
import type { PreviewRecordingOptions, PreviewRecordingResult } from './types.ts'

// Software GL so canvas and WebGL scenes render on runners without a GPU.
const chromiumArguments = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

const readOptionsFromEnvironment = (environment: NodeJS.ProcessEnv): PreviewRecordingOptions => ({
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

// A selector that matches nothing fails the recording: a preview without the feature on screen
// is the very thing these lines exist to prevent.
const clickInOrder = (page: Page, clickSelectors: string[]): Promise<void> =>
  clickSelectors.reduce(async (previousClick, clickSelector) => {
    await previousClick
    const clickTarget = page.locator(clickSelector).first()
    await clickTarget.scrollIntoViewIfNeeded({ timeout: clickTimeoutMilliseconds })
    await clickTarget.click({ timeout: clickTimeoutMilliseconds })
    await page.waitForTimeout(clickSettleMilliseconds)
  }, Promise.resolve())

const scrollToTop = async (page: Page, showSelector: string | null): Promise<void> => {
  if (showSelector === null) return
  await page
    .locator(showSelector)
    .first()
    .evaluate((shownElement) => shownElement.scrollIntoView({ block: 'start' }), undefined, {
      timeout: clickTimeoutMilliseconds,
    })
  await page.waitForTimeout(clickSettleMilliseconds)
}

const findRecordedVideo = async (videoDirectory: string): Promise<string> => {
  const recordedFiles = await readdir(videoDirectory)
  const recordedVideo = recordedFiles.find((fileName) => fileName.endsWith('.webm'))
  if (recordedVideo === undefined) throw new Error(`No video was recorded in ${videoDirectory}`)
  return join(videoDirectory, recordedVideo)
}

export const recordPreview = async (options: PreviewRecordingOptions): Promise<PreviewRecordingResult> => {
  const videoDirectory = join(options.outputDirectory, 'raw-video')
  await mkdir(videoDirectory, { recursive: true })

  const url = buildPreviewUrl(options.baseUrl, options.route)
  const viewport = { width: options.viewportWidth, height: options.viewportHeight }
  const browser = await chromium.launch({ args: chromiumArguments })
  const context = await browser.newContext({ viewport, recordVideo: { dir: videoDirectory, size: viewport } })
  const page = await context.newPage()

  await page.goto(url, { waitUntil: 'load' })
  await page.waitForTimeout(options.settleMilliseconds)
  await clickInOrder(page, options.clickSelectors)
  await scrollToTop(page, options.showSelector)
  const screenshotPath = join(options.outputDirectory, 'screenshot.png')
  await page.screenshot({ path: screenshotPath })
  await page.waitForTimeout(featureHoldMilliseconds)

  await context.close()
  await browser.close()

  const videoPath = join(options.outputDirectory, 'video.webm')
  await rename(await findRecordedVideo(videoDirectory), videoPath)
  await rm(videoDirectory, { recursive: true, force: true })
  return { screenshotPath, videoPath, url }
}

const recordingResult = await recordPreview(readOptionsFromEnvironment(process.env))
process.stdout.write(`Recorded ${recordingResult.url}\n  ${recordingResult.screenshotPath}\n  ${recordingResult.videoPath}\n`)
