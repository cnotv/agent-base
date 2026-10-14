import type { PreviewAction, PreviewCapture, PreviewTimelineEntry } from './types.ts'

const previewRouteLinePattern = /^\s*preview route\s*:\s*(\S+)\s*$/im
const previewClickLinePattern = /^\s*preview click\s*:\s*(.+?)\s*$/gim
const previewShowLinePattern = /^\s*preview show\s*:\s*(.+?)\s*$/im
const previewStepLinePattern = /^[ \t]*preview step[ \t]*:[ \t]*(.+?)[ \t]*$/gim

// Enough to unfold a panel or open a tab on the way to a feature, short of a script.
const maximumClickCount = 5
const maximumSelectorLength = 200

const stripBackticks = (text: string): string => text.replace(/^`|`$/g, '')

// The body is written by anyone who can open a pull request, so only a plain absolute path
// is accepted; anything else falls back to the default rather than reaching the browser.
const safeRoutePattern = /^\/[A-Za-z0-9/_\-.~%?=&#]*$/

/**
 * Says whether a route from a pull request body may reach the browser.
 * @param route The route as written in the body.
 * @returns True for a plain absolute path with no `..` segment.
 */
export const isSafeRoute = (route: string): boolean =>
  safeRoutePattern.test(route) && !route.split('/').includes('..')

/**
 * Reads the route of the "Preview route:" line, so the preview records the page the change is on.
 * @param pullRequestBody The pull request body.
 * @param defaultRoute The route the workflow was given, used when the line is missing or unsafe.
 * @returns The route to record.
 */
export const readPreviewRoute = (pullRequestBody: string, defaultRoute: string): string => {
  const routeMatch = previewRouteLinePattern.exec(pullRequestBody)
  const requestedRoute = routeMatch?.[1] === undefined ? undefined : stripBackticks(routeMatch[1])
  return requestedRoute !== undefined && isSafeRoute(requestedRoute) ? requestedRoute : defaultRoute
}

const isUsableSelector = (selector: string): boolean => selector !== '' && selector.length <= maximumSelectorLength

/**
 * The selectors of the "Preview click:" lines, in body order, clicked before the screenshot so a
 * feature behind a fold or a tab is on screen. They only ever reach a throwaway browser on the
 * runner's own app, so a selector needs no more checking than a sane length.
 * @param pullRequestBody The pull request body.
 * @returns Up to five selectors, empty and overlong ones left out.
 */
export const readPreviewClicks = (pullRequestBody: string): string[] =>
  Array.from(pullRequestBody.matchAll(previewClickLinePattern), (clickMatch) => stripBackticks(clickMatch[1] ?? ''))
    .filter(isUsableSelector)
    .slice(0, maximumClickCount)

/**
 * The selector of the "Preview show:" line, scrolled to the top of the viewport after the clicks.
 * @param pullRequestBody The pull request body.
 * @returns The selector, or null when the line is missing, empty or overlong.
 */
export const readPreviewShow = (pullRequestBody: string): string | null => {
  const showMatch = previewShowLinePattern.exec(pullRequestBody)
  const showSelector = showMatch?.[1] === undefined ? '' : stripBackticks(showMatch[1])
  return isUsableSelector(showSelector) ? showSelector : null
}

const maximumStepCount = 10
const maximumStepLength = 140

/**
 * The captions of the "Preview step:" lines, in body order, shown as overlays during the video.
 * Each step describes what the recording is about to do or has just done. The pattern stays
 * within one line so an empty step line cannot swallow the line below it.
 * @param pullRequestBody The pull request body.
 * @returns Up to ten captions, empty and overlong ones left out.
 */
export const readPreviewSteps = (pullRequestBody: string): string[] =>
  Array.from(pullRequestBody.matchAll(previewStepLinePattern), (stepMatch) => stripBackticks(stepMatch[1] ?? '').trim())
    .filter((caption) => caption !== '' && caption.length <= maximumStepLength)
    .slice(0, maximumStepCount)

/**
 * Pairs the step captions with the actions by position: caption one narrates the first click,
 * and the show runs after the clicks. Neither list is cut to the other's length, so a click
 * without a caption still runs and a caption without an action still shows.
 * @param steps The captions, in body order.
 * @param clickSelectors The selectors to click, in body order.
 * @param showSelector The selector to scroll to after the clicks, if any.
 * @returns One entry per position, with a caption, an action, or both.
 */
export const buildPreviewTimeline = (
  steps: string[],
  clickSelectors: string[],
  showSelector: string | null,
): PreviewTimelineEntry[] => {
  const actions: PreviewAction[] = [
    ...clickSelectors.map((selector): PreviewAction => ({ kind: 'click', selector })),
    ...(showSelector === null ? [] : [{ kind: 'show', selector: showSelector } satisfies PreviewAction]),
  ]
  return Array.from({ length: Math.max(steps.length, actions.length) }, (_, timelineIndex) => ({
    caption: steps[timelineIndex] ?? null,
    action: actions[timelineIndex] ?? null,
  }))
}

/**
 * Joins the app's base URL and a route with exactly one slash between them.
 * @param baseUrl Where the app is served, with or without a trailing slash.
 * @param route The route, with or without a leading slash.
 * @returns The URL to open.
 */
export const buildPreviewUrl = (baseUrl: string, route: string): string =>
  `${baseUrl.replace(/\/+$/, '')}${route.startsWith('/') ? route : `/${route}`}`

/**
 * Reads PREVIEW_CAPTURE: `base` captures the base branch to compare with; anything else, the pull request.
 * @param captureSetting The variable's value, if set.
 * @returns Which branch this run captures.
 */
export const readPreviewCapture = (captureSetting: string | undefined): PreviewCapture =>
  captureSetting?.trim().toLowerCase() === 'base' ? 'base' : 'pull-request'
