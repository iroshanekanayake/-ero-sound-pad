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
