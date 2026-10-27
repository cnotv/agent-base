---
name: music-sound
description: >-
  Use when asked to make music, a melody, a beat, a loop, a jingle or a sound effect, or to
  save a pattern as a WAV or MIDI file. Covers writing it as a Strudel pattern, choosing
  between WAV and MIDI, rendering it with the repository's exporter, and checking the file
  without listening to it.
---

# Music and sound

Write every sound as a Strudel pattern. It is text, so it can be reviewed, diffed, edited and
rendered again, which a recorded file cannot.

## 1. Write the pattern

| Need            | Strudel                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| Tempo           | `setcpm(bpm / 4)`: one cycle is one bar of four beats                        |
| Layers          | `stack(drums, bass, chords)`                                                 |
| Drums           | `s("bd*4, [~ sd]*2, hh*8")`                                                  |
| Melody in a key | `n("0 2 4 7").scale("C:minor").s("triangle")`                                |
| Change per bar  | `note("<c3 eb3 g3 bb2>")`: one value per cycle, in turn                      |
| Shape a note    | `.decay(0.1).sustain(0)`, `.lpf(800)`, `.room(0.3)`, `.penv(12).pdecay(0.1)` |

A sound effect is one cycle: speed the cycle up to the effect's length (`setcpm(240)` makes a
cycle a quarter of a second) and render one cycle. A pitch envelope (`penv`, `pdecay`) gives
jumps and lasers their sweep; short `decay` with `sustain(0)` gives clicks and coins their snap.

Use only the sounds the repository's exporter has loaded; its local skill or Project facts says
which. An unknown sample fails the render with `sound ... not found`.

## 2. Choose the format

| Pick | When the file is                                                         |
| ---- | ------------------------------------------------------------------------ |
| WAV  | played as it is: a sound effect, a loop, background music                |
| MIDI | notes to edit or play elsewhere: a DAW, a synth, a game that reads notes |

MIDI holds notes and timing only: effects, samples without a pitch and the synth's tone are
lost. Asked for "a sound" with no further use, render WAV.

## 3. Render it

Use the exporter that Project facts (**Sound export**) or a local skill names. With none,
render nothing: give the user the pattern and a `https://strudel.cc/#<base64 of the code>`
link, and say no file was made.

**Never play audio aloud while working.** The user may be wearing headphones. Run browsers
headless with `--mute-audio`, render offline, and never press Play in a visible browser.

## 4. Check the file without listening

Read the file back: a WAV's length and its peak level (well above zero where it should sound,
below 1.0 where it should not clip); a MIDI file's tempo, track count and note count per track.
A silent or clipped WAV, or a MIDI file with an empty track, goes back to step 1.
