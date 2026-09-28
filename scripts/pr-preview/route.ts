const previewRouteLinePattern = /^\s*preview route\s*:\s*(\S+)\s*$/im

// The body is written by anyone who can open a pull request, so only a plain absolute path
// is accepted; anything else falls back to the default rather than reaching the browser.
const safeRoutePattern = /^\/[A-Za-z0-9/_\-.~%?=&#]*$/

export const isSafeRoute = (route: string): boolean =>
  safeRoutePattern.test(route) && !route.split('/').includes('..')

export const readPreviewRoute = (pullRequestBody: string, defaultRoute: string): string => {
  const routeMatch = previewRouteLinePattern.exec(pullRequestBody)
  const requestedRoute = routeMatch?.[1]?.replace(/^`|`$/g, '')
  return requestedRoute !== undefined && isSafeRoute(requestedRoute) ? requestedRoute : defaultRoute
}

export const buildPreviewUrl = (baseUrl: string, route: string): string =>
  `${baseUrl.replace(/\/+$/, '')}${route.startsWith('/') ? route : `/${route}`}`
