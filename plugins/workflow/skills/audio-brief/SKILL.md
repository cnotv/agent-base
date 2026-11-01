---
name: audio-brief
description: >-
  Use when asked to turn a vague audio request into structured parameters, or before `music-sound`
  or `sound-design` when a natural-language request needs clarification. Converts natural language
  requests into structured parameters for music and sound design workflows.
  Takes a vague request (e.g., "make a spooky cave loop, not too scary, 30 seconds, dripping water")
  and produces a one-page brief with all the technical and artistic parameters needed to compose a sound.
---

# Audio Brief

This skill converts a vague natural-language request into structured parameters that both
`music-sound` and `sound-design` can consume. It does not compose sound; it writes a brief.

## 1. Request Analysis

Identify the request type:
- Music (loop, cue, jingle, game music, ambient bed)
- Sound Design (sound effect, ambience, foley)
- Hybrid (music with sound design elements)

## 2. Extract Parameters

Pull out what the request already says:
- Kind: loop, cue, jingle, sound effect, ambience, etc.
- Job: when it plays, how long, loop, format
- Action: what the sound does (drips, pulses, rises, fades)
- References: existing sounds, tracks, styles
- Must-not: what to avoid
- Acceptance: how it should feel, energy level, mix priority

## 2.5 Verify Definitions (before filling)

Before writing any pattern, confirm the domain definitions that the brief references:
- Genre / style: search the documentation or a reference source for the genre's typical patterns, tempo ranges, harmonic vocabulary, and common instrumentation. State the source.
- Instruments / sources: check the repository's loaded samples (`strudel-sound`'s samples and banks) and confirm each instrument name exists; if an instrument is missing, propose an alternative or a synthesized equivalent.
- Patterns / forms: for loops, confirm the loop point aligns with the form; for cues, confirm a clear build/climax/resolve structure; for ambience, confirm no conflicting rhythmic elements.
- Technical limits: confirm sample rate, loudness targets, and file size constraints from Project facts or the sound-design skill.

Record the verification in the brief's `Assumptions` block: what was checked, what was found, and what was decided when information was missing.

## 3. Fill Missing Fields

If any required parameter is missing, ask a clarifying question (maximum three). The user must provide:
- Duration (or loop length)
- Format preference (WAV or MIDI)
- Energy level (calm, tense, playful, epic, melancholy)

## 4. Output

Write the brief in the fixed format below. It is a contract: once written, it is read by both
`music-sound` and `sound-design`.

```
# Brief

Kind: [music / sound-design / hybrid]
Job: [description]
Length / Loop: [duration, loop at bar X]
Tempo: [BPM] | Meter: [4/4, etc.]
Key / Mode: [C minor, D aeolian, etc.]
Form: [A-A-B-A, 8-bar bed, loop, etc.]
Action: [what the sound does]
Palette: [instruments, textures, sources]
Space: [environment, distance]
Must-not: [list of things to avoid]
Acceptance: [how it should feel, mix priority]
Assumptions: [any assumptions made]
```

## 5. Hand Off

Pass the brief to the appropriate skill:
- Music requests → `music-sound` (for rendering and export)
- Sound design requests → `sound-design` (for layering and measurement)
