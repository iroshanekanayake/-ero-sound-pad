/* ERO SOUND PAD - application controller */
(() => {
  "use strict";

  const padNames = ["KICK","SNARE","CLOSED HAT","OPEN HAT","LOW TOM","MID TOM","CRASH","RIDE"];
  const defaultNotes = [36,38,42,46,45,47,49,51];
  const $ = id => document.getElementById(id);
  const STORE_KEY = "ERO_SOUND_PAD_ENGINE_CONFIG_V1";
  let midiAccess = null;
  let learnPad = null;
  let selectedMidiInput = "";
  let samples = [];
  let selectedSampleId = "";
  let selectedPad = 0;
  let selectedLayer = "A";
  let kits = [];
  let selectedKitId = "";
  let mainKitIndex = 0;

  const config = {
    notes: defaultNotes.slice(),
    channel: 0,
    velocityCurve: "linear",
    pads: padNames.map(() => ({
      layerMode: "both",
      velocitySplit: 90,
      layers: {
        A: { sampleId: "", pitch: 0, volume: 100, pan: 0 },
        B: { sampleId: "", pitch: 0, volume: 100, pan: 0 }
      }
    }))
  };

  function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function saveConfig() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(config)); }
    catch (error) { toast("Could not save settings on this device"); }
  }

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!saved) return;
      if (Array.isArray(saved.notes) && saved.notes.length === 8) config.notes = saved.notes;
      if (saved.channel !== undefined) config.channel = Number(saved.channel) || 0;
      if (saved.velocityCurve) config.velocityCurve = saved.velocityCurve;
      if (Array.isArray(saved.pads)) {
        saved.pads.slice(0, 8).forEach((p, i) => {
          if (!p) return;
          config.pads[i].layerMode = p.layerMode === "velocity" ? "velocity" : "both";
          config.pads[i].velocitySplit = Number(p.velocitySplit) || 90;
          ["A","B"].forEach(layer => {
            if (p.layers && p.layers[layer]) {
              config.pads[i].layers[layer] = {
                sampleId: p.layers[layer].sampleId || "",
                pitch: Number(p.layers[layer].pitch) || 0,
                volume: Number(p.layers[layer].volume ?? 100),
                pan: Number(p.layers[layer].pan) || 0
              };
            }
          });
        });
      }
    } catch (error) { console.warn("Saved pad settings could not be read", error); }
  }

  function velocityValue(raw) {
    const v = Math.max(1, Math.min(127, Number(raw) || 1)) / 127;
    if (config.velocityCurve === "soft") return Math.sqrt(v) * 127;
    if (config.velocityCurve === "hard") return v * v * 127;
    return v * 127;
  }

  function flashPad(index) {
    const el = document.querySelector('[data-pad="' + index + '"]');
    if (!el) return;
    el.classList.add("active");
    clearTimeout(el._flashTimer);
    el._flashTimer = setTimeout(() => el.classList.remove("active"), 105);
  }

  async function hit(index, velocity = 100) {
    try {
      await window.EROAudioEngine.triggerPad(index, velocityValue(velocity), config.pads[index]);
      flashPad(index);
    } catch (error) {
      console.error(error);
      toast(error.message || "Audio could not start");
    }
  }

  function renderMapping() {
    $("mapping").innerHTML = padNames.map((name, i) =>
      `<div class="mapping-row">
        <b>${String(i + 1).padStart(2,"0")} · ${name}</b>
        <span>MIDI NOTE ${config.notes[i]}</span>
        <button class="learn ${learnPad === i ? "wait" : ""}" data-learn="${i}">
          ${learnPad === i ? "WAITING…" : "MIDI LEARN"}
        </button>
      </div>`
    ).join("");
    document.querySelectorAll("[data-learn]").forEach(button => {
      button.addEventListener("click", () => {
        learnPad = Number(button.dataset.learn);
        renderMapping();
        toast("Play the controller pad for " + padNames[learnPad]);
      });
    });
  }

  function renderMidiInputs() {
    const select = $("midiDevice");
    if (!select) return;
    const old = selectedMidiInput;
    select.innerHTML = "";
    if (!midiAccess || midiAccess.inputs.size === 0) {
      select.add(new Option("No MIDI input found", ""));
      selectedMidiInput = "";
      return;
    }
    select.add(new Option("All MIDI Inputs", "*"));
    midiAccess.inputs.forEach(input => {
      select.add(new Option(input.name || input.id, input.id));
    });
    select.value = Array.from(select.options).some(o => o.value === old) ? old : "*";
    selectedMidiInput = select.value;
    attachMidiHandlers();
  }

  function attachMidiHandlers() {
    if (!midiAccess) return;
    midiAccess.inputs.forEach(input => {
      input.onmidimessage = event => {
        if (selectedMidiInput && selectedMidiInput !== "*" && input.id !== selectedMidiInput) return;
        const status = event.data[0];
        const command = status & 0xF0;
        const channel = (status & 0x0F) + 1;
        const note = event.data[1];
        const velocity = event.data[2] || 0;
        if (command !== 0x90 || velocity === 0) return;
        if (Number(config.channel) !== 0 && channel !== Number(config.channel)) return;

        $("midiMonitor").textContent =
          `CH ${channel} · NOTE ${note} · VELOCITY ${velocity}`;
        if (learnPad !== null) {
          config.notes[learnPad] = note;
          toast(`${padNames[learnPad]} mapped to MIDI note ${note}`);
          learnPad = null;
          saveConfig();
          renderMapping();
          return;
        }
        const padIndex = config.notes.indexOf(note);
        if (padIndex !== -1) {
          hit(padIndex, velocity);
        } else {
          $("midiMonitor").textContent = `CH ${channel} · NOTE ${note} · VELOCITY ${velocity} · UNMAPPED`;
        }
      };
    });
  }

  async function connectMidi() {
    try { await window.EROAudioEngine.unlock(); } catch (error) { toast(error.message); }
    if (!navigator.requestMIDIAccess) {
      toast("Web MIDI is not supported by this browser. Try a supported desktop browser or Android MIDI-compatible app.");
      return;
    }
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      midiAccess.onstatechange = () => {
        renderMidiInputs();
        updateMidiStatus();
      };
      renderMidiInputs();
      updateMidiStatus();
      toast(midiAccess.inputs.size ? "MIDI input access granted" : "MIDI ready — connect your controller");
    } catch (error) {
      toast("MIDI permission failed: " + error.message);
    }
  }

  function updateMidiStatus() {
    const count = midiAccess ? midiAccess.inputs.size : 0;
    $("connection").textContent = count ? count + " MIDI INPUT(S) READY" : "MIDI NOT CONNECTED";
    $("dot").classList.toggle("on", count > 0);
    $("midiTag").textContent = count ? count + " INPUT(S) FOUND" : "NO DEVICE";
  }

  function getSampleFolders() {
    try { return JSON.parse(localStorage.getItem("eroSoundPadFolders") || "[]"); }
    catch (_) { return []; }
  }

  function refreshFolderPicker() {
    const picker = $("sampleFolder");
    if (!picker) return;
    const current = picker.value || "All";
    const names = [...new Set([...getSampleFolders(), ...samples.map(s => s.folder).filter(Boolean), ...(samples.some(s => !s.folder) ? ["Unfiled"] : [])])].sort((a,b) => a.localeCompare(b));
    picker.innerHTML = "";
    picker.add(new Option("All Folders", "All"));
    names.forEach(name => picker.add(new Option(name, name)));
    picker.value = names.includes(current) ? current : "All";
  }

  async function refreshSamples() {
    samples = await window.EROSampleStore.all();
    samples.sort((a,b) => a.name.localeCompare(b.name));
    refreshFolderPicker();
    const select = $("sampleLibrary");
    const old = selectedSampleId;
    const folder = $("sampleFolder") ? $("sampleFolder").value : "All";
    const visible = folder === "All" ? samples : samples.filter(sample => (sample.folder || "Unfiled") === folder);
    select.innerHTML = "";
    if (!visible.length) {
      select.add(new Option("No samples in this folder", ""));
      selectedSampleId = "";
    } else {
      visible.forEach(sample => select.add(new Option(sample.name, sample.id)));
      selectedSampleId = visible.some(s => s.id === old) ? old : visible[0].id;
      select.value = selectedSampleId;
    }
    renderAssignments();
  }

  function renderPadPicker() {
    const host = $("padPicker");
    if (!host) return;
    host.innerHTML = padNames.map((name, index) => {
      const active = index === selectedPad ? " selected" : "";
      const assigned = config.pads[index].layers.A.sampleId || config.pads[index].layers.B.sampleId;
      return `<button type="button" class="pad-pick${active}" data-edit-pad="${index}">
        <span class="pad-pick-number">${String(index + 1).padStart(2, "0")}</span>
        <strong>${name}</strong>
        <small>${assigned ? "SAMPLE ASSIGNED" : "EMPTY PAD"}</small>
      </button>`;
    }).join("");
    host.querySelectorAll("[data-edit-pad]").forEach(button => {
      button.addEventListener("click", () => {
        selectedPad = Number(button.dataset.editPad);
        $("editPad").value = String(selectedPad);
        renderPadPicker();
        renderAssignments();
        const title = $("padEditorTitle");
        if (title) title.textContent = `PAD ${String(selectedPad + 1).padStart(2,"0")} · ${padNames[selectedPad]} EDITOR`;
        const controls = $("editLayer");
        if (controls) controls.focus({ preventScroll: true });
      });
    });
  }

  function currentLayerConfig() {
    return config.pads[selectedPad].layers[selectedLayer];
  }

  function renderAssignments() {
    const pad = config.pads[selectedPad];
    const getName = id => {
      const sample = samples.find(s => s.id === id);
      return sample ? sample.name : (id ? "Missing sample" : "Not assigned");
    };
    $("assignedSamples").textContent =
      `PAD ${selectedPad + 1} · ${padNames[selectedPad]}\n` +
      `Layer A: ${getName(pad.layers.A.sampleId)}\n` +
      `Layer B: ${getName(pad.layers.B.sampleId)}`;
    $("layerMode").value = pad.layerMode;
    $("velocitySplit").value = pad.velocitySplit;
    $("velocitySplitValue").textContent = pad.velocitySplit;
    const layer = currentLayerConfig();
    $("samplePitch").value = layer.pitch;
    $("samplePitchValue").textContent = layer.pitch + " semitones";
    $("sampleVolumeA").value = pad.layers.A.volume;
    $("sampleVolumeAValue").textContent = pad.layers.A.volume + "%";
    $("sampleVolumeB").value = pad.layers.B.volume;
    $("sampleVolumeBValue").textContent = pad.layers.B.volume + "%";
    $("samplePan").value = layer.pan;
    $("samplePanValue").textContent = layer.pan === 0 ? "Center" : (layer.pan < 0 ? "Left " : "Right ") + Math.abs(layer.pan);
  }

  function saveEditorValues() {
    const pad = config.pads[selectedPad];
    pad.layerMode = $("layerMode").value;
    pad.velocitySplit = Number($("velocitySplit").value);
    const layer = currentLayerConfig();
    layer.pitch = Number($("samplePitch").value);
    pad.layers.A.volume = Number($("sampleVolumeA").value);
    pad.layers.B.volume = Number($("sampleVolumeB").value);
    layer.pan = Number($("samplePan").value);
    saveConfig();
    renderAssignments();
  }

  async function importWav(file) {
    if (!file) return;
    if (!/\.wav$/i.test(file.name) && !["audio/wav","audio/x-wav","audio/wave"].includes(file.type)) {
      toast("Please choose a WAV audio file");
      $("sampleUpload").value = "";
      return;
    }
    try {
      const data = await file.arrayBuffer();
      const id = (crypto.randomUUID ? crypto.randomUUID() : "s" + Date.now() + Math.random().toString(16).slice(2));
      await window.EROSampleStore.put({
        id,
        name: file.name,
        type: file.type || "audio/wav",
        size: file.size,
        addedAt: Date.now(),
        folder: $("sampleFolder")?.value && $("sampleFolder").value !== "All" ? $("sampleFolder").value : "Unfiled",
        data
      });
      await refreshSamples();
      selectedSampleId = id;
      $("sampleLibrary").value = id;
      $("sampleStatus").textContent = `Saved ${file.name} (${(file.size / 1024).toFixed(1)} KB) on this device.`;
      toast("WAV imported and saved");
    } catch (error) {
      console.error(error);
      toast("Could not save WAV. Check available phone storage.");
    }
    $("sampleUpload").value = "";
  }

  async function isWavFile(file) {
    const nameLooksWav = /\.wav$/i.test(file.name || "");
    const mimeLooksWav = /^(audio\/(wav|x-wav|wave|vnd\.wave)|application\/octet-stream)$/i.test(file.type || "");
    if (nameLooksWav || mimeLooksWav) {
      const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const riff = head.length >= 12 &&
        String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...head.slice(8, 12)) === "WAVE";
      return riff || nameLooksWav || /^(audio\/(wav|x-wav|wave|vnd\.wave))$/i.test(file.type || "");
    }
    // Android file providers sometimes omit both the extension and MIME type.
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    return head.length >= 12 &&
      String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...head.slice(8, 12)) === "WAVE";
  }

  async function importMultipleWavs(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const checks = await Promise.all(files.map(async file => ({ file, valid: await isWavFile(file) })));
    const valid = checks.filter(item => item.valid).map(item => item.file);
    const rejected = files.length - valid.length;
    if (!valid.length) {
      toast("Select WAV files only");
      $("sampleUploadMultiple").value = "";
      return;
    }

    let imported = 0;
    const importedIds = [];
    try {
      for (const file of valid) {
        const data = await file.arrayBuffer();
        const id = (crypto.randomUUID ? crypto.randomUUID() :
          "s" + Date.now() + Math.random().toString(16).slice(2));
        await window.EROSampleStore.put({
          id,
          name: file.name,
          type: file.type || "audio/wav",
          size: file.size,
          addedAt: Date.now(),
          folder: $("sampleFolder")?.value && $("sampleFolder").value !== "All" ? $("sampleFolder").value : "Unfiled",
          data
        });
        importedIds.push(id);
        imported++;
        $("sampleStatus").textContent = `Importing ${imported} / ${valid.length}: ${file.name}`;
      }
      await refreshSamples();
      if (importedIds.length) {
        selectedSampleId = importedIds[0];
        $("sampleLibrary").value = selectedSampleId;
        $("sampleStatus").textContent =
          `${imported} WAV samples imported into ${$("sampleFolder").value === "All" ? "Unfiled" : $("sampleFolder").value}.` +
          (rejected ? ` ${rejected} non-WAV file(s) skipped.` : "");
      }
      toast(`${imported} WAV sample(s) imported`);
    } catch (error) {
      console.error(error);
      $("sampleStatus").textContent = `Import error: ${error && error.message ? error.message : "Unknown storage error"}. Imported ${imported} file(s).`;
      toast(`Import stopped after ${imported} file(s).`);
      await refreshSamples();
    }
    $("sampleUploadMultiple").value = "";
  }

  async function refreshKits() {
    kits = await window.EROSampleStore.allKits();
    kits.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    const select = $("savedKits");
    const old = selectedKitId;
    select.innerHTML = "";
    if (!kits.length) {
      select.add(new Option("No saved kits yet", ""));
      selectedKitId = "";
    } else {
      kits.forEach(kit => select.add(new Option(kit.name, kit.id)));
      selectedKitId = kits.some(kit => kit.id === old) ? old : kits[0].id;
      select.value = selectedKitId;
    }
    const count = kits.length;
    $("kitLibraryStatus").textContent = count
      ? `${count} saved kit${count === 1 ? "" : "s"} on this device.`
      : "Save your current eight-pad setup as a named kit.";
    if (count) {
      const idx = kits.findIndex(kit => kit.id === selectedKitId);
      mainKitIndex = idx >= 0 ? idx : 0;
      $("kitName").textContent = kits[mainKitIndex].name;
    } else {
      $("kitName").textContent = "STUDIO";
      mainKitIndex = 0;
    }
  }

  async function saveCurrentKit() {
    const name = $("kitNameInput").value.trim();
    if (!name) {
      toast("Enter a name for this kit first");
      $("kitNameInput").focus();
      return;
    }
    try {
      const now = Date.now();
      const existing = kits.find(kit => kit.name.toLowerCase() === name.toLowerCase());
      const kit = {
        id: existing ? existing.id : (crypto.randomUUID ? crypto.randomUUID() : "k" + now + Math.random().toString(16).slice(2)),
        name,
        notes: config.notes.slice(),
        channel: config.channel,
        velocityCurve: config.velocityCurve,
        pads: JSON.parse(JSON.stringify(config.pads)),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now
      };
      await window.EROSampleStore.putKit(kit);
      selectedKitId = kit.id;
      await refreshKits();
      $("savedKits").value = kit.id;
      toast(`Kit "${name}" saved`);
    } catch (error) {
      console.error(error);
      toast("Could not save kit on this device");
    }
  }

  async function applyKitRecord(kit) {
    if (!kit) return toast("Saved kit was not found");
    if (Array.isArray(kit.notes) && kit.notes.length === 8) config.notes = kit.notes.slice();
    if (Array.isArray(kit.pads) && kit.pads.length === 8) {
      config.pads = kit.pads.map(pad => ({
        layerMode: pad.layerMode === "velocity" ? "velocity" : "both",
        velocitySplit: Number(pad.velocitySplit) || 90,
        layers: {
          A: { sampleId: pad.layers?.A?.sampleId || "", pitch: Number(pad.layers?.A?.pitch) || 0, volume: Number(pad.layers?.A?.volume ?? 100), pan: Number(pad.layers?.A?.pan) || 0 },
          B: { sampleId: pad.layers?.B?.sampleId || "", pitch: Number(pad.layers?.B?.pitch) || 0, volume: Number(pad.layers?.B?.volume ?? 100), pan: Number(pad.layers?.B?.pan) || 0 }
        }
      }));
    }
    config.channel = Number(kit.channel) || 0;
    config.velocityCurve = kit.velocityCurve || "linear";
    selectedKitId = kit.id;
    $("savedKits").value = kit.id;
    $("kitNameInput").value = kit.name;
    $("kitName").textContent = kit.name;
    $("midiChannel").value = String(config.channel);
    $("velocityCurve").value = config.velocityCurve;
    saveConfig();
    renderMapping();
    renderAssignments();
    renderPadPicker();
    if ($("padEditorTitle")) $("padEditorTitle").textContent = `PAD 01 · ${padNames[0]} EDITOR`;
    toast(`Kit "${kit.name}" loaded`);
  }

  async function loadSelectedKit() {
    if (!selectedKitId) return toast("Select a saved kit first");
    try {
      const kit = await window.EROSampleStore.getKit(selectedKitId);
      await applyKitRecord(kit);
    } catch (error) {
      console.error(error);
      toast("Could not load this kit");
    }
  }

  async function navigateSavedKit(direction) {
    if (!kits.length) {
      toast("Save a custom kit first");
      return;
    }
    mainKitIndex = (mainKitIndex + direction + kits.length) % kits.length;
    try {
      const kit = await window.EROSampleStore.getKit(kits[mainKitIndex].id);
      await applyKitRecord(kit);
    } catch (error) {
      console.error(error);
      toast("Could not switch kit");
    }
  }

  async function deleteSelectedKit() {
    if (!selectedKitId) return toast("Select a saved kit first");
    const kit = kits.find(item => item.id === selectedKitId);
    if (!kit) return;
    if (!window.confirm(`Delete kit "${kit.name}"? The WAV samples will remain in the sample library.`)) return;
    try {
      await window.EROSampleStore.removeKit(selectedKitId);
      selectedKitId = "";
      await refreshKits();
      $("kitNameInput").value = "";
      toast("Kit deleted. Original WAV samples were kept.");
    } catch (error) {
      console.error(error);
      toast("Could not delete kit");
    }
  }

  async function deleteSelectedSample() {
    if (!selectedSampleId) return toast("Select a sample first");
    const id = selectedSampleId;
    await window.EROSampleStore.remove(id);
    config.pads.forEach(pad => ["A","B"].forEach(layer => {
      if (pad.layers[layer].sampleId === id) pad.layers[layer].sampleId = "";
    }));
    saveConfig();
    await refreshSamples();
    $("sampleStatus").textContent = "Sample deleted from this device.";
    toast("Sample deleted");
  }

  async function assignSelectedSample() {
    if (!selectedSampleId) return toast("Import or select a WAV sample first");
    const record = await window.EROSampleStore.get(selectedSampleId);
    if (!record) return toast("Selected sample was not found");
    config.pads[selectedPad].layers[selectedLayer].sampleId = selectedSampleId;
    saveConfig();
    renderAssignments();
    renderPadPicker();
    toast(`Assigned ${record.name} to ${padNames[selectedPad]} Layer ${selectedLayer}`);
  }

  function initEvents() {
    document.querySelectorAll("[data-pad]").forEach(button => {
      button.addEventListener("pointerdown", event => {
        event.preventDefault();
        hit(Number(button.dataset.pad), 100);
      });
    });

    $("midi").addEventListener("click", connectMidi);
    $("midiDevice").addEventListener("change", event => {
      selectedMidiInput = event.target.value;
      attachMidiHandlers();
    });
    $("midiChannel").value = String(config.channel);
    $("midiChannel").addEventListener("change", event => {
      config.channel = Number(event.target.value);
      saveConfig();
    });
    $("velocityCurve").value = config.velocityCurve;
    $("velocityCurve").addEventListener("change", event => {
      config.velocityCurve = event.target.value;
      saveConfig();
    });

    $("volume").addEventListener("input", event => {
      const value = Number(event.target.value);
      $("volumeText").textContent = value + "%";
      window.EROAudioEngine.setMasterVolume(value / 100);
    });
    window.EROAudioEngine.setMasterVolume(Number($("volume").value) / 100);
    $("stop").addEventListener("click", () => {
      window.EROAudioEngine.stopAll();
      toast("All voices stopped");
    });

    $("sampleUpload").addEventListener("change", event => importWav(event.target.files[0]));
    $("sampleUploadMultiple").addEventListener("change", event => importMultipleWavs(event.target.files));
    $("sampleFolder").addEventListener("change", () => refreshSamples());
    $("createSampleFolder").addEventListener("click", async () => {
      const field = $("newSampleFolder");
      const name = (field.value || "").trim().replace(/[\\/:*?"<>|]/g, "-");
      if (!name) return toast("Enter a folder name first");
      const folders = getSampleFolders();
      if (!folders.some(folder => folder.toLowerCase() === name.toLowerCase())) folders.push(name);
      localStorage.setItem("eroSoundPadFolders", JSON.stringify(folders));
      await refreshFolderPicker();
      $("sampleFolder").value = name;
      field.value = "";
      await refreshSamples();
      toast("Folder created: " + name);
    });
    $("sampleLibrary").addEventListener("change", event => {
      selectedSampleId = event.target.value;
      const sample = samples.find(s => s.id === selectedSampleId);
      $("sampleStatus").textContent = sample ? `${sample.name} · ${(sample.size/1024).toFixed(1)} KB` : "No sample selected.";
    });
    $("previewSample").addEventListener("click", async () => {
      if (!selectedSampleId) return toast("Select a sample first");
      try { await window.EROAudioEngine.preview(selectedSampleId); }
      catch (error) { toast("Preview failed: " + error.message); }
    });
    $("deleteSample").addEventListener("click", deleteSelectedSample);
    $("editPad").addEventListener("change", event => {
      selectedPad = Number(event.target.value);
      renderPadPicker();
      renderAssignments();
      const title = $("padEditorTitle");
      if (title) title.textContent = `PAD ${String(selectedPad + 1).padStart(2,"0")} · ${padNames[selectedPad]} EDITOR`;
    });
    $("editLayer").addEventListener("change", event => {
      selectedLayer = event.target.value;
      renderAssignments();
    });
    $("assignSample").addEventListener("click", assignSelectedSample);
    $("savePadSettings").addEventListener("click", () => {
      saveEditorValues();
      toast("Pad settings saved");
    });

    const ranges = [
      ["velocitySplit","velocitySplitValue",v=>String(v)],
      ["samplePitch","samplePitchValue",v=>v+" semitones"],
      ["sampleVolumeA","sampleVolumeAValue",v=>v+"%"],
      ["sampleVolumeB","sampleVolumeBValue",v=>v+"%"],
      ["samplePan","samplePanValue",v=>v==0?"Center":(v<0?"Left ":"Right ")+Math.abs(v)]
    ];
    ranges.forEach(([input,output,format]) => {
      $(input).addEventListener("input", () => {
        $(output).textContent = format(Number($(input).value));
      });
      $(input).addEventListener("change", saveEditorValues);
    });
    $("layerMode").addEventListener("change", saveEditorValues);

    $("saveKit").addEventListener("click", saveCurrentKit);
    $("savedKits").addEventListener("change", event => { selectedKitId = event.target.value; });
    $("loadKit").addEventListener("click", loadSelectedKit);
    $("deleteKit").addEventListener("click", deleteSelectedKit);
  }

  function initMenuAndKit() {
    const menuPanel = $("menuPanel");
    $("menuButton").addEventListener("click", () => {
      menuPanel.classList.add("open");
      menuPanel.scrollTop = 0;
    });
    $("closeMenu").addEventListener("click", () => menuPanel.classList.remove("open"));

    const builtInKits = [
      { value: "studio", name: "STUDIO" },
      { value: "electronic", name: "ELECTRONIC" },
      { value: "world", name: "WORLD" },
      { value: "sri-lankan", name: "SRI LANKAN" }
    ];
    const kitSelect = $("kit");
    $("previousKit").addEventListener("click", () => navigateSavedKit(-1));
    $("nextKit").addEventListener("click", () => navigateSavedKit(1));
    kitSelect.addEventListener("change", event => {
      const selected = builtInKits.find(item => item.value === event.target.value);
      if (selected && !kits.length) $("kitName").textContent = selected.name;
    });

    const designDefaults = {
      padColor:"#19385e", borderColor:"#8fc5ff", glow:55, radius:"10px", background:"dark"
    };
    const controls = {
      padColor:$("designPadColor"), borderColor:$("designBorderColor"),
      glow:$("designGlow"), radius:$("designRadius"), background:$("designBackground")
    };
    function applyDesign(settings) {
      const root = document.documentElement;
      root.style.setProperty("--pad-top", settings.padColor);
      root.style.setProperty("--pad-border", settings.borderColor);
      root.style.setProperty("--pad-glow", String(Number(settings.glow)/100));
      root.style.setProperty("--pad-radius", settings.radius);
      const backgrounds = {dark:"#070b13",blue:"#07182b",black:"#000000",forest:"#071b16"};
      root.style.setProperty("--panel-bg", backgrounds[settings.background] || backgrounds.dark);
      Object.keys(controls).forEach(key => controls[key].value = settings[key]);
      $("designGlowValue").textContent = settings.glow + "%";
    }
    try {
      const saved = JSON.parse(localStorage.getItem("ERO_SOUND_PAD_DESIGN_V1") || "null");
      applyDesign(saved ? {...designDefaults,...saved} : designDefaults);
    } catch (_) { applyDesign(designDefaults); }

    function saveDesign() {
      const settings = {
        padColor:controls.padColor.value,
        borderColor:controls.borderColor.value,
        glow:Number(controls.glow.value),
        radius:controls.radius.value,
        background:controls.background.value
      };
      applyDesign(settings);
      try { localStorage.setItem("ERO_SOUND_PAD_DESIGN_V1",JSON.stringify(settings)); } catch (_) {}
    }
    Object.values(controls).forEach(control => {
      control.addEventListener("input", saveDesign);
      control.addEventListener("change", saveDesign);
    });
    $("resetDesign").addEventListener("click", () => {
      applyDesign(designDefaults);
      try { localStorage.removeItem("ERO_SOUND_PAD_DESIGN_V1"); } catch (_) {}
    });
  }

  async function init() {
    loadConfig();
    initEvents();
    initMenuAndKit();
    renderMapping();
    renderAssignments();
    renderPadPicker();
    try {
      await refreshSamples();
      await refreshKits();
    } catch (error) {
      $("sampleStatus").textContent = "Local sample storage is unavailable in this browser.";
      $("kitLibraryStatus").textContent = "Local kit storage is unavailable in this browser.";
    }
    updateMidiStatus();
    document.addEventListener("pointerdown", () => {
      if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
    }, { once: true });
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" });
          registration.update().catch(() => {});
        } catch (error) {
          console.warn("Service Worker:", error);
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();