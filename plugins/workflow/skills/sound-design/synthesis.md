# Synthesis

Every recipe here was rendered offline in Strudel 1.2 and checked by measurement and spectrogram.
The `.strudel` blocks are complete patterns, and each one starts with `setcpm`, so the note length
is known: `setcpm(30)` makes one note two seconds long, `setcpm(15)` four. They use sounds
strudel.cc preloads (`pad`, `wt_digital`), so an exporter without those fails with `sound ... not
found`: swap in one it has.

## The building blocks

| Block           | What it does                                              | In Strudel                                              |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| Oscillator      | the raw tone; its shape sets which harmonics exist        | `s("sine")`, `triangle`, `square`, `sawtooth`           |
| Noise           | every frequency at once                                   | `s("white")`, `pink`, `brown`, `crackle` + `density`    |
| Filter          | removes frequencies                                       | `lpf`, `hpf`, `bpf`, with resonance `lpq`, `hpq`, `bpq` |
| Amp envelope    | loudness over one note                                    | `attack`, `decay`, `sustain`, `release`                 |
| Filter envelope | cutoff over one note; `lpenv` is octaves above the cutoff | `lpenv`, `lpattack`, `lpdecay`, `lpsustain`             |
| Pitch envelope  | pitch over one note, in semitones                         | `penv`, `pattack`, `pdecay`                             |
| LFO             | slow repeating movement                                   | `vib`, `vibmod`, `tremolo`, `tremolodepth`, `phaser`    |
| Saturation      | adds harmonics, so a sound survives small speakers        | `shape`, `distort`, `crush`, `coarse`                   |
| Space           | distance and size                                         | `room`, `roomsize`, `delay`, `delayfeedback`            |

Harmonics by waveform: sine has none, triangle few and soft, square only odd ones and sounds
hollow, sawtooth all of them and sounds bright. Bright sources give a filter something to remove,
so subtractive sounds start from sawtooth or noise.

Envelope shapes to think in: percussive is near-zero attack with `sustain(0)`; plucked adds a
short filter envelope; held has a real `sustain`; a pad has an attack and a release both over a
second.

**A signal is sampled once per event.** On one long note, `.lpf(saw.range(200, 8000))` stays at
200 for the whole note, and moving `.segment(64)` onto that argument changes nothing, because
`s("white")` still owns the structure. Use an envelope, or segment the sound itself:
`s("white").segment(64).lpf(...)`, with a short `attack` and `release` so the 64 retriggers do
not buzz. The envelope is cleaner and also keeps a chord from retriggering.

## Choosing a method

| Method      | Good for                                      | In Strudel                                    |
| ----------- | --------------------------------------------- | --------------------------------------------- |
| Subtractive | bass, leads, pads, most things; the default   | bright source plus filter and envelope        |
| Additive    | organs, bells, exact harmonic control         | `s("user").partials([...])`                   |
| FM          | bells, metal, glass, electric piano, grit     | `fm` (index), `fmh` (ratio), `fmdecay`        |
| Wavetable   | a timbre that evolves within one note         | `s("wt_digital")` plus `wtattack`, `wtenv`    |
| Granular    | texture, smears and clouds from a real sample | `chop`, `striate`, `rev`, `loopAt` on samples |

An FM ratio (`fmh`) that is a whole number stays harmonic; a non-integer one sounds metallic or
bell-like. Sources describe FM as hard to predict, so make small changes and read the spectrum.

## Recipes

**Bass:** a filtered sawtooth for the attack and character, an octave-down sine for the weight.

```strudel
setcpm(30)
stack(
  note("c2").s("sawtooth").lpf(180).lpenv(4).lpattack(0.005).lpdecay(0.25).lpq(4).attack(0.005).decay(0.4).sustain(0.5).release(0.1),
  note("c1").s("sine").attack(0.005).decay(0.4).sustain(0.6).release(0.1).gain(0.7)
).shape(0.3)
```

**Lead:** two detuned saws, a filter pluck, and vibrato so a held note stays alive.

```strudel
setcpm(30)
note("c4").s("sawtooth").add(note("0,0.1")).lpf(1200).lpenv(3).lpdecay(0.2).lpq(6).attack(0.01).decay(0.1).sustain(0.7).release(0.2).vib(5.5).vibmod(0.2).room(0.2)
```

**Sci-fi pad:** a detuned chord that opens and closes slowly, with a large room.

```strudel
setcpm(15)
note("c3,g3,e4").s("sawtooth").add(note("0,0.08,-0.08")).lpf(500).lpattack(2).lpdecay(2).lpsustain(0).lpenv(1.5).attack(1).release(1.5).room(0.6).roomsize(4).gain(0.3)
```

**Bell (FM):** an inharmonic ratio whose brightness dies away faster than the note.

```strudel
setcpm(30)
note("c5").s("sine").fm(5).fmh(3.51).fmdecay(0.6).fmsustain(0).decay(1.4).sustain(0).room(0.4)
```

**Organ (additive):** each harmonic's level set by hand.

```strudel
setcpm(30)
note("c3").s("user").partials([1, 0.5, 0.33, 0, 0.2, 0, 0.14]).attack(0.01).release(0.1)
```

**Evolving tone (wavetable):** the position scans through the table during the note.

```strudel
setcpm(30)
note("c3").s("wt_digital").wt(0).wtattack(1.9).wtenv(1).lpf(4000).attack(0.01).sustain(1).release(0.05).gain(1.5)
```

**Texture (granular):** a sample cut into grains and played backwards.

```strudel
setcpm(15)
s("pad").loopAt(4).chop(32).rev().room(0.5).gain(1.5)
```

**Whoosh:** noise through a band-pass that rises and falls with the loudness. Motion past the
listener is the shape: quiet and dull, loud and bright, quiet and dull. It renders quiet, so set
the level afterwards.

```strudel
setcpm(30)
s("pink").bpf(300).bpq(0.7).bpattack(1).bpdecay(1).bpsustain(0).bpenv(3.3).attack(1).decay(1).sustain(0).gain(3)
```

**Riser** and **sub-boom** recipes are in `foley-and-layering.md`.

## Listening sources

[Ableton Learning Synths](https://learningsynths.ableton.com/) teaches oscillators, filters,
envelopes and LFOs step by step on a playable browser synth, with a free playground and recipes.
It only renders in a browser, so send a person there; there is nothing to fetch. The
[Strudel synths reference](https://strudel.cc/learn/synths/) documents FM, wavetable, noise and
additive controls.
