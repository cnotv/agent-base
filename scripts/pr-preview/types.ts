// What one run of the recorder captures: the pull request's app, recorded as a screenshot and a
// video, or the base branch's app, captured as one screenshot to compare it with.
export type PreviewCapture = 'pull-request' | 'base'

export interface PreviewRecordingOptions {
  capture: PreviewCapture
  baseUrl: string
  route: string
  clickSelectors: string[]
  showSelector: string | null
  outputDirectory: string
  settleMilliseconds: number
  viewportWidth: number
  viewportHeight: number
}

export interface PreviewRecordingResult {
  screenshotPath: string
  videoPath: string | null
  url: string
}
