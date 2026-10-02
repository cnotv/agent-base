import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPreviewUrl, isSafeRoute, readPreviewClicks, readPreviewRoute, readPreviewShow } from './route.ts'

describe('readPreviewRoute', () => {
  it('returns the default when the body has no preview line', () => {
    assert.equal(readPreviewRoute('Closes #4\n\nSome text', '/'), '/')
  })

  it('reads the route from a preview line anywhere in the body', () => {
    const pullRequestBody = 'Closes #4\n\n## In short\n\nPreview route: /games/Minigolf\n'
    assert.equal(readPreviewRoute(pullRequestBody, '/'), '/games/Minigolf')
  })

  it('ignores case and surrounding backticks', () => {
    assert.equal(readPreviewRoute('preview ROUTE: `/tools/Rig`', '/'), '/tools/Rig')
  })

  it('keeps query strings and hashes', () => {
    assert.equal(readPreviewRoute('Preview route: /a?b=1#c', '/'), '/a?b=1#c')
  })

  it('falls back when the route is not a plain absolute path', () => {
    assert.equal(readPreviewRoute('Preview route: https://evil.example', '/'), '/')
    assert.equal(readPreviewRoute('Preview route: /a/../../etc', '/'), '/')
    assert.equal(readPreviewRoute('Preview route: /a;rm', '/'), '/')
  })

  it('falls back on an empty body', () => {
    assert.equal(readPreviewRoute('', '/home'), '/home')
  })
})

describe('readPreviewClicks', () => {
  it('returns no clicks when the body has no click line', () => {
    assert.deepEqual(readPreviewClicks('Preview route: /issues'), [])
  })

  it('reads every click line in body order, without backticks', () => {
    const pullRequestBody = 'Preview route: /issues\nPreview click: `[aria-label="Unfold Closed"]`\npreview CLICK: text=Merged\n'
    assert.deepEqual(readPreviewClicks(pullRequestBody), ['[aria-label="Unfold Closed"]', 'text=Merged'])
  })

  it('keeps at most five clicks and drops overlong selectors', () => {
    const clickLines = Array.from({ length: 7 }, (_, clickIndex) => `Preview click: #step-${clickIndex}`)
    const pullRequestBody = [`Preview click: ${'a'.repeat(201)}`, ...clickLines].join('\n')
    assert.deepEqual(readPreviewClicks(pullRequestBody), ['#step-0', '#step-1', '#step-2', '#step-3', '#step-4'])
  })
})

describe('readPreviewShow', () => {
  it('returns null when the body has no show line', () => {
    assert.equal(readPreviewShow('Preview click: #a'), null)
  })

  it('reads the selector without backticks', () => {
    assert.equal(readPreviewShow('Preview show: `[aria-label="Fold Closed"]`'), '[aria-label="Fold Closed"]')
  })

  it('drops an overlong selector', () => {
    assert.equal(readPreviewShow(`Preview show: ${'a'.repeat(201)}`), null)
  })
})

describe('isSafeRoute', () => {
  it('accepts nested paths', () => {
    assert.equal(isSafeRoute('/experiments/ComplexAnimation'), true)
  })

  it('rejects relative paths', () => {
    assert.equal(isSafeRoute('games'), false)
  })
})

describe('buildPreviewUrl', () => {
  it('joins without doubling slashes', () => {
    assert.equal(buildPreviewUrl('http://localhost:5317/', '/games/Minigolf'), 'http://localhost:5317/games/Minigolf')
  })

  it('adds a missing leading slash', () => {
    assert.equal(buildPreviewUrl('http://localhost:5317', 'games'), 'http://localhost:5317/games')
  })
})
