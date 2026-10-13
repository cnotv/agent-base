import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, type Page } from 'playwright'
import {
  buildPreviewTimeline,
  buildPreviewUrl,
  readPreviewCapture,
  readPreviewClicks,
  readPreviewRoute,
  readPreviewShow,
  readPreviewSteps,
} from './route.ts'
import type { PreviewAction, PreviewCapture, PreviewRecordingOptions, PreviewRecordingResult, PreviewTimelineEntry } from './types.ts'

// Software GL so canvas and WebGL scenes render on runners without a GPU.
const chromiumArguments = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

const readOptionsFromEnvironment = (environment: NodeJS.ProcessEnv): PreviewRecordingOptions => ({
  capture: readPreviewCapture(environment.PREVIEW_CAPTURE),
  baseUrl: environment.PREVIEW_BASE_URL ?? 'http://localhost:3000',
  route: readPreviewRoute(environment.PR_BODY ?? '', environment.PREVIEW_DEFAULT_ROUTE ?? '/'),
  clickSelectors: readPreviewClicks(environment.PR_BODY ?? ''),
  showSelector: readPreviewShow(environment.PR_BODY ?? ''),
  steps: readPreviewSteps(environment.PR_BODY ?? ''),
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
// How long each step caption stays on screen before its action, so it can be read in the video.
const stepCaptionMilliseconds = 2200

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

// ─── Video overlays ────────────────────────────────────────────────────────────
//
// The runner's browser has no visible mouse, so the video injects its own: a custom cursor that
// follows page.mouse, a click ripple, a bottom caption with the step text, and a top-right
// "Step N of M" badge. Captions are set with textContent, so PR-body text cannot become markup.
// Overlays are injected after navigation (navigation wipes the DOM) and removed before the
// screenshot so the still image stays clean.

const overlayScript = (): void => {
  if (document.getElementById('preview-cursor')) return
  const cursor = document.createElement('div')
  cursor.id = 'preview-cursor'
  cursor.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" style="filter: drop-shadow(1px 1px 3px rgba(0,0,0,0.6));">' +
    '<path d="M4 2L20 12L12 14L9 22L4 2Z" fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>' +
    '</svg>'
  cursor.style.cssText =
    'position:fixed;width:26px;height:26px;pointer-events:none;z-index:2147483647;left:0;top:0;' +
    'transition:transform 0.05s linear;will-change:transform;'
  document.body.appendChild(cursor)

  const caption = document.createElement('div')
  caption.id = 'preview-caption'
  caption.style.cssText =
    'position:fixed;bottom:48px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;' +
    'padding:12px 28px;border-radius:10px;font-family:system-ui,-apple-system,sans-serif;font-size:17px;' +
    'font-weight:500;z-index:2147483646;max-width:85%;text-align:center;opacity:0;transition:opacity 0.3s ease;' +
    'pointer-events:none;'
  document.body.appendChild(caption)

  const badge = document.createElement('div')
  badge.id = 'preview-step'
  badge.style.cssText =
    'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.7);color:#fff;padding:8px 16px;border-radius:20px;' +
    'font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;z-index:2147483646;' +
    'opacity:0;transition:opacity 0.3s ease;pointer-events:none;'
  document.body.appendChild(badge)

  const ripples = document.createElement('div')
  ripples.id = 'preview-ripples'
  ripples.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483645;'
  document.body.appendChild(ripples)

  const style = document.createElement('style')
  style.id = 'preview-overlay-style'
  style.textContent =
    '*{cursor:none!important;}' +
    '@keyframes preview-ripple{0%{width:20px;height:20px;opacity:1;}100%{width:64px;height:64px;opacity:0;}}'
  document.head.appendChild(style)

  document.addEventListener('mousemove', (event) => {
    cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`
  })
  document.addEventListener('click', (event) => {
    const ripple = document.createElement('div')
    const container = document.getElementById('preview-ripples')
    if (!container) return
    ripple.style.cssText =
      `position:fixed;left:${event.clientX}px;top:${event.clientY}px;width:20px;height:20px;` +
      'border:3px solid rgba(255,50,50,0.85);border-radius:50%;transform:translate(-50%,-50%);' +
      'animation:preview-ripple 0.6s ease-out forwards;pointer-events:none;'
    container.appendChild(ripple)
    setTimeout(() => ripple.remove(), 650)
  })
}

const ensureOverlays = async (page: Page): Promise<void> => {
  await page.evaluate(overlayScript)
}

const showCaption = async (page: Page, caption: string, step: number, total: number): Promise<void> => {
  await page.evaluate(
    ({ text, stepNumber, stepTotal }) => {
      const captionOverlay = document.getElementById('preview-caption')
      if (captionOverlay) {
        captionOverlay.textContent = text
        captionOverlay.style.opacity = '1'
      }
      const badge = document.getElementById('preview-step')
      if (badge) {
        badge.textContent = `Step ${stepNumber} of ${stepTotal}`
        badge.style.opacity = '1'
      }
    },
    { text: caption, stepNumber: step, stepTotal: total },
  )
  await page.waitForTimeout(stepCaptionMilliseconds)
}

const hideOverlaysForScreenshot = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const overlayIds = ['preview-caption', 'preview-step', 'preview-cursor', 'preview-ripples', 'preview-overlay-style']
    overlayIds.forEach((overlayId) => document.getElementById(overlayId)?.remove())
  })
}

// Glides the mouse in small moves so the injected cursor travels across the video; locator.click
// alone would teleport it with no visible path.
const moveMouseTo = async (page: Page, x: number, y: number): Promise<void> => {
  await page.mouse.move(x, y, { steps: 25 })
  await page.waitForTimeout(250)
}

const clickOnce = async (page: Page, clickSelector: string, withCursor: boolean): Promise<void> => {
  const clickTarget = page.locator(clickSelector).first()
  await clickTarget.scrollIntoViewIfNeeded({ timeout: clickTimeoutMilliseconds })
  if (withCursor) {
    const box = await clickTarget.boundingBox()
    if (box !== null) {
      await moveMouseTo(page, box.x + box.width / 2, box.y + box.height / 2)
    }
  }
  await clickTarget.click({ timeout: clickTimeoutMilliseconds })
  await page.waitForTimeout(clickSettleMilliseconds)
}

const showOnce = async (page: Page, showSelector: string): Promise<void> => {
  await page
    .locator(showSelector)
    .first()
    .evaluate((shownElement) => shownElement.scrollIntoView({ block: 'start' }), undefined, {
      timeout: clickTimeoutMilliseconds,
    })
  await page.waitForTimeout(clickSettleMilliseconds)
}

const runAction = (page: Page, capture: PreviewCapture, action: PreviewAction, withOverlays: boolean): Promise<void> =>
  runStep(capture, `${action.kind} ${action.selector}`, () =>
    action.kind === 'click' ? clickOnce(page, action.selector, withOverlays) : showOnce(page, action.selector),
  )

// A click that navigates wipes the overlays, so they are re-injected at every beat.
const playTimelineEntry = async (
  page: Page,
  options: PreviewRecordingOptions,
  timelineEntry: PreviewTimelineEntry,
  timelineIndex: number,
  withOverlays: boolean,
): Promise<void> => {
  if (withOverlays) await ensureOverlays(page)
  if (withOverlays && timelineEntry.caption !== null) {
    await showCaption(page, timelineEntry.caption, timelineIndex + 1, options.steps.length)
  }
  if (timelineEntry.action !== null) await runAction(page, options.capture, timelineEntry.action, withOverlays)
}

const playTimeline = (page: Page, options: PreviewRecordingOptions, withOverlays: boolean): Promise<void> =>
  buildPreviewTimeline(options.steps, options.clickSelectors, options.showSelector).reduce(
    async (previousEntry, timelineEntry, timelineIndex) => {
      await previousEntry
      await playTimelineEntry(page, options, timelineEntry, timelineIndex, withOverlays)
    },
    Promise.resolve(),
  )

// ─── Recording ─────────────────────────────────────────────────────────────────

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
  const withOverlays = recordsVideo && options.steps.length > 0
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
  if (withOverlays) {
    await ensureOverlays(page)
    // Park the cursor where the video starts so it is visible from the first frame.
    await moveMouseTo(page, 240, 240)
  }

  await playTimeline(page, options, withOverlays)

  if (withOverlays) {
    await hideOverlaysForScreenshot(page)
  }

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
