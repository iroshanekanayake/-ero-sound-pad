# ERO SOUND PAD — Audio Engine Upgrade v1.2

## Upload instructions
Extract this ZIP and upload/replace every file in this package at the ROOT of the existing GitHub repository `iroshanekanayake/ero-sound-pad`.
Do not upload the ZIP itself. Keep GitHub Pages on `main` / `/(root)` with HTTPS enabled.

Files:
- index.html
- app.js
- audio-engine.js
- sample-store.js
- style.css
- service-worker.js
- manifest.json
- icon-192.png
- icon-512.png

## Included in this upgrade

### WAV sample library
- Import WAV files using the phone's file picker.
- Store imported WAV data in IndexedDB on this device.
- Browse imported samples, preview, and delete.
- Samples remain local to this browser/app installation on this device.
- No cloud upload or automatic backup is performed.

### Per-pad dual sample layers
- Each of the 8 pads has Layer A and Layer B.
- Assign a selected WAV to either layer.
- Play A and B together, or switch between A and B using MIDI/touch velocity.
- Configure velocity split threshold (1–127).

### Per-layer sound controls
- Pitch: -24 to +24 semitones.
- Volume: 0–150%.
- Pan: Left / Centre / Right.
- Settings persist in localStorage on this device.

### MIDI input
- Request Web MIDI access.
- Choose a MIDI input device (or all inputs).
- Choose Omni or MIDI channel 1–16.
- MIDI Learn per pad.
- Save note mapping locally.
- Velocity curves: Linear, Soft, Hard.
- Live MIDI note/channel/velocity monitor.

### Audio engine
- Web Audio sample playback using AudioBufferSourceNode.
- Polyphonic playback with a 48-voice safety ceiling.
- Master volume and Stop All.
- Demo synthesized sounds remain as fallback when no WAV is assigned.

### PWA
- Landscape orientation request.
- Updated Service Worker cache includes all new JavaScript modules.

## Important device/browser notes
- Use the installed PWA or HTTPS GitHub Pages URL.
- Audio starts after a user interaction due to browser autoplay rules.
- Web MIDI support depends on the Android browser/device and may not be available in every Android Chrome configuration. The app reports this if unsupported.
- WAV samples are stored in browser IndexedDB. Clearing site data, uninstalling the app, or browser storage eviction can remove local samples. Export/backup is not part of this upgrade.
- This upgrade imports WAV files. Other audio formats are not guaranteed.
- Kits still show the existing names; full separate preset kit libraries and kit export/import are future work.
- This is the first Audio Engine upgrade. Choke groups, reverse, sample start/end, envelopes, EQ/reverb, and kit backup are not included yet.

## Recommended test
1. Open the installed ERO PAD app.
2. Open Menu → WAV Sample Library.
3. Import a WAV file.
4. Select a pad and Layer A, then assign the sample.
5. Close settings and tap that pad.
6. Assign a second WAV to Layer B and test A+B / velocity switch.
7. Connect a MIDI controller if supported, test MIDI Learn and velocity monitor.


## v1.3 Kit Manager and bulk WAV import

- Select multiple WAV files at once from the phone file picker.
- Each WAV is stored in the local IndexedDB sample library.
- Save the current eight-pad setup as a named kit.
- Kits include MIDI note mapping, velocity curve/channel, both A/B sample layers,
  layer mode, velocity split, pitch, volume, and pan.
- Load and delete saved kits.
- Deleting a kit does not delete its WAV samples.
- Existing v1.2 sample storage is preserved; IndexedDB is upgraded from version 1 to 2.

\n## v1.4 bulk import fix and visual pad editor\n\n- Bulk WAV import validates RIFF/WAVE headers as well as file names and MIME types, improving compatibility with Android file providers.\n- Import errors are shown in the sample status area.\n- Added an eight-pad visual selector to the Pad Sample Assignment & Editor section. Tap Pad 1–8 to switch the editing controls to that pad.\n- The existing pad selector dropdown remains as a secondary selection method.\n
\n## v1.5 cache refresh fix\n\n- Corrected the Service Worker cache version to `ero-sound-pad-v1.5.0` (the prior package had retained the old cache name).\n- The new Service Worker removes older ERO SOUND PAD caches and takes control after installation.\n- Registration requests an update with `updateViaCache: none` so deployed JavaScript and the eight-pad visual selector are refreshed.\n- The eight-pad selector is included in the Pad Sample Assignment & Editor section; tap a pad to edit it.\n

## v1.6 custom kit display, independent layer volumes, MIDI note diagnosis

- Main screen Previous/Next now browses saved custom kits and loads their full eight-pad configurations.
- Saving a kit refreshes the main kit display to the saved kit name.
- Added separate Layer A and Layer B volume sliders; both values are stored with each pad and therefore with each kit.
- Unmapped MIDI notes are identified in the MIDI monitor to help diagnose controller note-number mismatches (use MIDI Learn for Pad 5 if the controller sends a different note).
- Service worker cache bumped to v1.6.0.

\n## v1.7 Full-screen settings and focused pad editor\n\n- Settings opens as a full-screen landscape workspace, separate from the playing display.\n- The Pad Editor has a prominent eight-pad selector. Selecting Pad 1–8 updates the same editor controls for that pad.\n- The editor heading identifies the currently selected pad.\n- Existing Play Screen, audio engine, MIDI mapping, sample storage, kit manager and Layer A/B controls are retained.\n- Service Worker cache version bumped to v1.7.0 to ensure the new interface is fetched.\n