import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const skillsFolder = join(import.meta.dirname, 'skills')

const skillNames = readdirSync(skillsFolder, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const frontmatterOf = (skillName: string): string =>
  readFileSync(join(skillsFolder, skillName, 'SKILL.md'), 'utf8').split('---')[1] ?? ''

describe('workflow skills', () => {
  skillNames.forEach((skillName) => {
    it(`${skillName} declares its own name`, () => {
      assert.match(frontmatterOf(skillName), new RegExp(`^name: ${skillName}$`, 'm'))
    })

    // The description is the whole routing mechanism: one that says what the skill does
    // instead of when to reach for it is never selected, and repositories that carry these
    // skills enforce the same check.
    it(`${skillName} has a trigger-shaped description`, () => {
      assert.match(frontmatterOf(skillName), /\buse (when|after|before)\b/i)
    })
  })
})
