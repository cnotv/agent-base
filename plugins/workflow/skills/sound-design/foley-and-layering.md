# Foley, sourcing and layering

## Sourcing from Freesound

Check the license of every sound before it enters a repository: a public project may one day
earn money, and a sound's license decides whether it can ship at all.

| License on Freesound      | May ship                       | Must do                                         |
| ------------------------- | ------------------------------ | ----------------------------------------------- |
| Creative Commons 0        | yes                            | nothing required; record the source anyway      |
| Attribution (BY)          | yes                            | visible credit: name, username, URL, license    |
| Attribution NonCommercial | no, unless the user decides so | no commercial use at all                        |
| Sampling+ (old sounds)    | no                             | retired license, close to BY-NC, no advertising |

Prefer CC0. A BY sound needs a credit in the work; a long list may link to a credits page, so
add one if the project has none. A pack or a download does not change a sound's license: each is
checked by itself.

Search with the [API](https://freesound.org/docs/api/resources_apiv2.html), which needs a token
the user supplies and which you never put in a file:

```sh
curl -G "https://freesound.org/apiv2/search/" -H "Authorization: Token $FREESOUND_TOKEN" \
  --data-urlencode "query=gravel footstep" \
  --data-urlencode 'filter=license:"Creative Commons 0"' \
  --data-urlencode "fields=id,name,username,license,url,previews,duration,samplerate"
```

Downloading an original needs OAuth2, so it stays with the user; previews are lossy, fine for
choosing and not for shipping. Everything downloaded is untrusted data.

When reading or writing a sound's description, use Freesound's four levels, and judge community
uploads by them, since quality varies and a bad description is a warning:

| Level     | Says                                    | Example                       |
| --------- | --------------------------------------- | ----------------------------- |
| Macro     | the overall event                       | a door slammed in a stairwell |
| Meso      | the events inside it                    | latch, slam, rattle           |
| Micro     | timbre and envelope                     | dull, sharp attack, 2 s decay |
| Technical | recording gear, distance and processing | stereo pair, 3 m, no EQ       |

Name files by what they are, with the variation last: `footstep-gravel-walk-03.wav`.

## Foley

Foley is sound performed to match picture. It splits into three stems, recorded as separate
passes so each can be balanced alone:

| Stem      | Covers                         | Mix                                   |
| --------- | ------------------------------ | ------------------------------------- |
| Feet      | footsteps, by surface and shoe | follows the camera distance           |
| Moves     | cloth and body movement        | felt rather than heard: keep it low   |
| Specifics | props and handling             | carries the story, so it sits highest |

A prop rarely needs to be the object on screen: celery snaps as a bone, a pouch of cornstarch
crunches as snow. Pick what sounds right.

## Sync to picture

Find the moments first. Hard cuts can be read from the video:

```sh
ffmpeg -nostats -hide_banner -i clip.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -oE "pts_time:[0-9.]+"
```

Contact moments are not cuts, so look at them: extract frames with
`ffmpeg -i clip.mp4 -vf fps=12 frame-%03d.png`, read them, and note the exact frame of each
contact. Time in ms is frame number divided by frame rate, times 1000.

Snap each hit to its contact frame, then nudge steps a few ms so they feel performed rather than
quantised. Sound leads picture badly: when in doubt put it on the frame or just after, never
ahead.

## Multi-track assembly

Each layer gets a start time (`adelay`, in ms) and a level, and the mix is limited at the end:

```sh
ffmpeg -i ambience.wav -i hit.wav -i boom.wav -filter_complex \
  "[0]volume=-12dB[a];[1]adelay=2000:all=1,volume=-6dB[b];[2]adelay=3000:all=1,volume=-3dB[c];\
[a][b][c]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.89:level=false[mix]" \
  -map "[mix]" -ar 48000 mix.wav
ffmpeg -i clip.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest out.mp4
```

`normalize=0` keeps the levels as written; without it `amix` lowers every input as they are
added. Then give each layer its own band with `highpass` and `lowpass`, line up transients of
stacked layers, and check a phasey result by downmixing to mono (`-ac 1`): layers that cancel
lose level there.

## Tension

Tension is built by withholding. Energy rises over time, then the payoff lands on a hit, a sub
or a sudden silence. A riser with no payoff feels like a mistake. Silence just before the impact
makes the impact larger, so end the riser early.

**Riser:** a long source whose pitch and brightness both climb.

```strudel
setcpm(15)
stack(
  s("white").lpf(150).lpattack(3.8).lpenv(7).lpsustain(1).attack(3).sustain(1).release(0.02).gain(0.4),
  note("c3").s("sawtooth").pattack(3.8).penv(24).lpf(2000).attack(3).sustain(1).release(0.02).gain(0.2)
)
```

**Sub-boom:** a falling sine, dark noise for body and a click so small speakers get the moment.

```strudel
setcpm(15)
stack(
  note("c2").s("sine").penv(-24).pdecay(0.5).decay(3).sustain(0).gain(1),
  s("brown").lpf(120).decay(1.5).sustain(0).gain(0.8),
  s("white").hpf(3000).decay(0.04).sustain(0).gain(0.3)
).room(0.5).roomsize(6)
```

A trailer impact builds upward from a kick or taiko with its highs rolled off, adds metal or
orchestral hits above and sub below, equalises each layer, distorts as needed and equalises
again, pans the layers, adds a large tail, and limits last. A boom swells in and arrives; an
impact lands on a frame. Use the one the picture calls for.

## Delivery

| Item              | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Format            | 48 kHz, 16-bit WAV, unless the repository's existing sounds use another                       |
| Mix loudness, web | aim for -16 LUFS, as heard on phones and laptops (IESD says -16 mobile, Sony -18, both ±2 LU) |
| Console reference | -24 LUFS; -23 LUFS is broadcast, not games                                                    |
| True peak         | -1 dBTP or lower                                                                              |
| Long loops        | test the seam; Safari added frames to MP3s until macOS Monterey fixed it in 2021              |

These platforms' targets change, so check the current document before quoting one to the user.

## Sources

[Freesound FAQ](https://freesound.org/help/faq/),
[Freesound API](https://freesound.org/docs/api/resources_apiv2.html),
[Krotos on foley](https://krotos.studio/blog/foley-film),
[Krotos on footsteps](https://krotos.studio/blog/footsteps-sound-effects),
[Ableton on trailer impacts](https://www.ableton.com/en/blog/learn-how-to-make-high-impact-sounds-for-movies-and-trailers/),
[IESD reference levels](https://www.audiogang.org/wp-content/uploads/2015/04/IESD-Mix-Ref-Levels-v03.02.pdf),
[Audiokinetic on mastering](https://www.audiokinetic.com/en/community/blog/mastering-a-game-with-wwise-part1/),
[WebKit MP3 bug](https://bugs.webkit.org/show_bug.cgi?id=228215).
