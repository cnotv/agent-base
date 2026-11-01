---
name: sound-design
description: >-
  Use when deciding what a sound should be made of rather than only rendering it: a game sound
  effect, UI sound, impact, whoosh, riser, sub-boom, foley or atmosphere, or when a sound reads
  wrong (thin, hollow, muddy, harsh, laggy, clicking, too quiet, an engine or a vacuum cleaner).
  Also when cleaning or editing a recording, removing hum or background noise, using Audacity,
  sourcing from Freesound or checking its licenses, syncing audio to video, layering tracks, or
  when asked to teach synthesis, audio editing or sound design.
---

# Sound design

You cannot hear what you make, so a sound is designed from its anatomy and judged by
measurement. `music-sound` covers writing a pattern, choosing a format and rendering it; this
skill covers what a sound should be made of and how to tell whether it worked. Follow the steps
in order.

| Need                                                                  | Read                    |
| --------------------------------------------------------------------- | ----------------------- |
| Oscillators, filters, envelopes, methods, tested Strudel recipes      | `synthesis.md`          |
| Cutting, fading, hum and noise removal, redesigning a recording       | `editing.md`            |
| Freesound licenses, foley, sync to picture, risers, multi-track mix   | `foley-and-layering.md` |
| Teaching someone: the three phases, nine weeks and practical projects | `curriculum.md`         |

## 1. Write the brief

One line each: what physically happens, how big it is, how far away, and what it must not sound
like. The "must not" list prevents more mistakes than the rest: record what each rejected
version sounded like, in the repository's docs home, so the next attempt can be judged against
it.

## 2. Split it into layers

Most sounds that read as one thing are several, each with one job and its own frequency band:

| Layer     | When            | Band                 | Job              | Usual source                                  |
| --------- | --------------- | -------------------- | ---------------- | --------------------------------------------- |
| Transient | first 5-50 ms   | presence, air        | that it happened | noise burst through `hpf`, very short `decay` |
| Body      | to about 300 ms | mid                  | what it is       | sample, filtered oscillator, FM               |
| Weight    | with the body   | sub, bass            | how big it is    | sine with falling pitch: `penv`, `pdecay`     |
| Tail      | after the body  | follows the distance | where it happens | `room`, or filtered noise with a long `decay` |

Not every sound needs all four: a UI tick is a transient and a tiny body. Put them in a `stack()`
with every layer starting on the same instant.

Sub and bass barely reproduce on laptop and phone speakers, so on anything heard there the layer
above 250 Hz has to identify the sound by itself.

## 3. Build it, then measure it

Render with `music-sound`, or edit with `editing.md`, then, with `ffmpeg` installed:

```sh
bash <this skill's directory>/measure-sound.sh <file.wav>
ffmpeg -v error -y -i <file.wav> -lavfi "showspectrumpic=s=800x300:legend=0:scale=log:fscale=log" <file.png>
```

Read the PNG: time runs left to right, frequency upward. A sweep is a slope; a flat picture means
nothing moved, whatever the pattern says.

| Reading                                   | Means                              | Fix                                   |
| ----------------------------------------- | ---------------------------------- | ------------------------------------- |
| lead silence over 5 ms on a hit           | the action feels laggy             | trim to the attack                    |
| last sample far from 0 on a one-shot      | click at the end                   | fade out, or a longer `decay`         |
| first and last sample differ on a loop    | click at every repeat              | fade or crossfade the seam            |
| true peak above -1 dBFS                   | may clip after encoding            | lower the gain                        |
| mid over 30 dB below the loudest band     | vanishes on small speakers         | add a body or a transient layer       |
| one band far above the rest, nothing else | a plain tone: hollow or whining    | add a contrasting layer               |
| loudness -70 LUFS with a healthy peak     | under 400 ms: too short to measure | judge it by peak and bands            |
| loudness far below the sounds beside it   | lost in the mix, or a pattern bug  | check the spectrogram before the gain |

Compare with a sound in the repository that already works before trusting a number alone.
Loudness targets apply to the finished mix, not to each file: see
`foley-and-layering.md`.

## 4. Vary anything that repeats

A sound triggered often needs 3-5 variations plus small pitch and volume randomisation at
playback; a rare one needs only one. Make the variations as separate renders with changed
values, not as copies of one file.

## Common mistakes

| Mistake                                                         | Instead                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A sweep with `.lpf(saw.range(...))` on one long note            | Strudel reads a signal once per event, so it stays frozen; use `lpenv` (see `synthesis.md`)      |
| Fixing that with `.segment()` on the argument                   | still frozen: the sound owns the structure, so segment the sound or use an envelope              |
| `gain` from a signal on one long note, leaving it nearly silent | same cause; shape it with `attack`, `decay`, `release`                                           |
| A long pure low sine for weight                                 | reads as a hollow drum: keep it short and add a body                                             |
| Reverb on something dry and close                               | a tail says where a thing is, so it moves the sound into a cave                                  |
| Raising the gain until a thin sound is loud                     | add the missing band instead                                                                     |
| Reporting that a sound "sounds good"                            | you did not hear it: report the measurements, and ask the user to listen before calling it final |
| Pressing Play to check it                                       | never: nothing may play aloud, and the render and the measurements are silent                    |
