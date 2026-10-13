// What one run of the recorder captures: the pull request's app, recorded as a screenshot and a
// video, or the base branch's app, captured as one screenshot to compare it with.
export type PreviewCapture = 'pull-request' | 'base'

export interface PreviewRecordingOptions {
  capture: PreviewCapture
  baseUrl: string
  route: string
  clickSelectors: string[]
  showSelector: string | null
  steps: string[]
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

// One "Preview click:" or "Preview show:" line, run against the page in body order.
export interface PreviewAction {
  kind: 'click' | 'show'
  selector: string
}

// One beat of the video: a "Preview step:" caption shown before its action. Either can be
// missing when the body has more captions than actions, or more actions than captions.
export interface PreviewTimelineEntry {
  caption: string | null
  action: PreviewAction | null
}
