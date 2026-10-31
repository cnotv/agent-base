# Editing a recording

Agents edit with `ffmpeg`, which is scriptable and silent, and every filter chain below was run
on a test recording and measured. Audacity is the same work by hand, for a person. Keep the
original file: every `ffmpeg` step writes a new one.

## Destructive or not

| Change                                 | Audacity 3.x           | Audacity 4               | `ffmpeg` |
| -------------------------------------- | ---------------------- | ------------------------ | -------- |
| Fade by drawing a volume curve         | non-destructive        | non-destructive          | new file |
| Trim a clip                            | handles keep the audio | handles keep the audio   | new file |
| Applied effect (Fade, Noise Reduction) | destructive            | check the version's docs | new file |

Destructive means the samples are rewritten, so a later change of mind needs the original. Work
out the order before processing, and export a copy after each step that was hard to get right.

## Order of operations

Cut first, hum second, noise third, level last. Each step works better on the output of the one
before: the Audacity manual puts a notch for hum before Noise Reduction, and its support pages
put a gate after it, so reduction can stay gentler. Normalising before cleaning raises the noise
too.

## Waveform work

| Job                                | Filter                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Trim to the attack                 | `silenceremove=start_periods=1:start_threshold=-40dB:start_silence=0.002`                 |
| Fade in without losing the attack  | `afade=t=in:d=0.005`                                                                      |
| Trim the tail and fade it out      | `areverse,silenceremove=start_periods=1:start_threshold=-40dB,afade=t=in:d=0.05,areverse` |
| Reverse                            | `areverse`                                                                                |
| Cut a range                        | `atrim=start=0.5:end=1.2,asetpts=PTS-STARTPTS`                                            |
| Set a known loudness (over 400 ms) | `loudnorm=I=-16:TP=-1:LRA=11`                                                             |
| Set a level on a short sound       | `volume=-3dB`, reading the peak first                                                     |

Chain filters with commas: `ffmpeg -i in.wav -af "first,second" out.wav`.

A transient is the part to protect. Fades on a hit stay around 5 ms; a longer one rounds off the
attack and the sound loses its punch. Control the transient and the tail apart: a short `afade`
at the start, a long one at the end.

## Finding and removing noise

First look: spectrogram, or Audacity's Plot Spectrum. Hum is a steady horizontal line at the
mains frequency (50 Hz in Germany, 60 Hz in the US) with harmonics above it; hiss is a wide
even band; a whistle is one high line.

| Problem   | `ffmpeg`                             | Audacity                                                       |
| --------- | ------------------------------------ | -------------------------------------------------------------- |
| Rumble    | `highpass=f=70`                      | High-Pass Filter                                               |
| Hum       | `bandreject=f=50:w=6`, one per spike | Notch Filter at each spike from Plot Spectrum                  |
| Hiss      | `afftdn=nr=20:nf=<floor in dB>`      | Noise Reduction: Get Noise Profile on noise alone, then Reduce |
| One event | cut it, or layer over it             | Spectral Delete on a selection drawn in the spectrogram view   |

Measured on a voice with 50 Hz hum, its 150 Hz harmonic and pink hiss, the floor went from -12.7
to -46.5 dB after `highpass=f=70,bandreject=f=50:w=6,bandreject=f=150:w=6`, then to -65.6 dB with
`afftdn=nr=20:nf=-30`, while the voice held at -19 dB. Read the floor from a quiet stretch and
pass it as `nf`. `afftdn`'s `sn` command for sampling a noise profile had no effect in the same
test.

Use the fewest notches that work: each adds a little ringing. A notch also removes any music at
that frequency.

Audacity's Noise Reduction defaults are 6 dB, sensitivity 6, smoothing 6 bands. Use the lowest
values that work. Too low a sensitivity leaves "musical noise": random tinkling tones, meaning
the noise was underestimated. Tick Residue to hear what would be removed: any recognisable voice
there means it is taking too much. The noise profile does not survive closing the app.

## Redesigning a recording

Pitch and speed down for size, then break up what makes it human.

| Character | Chain                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monster   | `asetrate=48000*0.6,aresample=48000,lowpass=f=2500,aecho=0.8:0.6:40:0.4,alimiter=limit=0.8`                                                                  |
| Robot     | `afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:win_func=hann:overlap=0.75,tremolo=f=30:d=0.6,acrusher=bits=8:mode=log:mix=0.5` |

`asetrate` slows pitch and time together, like a tape; set its first number to the file's real
sample rate. `afftfilt` as written removes the phase, leaving the flat buzz of a vocoder.

## Sources

[Noise Reduction](https://manual.audacityteam.org/man/noise_reduction.html),
[Notch Filter](https://manual.audacityteam.org/man/notch_filter.html),
[Spectral Selection](https://manual.audacityteam.org/man/spectral_selection.html),
[Audacity 4 clips](https://www.audacityteam.org/manual/clips),
[ffmpeg filters](https://ffmpeg.org/ffmpeg-filters.html).
