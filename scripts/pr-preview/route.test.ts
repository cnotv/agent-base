import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildPreviewUrl, isSafeRoute, readPreviewRoute } from './route.ts'

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
