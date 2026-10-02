import type { PreviewCapture } from './types.ts'

const previewRouteLinePattern = /^\s*preview route\s*:\s*(\S+)\s*$/im
const previewClickLinePattern = /^\s*preview click\s*:\s*(.+?)\s*$/gim
const previewShowLinePattern = /^\s*preview show\s*:\s*(.+?)\s*$/im

// Enough to unfold a panel or open a tab on the way to a feature, short of a script.
const maximumClickCount = 5
const maximumSelectorLength = 200

const stripBackticks = (text: string): string => text.replace(/^`|`$/g, '')

// The body is written by anyone who can open a pull request, so only a plain absolute path
// is accepted; anything else falls back to the default rather than reaching the browser.
const safeRoutePattern = /^\/[A-Za-z0-9/_\-.~%?=&#]*$/

export const isSafeRoute = (route: string): boolean =>
  safeRoutePattern.test(route) && !route.split('/').includes('..')

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
 */
export const readPreviewClicks = (pullRequestBody: string): string[] =>
  Array.from(pullRequestBody.matchAll(previewClickLinePattern), (clickMatch) => stripBackticks(clickMatch[1] ?? ''))
    .filter(isUsableSelector)
    .slice(0, maximumClickCount)

/** The selector of the "Preview show:" line, scrolled to the top of the viewport after the clicks. */
export const readPreviewShow = (pullRequestBody: string): string | null => {
  const showMatch = previewShowLinePattern.exec(pullRequestBody)
  const showSelector = showMatch?.[1] === undefined ? '' : stripBackticks(showMatch[1])
  return isUsableSelector(showSelector) ? showSelector : null
}

export const buildPreviewUrl = (baseUrl: string, route: string): string =>
  `${baseUrl.replace(/\/+$/, '')}${route.startsWith('/') ? route : `/${route}`}`

/** Reads PREVIEW_CAPTURE: `base` captures the base branch to compare with; anything else, the pull request. */
export const readPreviewCapture = (captureSetting: string | undefined): PreviewCapture =>
  captureSetting?.trim().toLowerCase() === 'base' ? 'base' : 'pull-request'
