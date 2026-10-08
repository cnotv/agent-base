import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const reporterPath = join(import.meta.dirname, 'report-status.sh')

// A curl stand-in that writes the headers it was given, one per line, and nothing else.
const fakeCurlScript = `#!/bin/sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--header" ]; then printf '%s\\n' "$2" >> "$CAPTURED_HEADERS"; shift; fi
  shift
done
cat > /dev/null
`

const reportedHeaders = (provider: string, environment: Record<string, string>): Map<string, string> => {
  const workFolder = mkdtempSync(join(tmpdir(), 'report-status-'))
  const capturedHeadersPath = join(workFolder, 'headers.txt')
  writeFileSync(join(workFolder, 'curl'), fakeCurlScript)
  chmodSync(join(workFolder, 'curl'), 0o755)
  writeFileSync(capturedHeadersPath, '')
  spawnSync('sh', [reporterPath, provider], {
    input: '{"session_id":"s1","hook_event_name":"Stop"}',
    env: {
      PATH: `${workFolder}:/usr/bin:/bin`,
      DASHI_URL: 'https://dash.example.com',
      DASHI_TOKEN: 'dashi_ingest_example',
      CAPTURED_HEADERS: capturedHeadersPath,
      ...environment,
    },
  })
  return new Map(
    readFileSync(capturedHeadersPath, 'utf8')
      .split('\n')
      .filter((line) => line.includes(':'))
      .map((line) => [line.slice(0, line.indexOf(':')).toLowerCase(), line.slice(line.indexOf(':') + 1).trim()]),
  )
}

describe('report-status.sh', () => {
  it('reports how the session was launched and the app that launched it', () => {
    const headers = reportedHeaders('claude', {
      CLAUDE_CODE_ENTRYPOINT: 'sdk-ts',
      TERM_PROGRAM: 'iTerm.app',
      __CFBundleIdentifier: 'com.example.CodePilot',
      DASHI_START_ID: '0123abcd-0000-4000-8000-000000000000',
    })
    assert.equal(headers.get('x-agent-launcher'), 'sdk-ts')
    assert.equal(headers.get('x-agent-terminal'), 'iTerm.app')
    assert.equal(headers.get('x-agent-app'), 'com.example.CodePilot')
    assert.equal(headers.get('x-dashi-start-id'), '0123abcd-0000-4000-8000-000000000000')
  })

  it('names the cloud session it runs in, and nothing outside the cloud', () => {
    assert.equal(reportedHeaders('claude', { CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_01ABCdef' }).get('x-agent-cloud-session'), 'cse_01ABCdef')
    assert.equal(reportedHeaders('claude', {}).get('x-agent-cloud-session'), '')
  })

  it('names what pays for the session without ever sending a key', () => {
    const apiKeyHeaders = reportedHeaders('claude', {
      ANTHROPIC_API_KEY: 'sk-ant-secret-value',
      ANTHROPIC_BASE_URL: 'https://openrouter.ai/api/v1',
    })
    assert.equal(apiKeyHeaders.get('x-agent-billing'), 'api-key')
    assert.equal(apiKeyHeaders.get('x-agent-api-host'), 'openrouter.ai')
    assert.ok(![...apiKeyHeaders.values()].some((value) => value.includes('sk-ant-secret-value')))
    assert.equal(reportedHeaders('claude', { CLAUDE_CODE_USE_BEDROCK: '1' }).get('x-agent-billing'), 'bedrock')
    assert.equal(reportedHeaders('claude', {}).get('x-agent-billing'), 'claude-login')
    assert.equal(reportedHeaders('codex', { OPENAI_API_KEY: 'sk-secret' }).get('x-agent-billing'), 'api-key')
    assert.equal(reportedHeaders('codex', {}).get('x-agent-billing'), 'chatgpt-login')
  })

  it('keeps a value on one line, so it cannot add a header of its own', () => {
    const headers = reportedHeaders('claude', { TERM_PROGRAM: 'vscode\r\nX-Injected: yes' })
    assert.equal(headers.get('x-agent-terminal'), 'vscodeX-Injected: yes')
    assert.equal(headers.has('x-injected'), false)
  })
})
