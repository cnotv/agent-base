export interface PreviewRecordingOptions {
  baseUrl: string
  route: string
  outputDirectory: string
  settleMilliseconds: number
  viewportWidth: number
  viewportHeight: number
}

export interface PreviewRecordingResult {
  screenshotPath: string
  videoPath: string
  url: string
}
