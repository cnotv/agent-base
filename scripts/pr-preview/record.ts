import { mkdir, readdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from 'playwright'
import { buildPreviewUrl, readPreviewRoute } from './route.ts'
import type { PreviewRecordingOptions, PreviewRecordingResult } from './types.ts'

// Software GL so canvas and WebGL scenes render on runners without a GPU.
const chromiumArguments = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

const readOptionsFromEnvironment = (environment: NodeJS.ProcessEnv): PreviewRecordingOptions => ({
  baseUrl: environment.PREVIEW_BASE_URL ?? 'http://localhost:3000',
  route: readPreviewRoute(environment.PR_BODY ?? '', environment.PREVIEW_DEFAULT_ROUTE ?? '/'),
  outputDirectory: environment.PREVIEW_OUTPUT_DIRECTORY ?? 'pr-preview',
  settleMilliseconds: Number(environment.PREVIEW_SETTLE_MS ?? '8000'),
  viewportWidth: 1280,
  viewportHeight: 800,
})

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
  const screenshotPath = join(options.outputDirectory, 'screenshot.png')
  await page.screenshot({ path: screenshotPath })

  await context.close()
  await browser.close()

  const videoPath = join(options.outputDirectory, 'video.webm')
  await rename(await findRecordedVideo(videoDirectory), videoPath)
  await rm(videoDirectory, { recursive: true, force: true })
  return { screenshotPath, videoPath, url }
}

const recordingResult = await recordPreview(readOptionsFromEnvironment(process.env))
process.stdout.write(`Recorded ${recordingResult.url}\n  ${recordingResult.screenshotPath}\n  ${recordingResult.videoPath}\n`)
