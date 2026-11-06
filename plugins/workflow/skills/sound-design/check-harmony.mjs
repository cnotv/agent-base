/**
 * Checks a song's harmony without listening to it. Reads a MIDI file and lists, for every pitched
 * track, the notes that land on a beat with a pitch class the chord track is not playing in that
 * bar. Passing tones between beats are left alone, and a reported note can still be right: a blue
 * note, a third over a power chord, or a fifth the voicing leaves out. Read the list rather than
 * chase zero.
 *
 * Needs `@tonejs/midi` installed in the directory it runs from.
 *
 * Usage:
 *   node check-harmony.mjs <song.mid> <chord track>[,<chord track>] [--beats 4]
 * A track is named after the sound it plays, so give the chords a sound no other part uses.
 */
import console from "node:console";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { cwd, exit } from "node:process";
import { parseArgs } from "node:util";

const { Midi } = createRequire(`${cwd()}/`)("@tonejs/midi");

const PITCH_CLASS_NAMES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const MIDI_DRUM_CHANNEL = 9;
const BEAT_TOLERANCE = 0.02;
const EXAMPLE_LIMIT = 8;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { beats: { type: "string", default: "4" } },
});
const [midiPath, chordTrackList] = positionals;
if (!midiPath || !chordTrackList) {
  console.error(
    "Usage: node check-harmony.mjs <song.mid> <chord track>[,<chord track>]",
  );
  exit(1);
}

const midi = new Midi(readFileSync(midiPath));
const beatsPerBar = Number(values.beats);
const secondsPerBeat = 60 / midi.header.tempos[0].bpm;
const chordTrackNames = chordTrackList.split(",");

const barOf = (seconds) =>
  Math.floor(seconds / secondsPerBeat / beatsPerBar + 1e-6);
const beatOf = (seconds) => (seconds / secondsPerBeat) % beatsPerBar;
const isOnBeat = (note) =>
  Math.abs(beatOf(note.time) - Math.round(beatOf(note.time))) < BEAT_TOLERANCE;

const chordTracks = midi.tracks.filter((track) =>
  chordTrackNames.includes(track.name),
);
if (chordTracks.length === 0) {
  console.error(
    `No track named ${chordTrackList}: ${midi.tracks.map((track) => track.name).join(", ")}`,
  );
  exit(1);
}

const barsSounded = (note) => {
  const firstBar = barOf(note.time);
  const lastBar = barOf(note.time + note.duration - 1e-3);
  return Array.from(
    { length: lastBar - firstBar + 1 },
    (_, offset) => firstBar + offset,
  );
};

const chordByBar = chordTracks
  .flatMap((track) => track.notes)
  .reduce(
    (chords, note) =>
      barsSounded(note).reduce(
        (byBar, bar) =>
          byBar.set(bar, new Set([...(byBar.get(bar) ?? []), note.midi % 12])),
        chords,
      ),
    new Map(),
  );

const describe = (note) => {
  const chord = [...chordByBar.get(barOf(note.time))].map(
    (pitchClass) => PITCH_CLASS_NAMES[pitchClass],
  );
  return `bar ${barOf(note.time) + 1} beat ${Math.round(beatOf(note.time)) + 1}: ${PITCH_CLASS_NAMES[note.midi % 12]} over ${chord.join(" ")}`;
};

const clashesOf = (track) =>
  track.notes.filter(isOnBeat).filter((note) => {
    const chord = chordByBar.get(barOf(note.time));
    return chord !== undefined && !chord.has(note.midi % 12);
  });

midi.tracks
  .filter(
    (track) =>
      !chordTrackNames.includes(track.name) &&
      track.channel !== MIDI_DRUM_CHANNEL &&
      track.notes.length > 0,
  )
  .forEach((track) => {
    const clashes = clashesOf(track);
    console.log(
      `${track.name}: ${clashes.length} of ${track.notes.filter(isOnBeat).length} notes on a beat are outside the chord`,
    );
    clashes
      .slice(0, EXAMPLE_LIMIT)
      .forEach((note) => console.log(`  ${describe(note)}`));
  });
