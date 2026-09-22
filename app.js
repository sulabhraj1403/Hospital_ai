// Major Hospital AI Video Creator
// Local medical templates + Pollinations images + browser-side FFmpeg.
// No AI API is used for script generation.

const $ = id => document.getElementById(id);
let stopped = false;
let scenes = [];
let musicInfo = null;
let encodingTimer = null;

$("settingsBtn").onclick = () => $("settings").classList.remove("hidden");
$("closeSettings").onclick = () => $("settings").classList.add("hidden");
$("saveSettings").onclick = () => {
  localStorage.hospitalText = $("hospitalText").value;
  $("settings").classList.add("hidden");
};
$("hospitalText").value = localStorage.hospitalText || "Major Hospital • Dhaka, East Champaran";

function setOverall(p) {
  p = Math.max(0, Math.min(100, Number(p) || 0));
  $("bar").style.width = p + "%";
  $("overallPercent").textContent = Math.round(p) + "%";
}

function setEncoding(p) {
  p = Math.max(0, Math.min(100, Number(p) || 0));
  $("encodingBar").style.width = p + "%";
  $("encodingPercent").textContent = Math.round(p) + "%";
}

function status(t, p = null) {
  $("status").textContent = t;
  if (p !== null) setOverall(p);
}

function dataUrl(mime, b64) {
  return `data:${mime};base64,${b64}`;
}

async function jsonPost(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  });

  const text = await r.text();
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(text || `Server returned HTTP ${r.status}`);
  }

  if (!r.ok) throw new Error(j.error || "Server error");
  return j;
}

async function getMusic(topic) {
  const q = encodeURIComponent(`instrumental music ${topic}`);
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

  try {
    const j = await fetch(api).then(r => r.json());
    const pages = Object.values(j.query?.pages || {});
    const audio = pages.find(p => /\.(mp3|ogg|oga|wav)$/i.test(p.imageinfo?.[0]?.url || ""));
    if (!audio) return null;

    const ii = audio.imageinfo[0];
    const md = ii.extmetadata || {};

    return {
      url: ii.url,
      title: md.ObjectName?.value || audio.title,
      artist: md.Artist?.value || "",
      license: md.LicenseShortName?.value || "See source",
      source: "https://commons.wikimedia.org/wiki/" +
        encodeURIComponent(audio.title.replace(/^File:/, "File:"))
    };
  } catch {
    return null;
  }
}

async function blobFromUrl(url) {
  const r = await fetch(url);
  if (!r.ok) throw Error("Music download failed");
  return await r.blob();
}

function makeEndCard() {
  const hospital = "Major Hospital";
  const doctor = "Major (Dr.) Ratish Kumar";
  const specialty = "Orthopaedic Surgeon";
  const location = "Dhaka, East Champaran, Bihar";

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="#f7f9fc"/>
    <rect x="70" y="180" width="940" height="1560" rx="48" fill="#ffffff" stroke="#d8e0ec" stroke-width="5"/>
    <circle cx="540" cy="480" r="115" fill="#1769e0"/>
    <path d="M500 480h80M540 440v80" stroke="#fff" stroke-width="28" stroke-linecap="round"/>
    <text x="540" y="760" text-anchor="middle" font-family="Arial,sans-serif" font-size="82" font-weight="700" fill="#172033">${hospital}</text>
    <text x="540" y="850" text-anchor="middle" font-family="Arial,sans-serif" font-size="43" font-weight="600" fill="#1769e0">${doctor}</text>
    <text x="540" y="925" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" fill="#39465a">${specialty}</text>
    <line x1="250" y1="1010" x2="830" y2="1010" stroke="#d8e0ec" stroke-width="4"/>
    <text x="540" y="1095" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" fill="#596579">${location}</text>
    <text x="540" y="1370" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="600" fill="#172033">Orthopaedic Care &amp; Medical Awareness</text>
    <text x="540" y="1450" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" fill="#697386">Consult a qualified doctor for personal medical advice.</text>
  </svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function startEncodingProgress() {
  if (encodingTimer) clearInterval(encodingTimer);

  let p = 0;
  setEncoding(0);

  encodingTimer = setInterval(() => {
    // FFmpeg.wasm progress is not reliable for this image-concat workflow,
    // so show a smooth estimated progress indicator while ff.exec() runs.
    p = Math.min(95, p + (p < 70 ? 2 : 1));
    setEncoding(p);
  }, 500);
}

function finishEncodingProgress(success = true) {
  if (encodingTimer) {
    clearInterval(encodingTimer);
    encodingTimer = null;
  }
  setEncoding(success ? 100 : 0);
}

async function makeVideo(images, seconds, captions, musicBlob) {
  const FFmpegNS = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js");
  const FFmpegUtilNS = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js");

  const {FFmpeg} = FFmpegNS;
  const {fetchFile, toBlobURL} = FFmpegUtilNS;
  const ff = new FFmpeg();

  const coreBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
  const [coreURL, wasmURL] = await Promise.all([
    toBlobURL(`${coreBase}/ffmpeg-core.js`, "text/javascript"),
    toBlobURL(`${coreBase}/ffmpeg-core.wasm`, "application/wasm")
  ]);

  await ff.load({
    coreURL,
    wasmURL,
    classWorkerURL: `${window.location.origin}/static/ffmpeg/worker.js`
  });

  // Convert every image to a real 720x1280 PNG before FFmpeg.
  for (let i = 0; i < images.length; i++) {
    if (stopped) throw Error("Stopped");

    const img = new Image();
    img.src = images[i];
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error(`Could not load scene ${i + 1}`));
    });

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 720, 1280);

    const scale = Math.max(720 / img.naturalWidth, 1280 / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, (720 - w) / 2, (1280 - h) / 2, w, h);

    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    await ff.writeFile(`img${i}.png`, await fetchFile(pngBlob));

    setOverall(65 + Math.round((i + 1) / images.length * 14));
  }

  const args = [];

  for (let i = 0; i < images.length; i++) {
    args.push("-loop", "1", "-t", String(seconds), "-i", `img${i}.png`);
  }

  if (musicBlob) {
    await ff.writeFile("music", await fetchFile(musicBlob));
    args.push("-stream_loop", "-1", "-i", "music");
  }

  args.push(
    "-filter_complex",
    `concat=n=${images.length}:v=1:a=0,format=yuv420p[v]`
  );

  if (musicBlob) {
    args.push(
      "-map", "[v]",
      "-map", `${images.length}:a:0`,
      "-shortest"
    );
  } else {
    args.push("-map", "[v]");
  }

  args.push(
    "-r", "24",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "video.mp4"
  );

  startEncodingProgress();
  let code;

  try {
    code = await ff.exec(args);
  } catch (e) {
    finishEncodingProgress(false);
    throw e;
  }

  finishEncodingProgress(code === 0);

  if (code !== 0) {
    throw new Error(`FFmpeg failed while creating the MP4 (code ${code}).`);
  }

  setOverall(98);
  status("Finalizing MP4…", 98);

  const data = await ff.readFile("video.mp4");
  return new Blob([data.buffer], {type: "video/mp4"});
}

$("stop").onclick = () => {
  stopped = true;
  status("Stopping…");
};

$("generate").onclick = async () => {
  stopped = false;
  musicInfo = null;
  setOverall(0);
  setEncoding(0);

  $("generate").disabled = true;
  $("stop").classList.remove("hidden");
  $("resultCard").classList.add("hidden");
  $("scenesCard").classList.add("hidden");
  $("scenes").innerHTML = "";

  try {
    const topic = $("topic").value;
    if (!topic) throw Error("Select a medical template first.");

    const count = +$("sceneCount").value;
    const seconds = +$("seconds").value;
    const language = "English";

    if (typeof window.buildLocalMedicalPlan !== "function") {
      throw new Error("Local medical script engine did not load. Refresh the page.");
    }

    status("Building script from medical templates…", 3);

    const plan = window.buildLocalMedicalPlan(topic, language, count);
    scenes = plan.scenes || [];

    $("scenesCard").classList.remove("hidden");

    for (let i = 0; i < scenes.length; i++) {
      if (stopped) throw Error("Stopped");

      status(
        `Generating scene ${i + 1} of ${scenes.length}…`,
        5 + Math.round(i / scenes.length * 55)
      );

      const r = await jsonPost("/api/image", {
        prompt: scenes[i].visualPrompt || scenes[i].imagePrompt
      });

      scenes[i].image = dataUrl(r.mimeType, r.imageBase64);

      const div = document.createElement("div");
      div.className = "scene";
      div.innerHTML =
        `<img src="${scenes[i].image}">` +
        `<div><h3>${i + 1}. ${esc(scenes[i].title)}</h3>` +
        `<p>${esc(scenes[i].caption || "")}</p></div>`;

      $("scenes").appendChild(div);
    }

    scenes.push({
      title: "Major Hospital — End Card",
      caption: "Major Hospital • Major (Dr.) Ratish Kumar • Orthopaedic Surgeon",
      image: makeEndCard()
    });

    const endDiv = document.createElement("div");
    endDiv.className = "scene";
    endDiv.innerHTML =
      `<img src="${scenes[scenes.length - 1].image}">` +
      `<div><h3>${scenes.length}. Major Hospital — End Card</h3>` +
      `<p>Major Hospital • Major (Dr.) Ratish Kumar • Orthopaedic Surgeon</p></div>`;

    $("scenes").appendChild(endDiv);

    let mb = null;

    if ($("music").checked) {
      status("Finding suitable background music…", 62);
      musicInfo = await getMusic(topic);

      if (musicInfo) {
        try {
          mb = await blobFromUrl(musicInfo.url);
        } catch {
          mb = null;
        }
      }
    }

    status("Preparing MP4 encoder…", 80);
    setEncoding(0);

    const blob = await makeVideo(
      scenes.map(x => x.image),
      seconds,
      $("captions").checked,
      mb
    );

    const url = URL.createObjectURL(blob);
    $("preview").src = url;
    $("download").href = url;
    $("download").download = "major-hospital-video.mp4";

    $("credits").innerHTML = musicInfo
      ? `Music: ${esc(strip(musicInfo.title))}${musicInfo.artist ? " — " + strip(musicInfo.artist) : ""}. License: ${esc(musicInfo.license)}. <a href="${musicInfo.source}" target="_blank" rel="noopener">Source</a>`
      : "No music track was found; video created without background music.";

    $("resultCard").classList.remove("hidden");
    setEncoding(100);
    status("Video ready.", 100);

  } catch (e) {
    if (encodingTimer) {
      clearInterval(encodingTimer);
      encodingTimer = null;
    }
    status(e.message || "Something went wrong.");
    alert(e.message || "Something went wrong.");
  } finally {
    $("generate").disabled = false;
    $("stop").classList.add("hidden");
  }
};

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, "");
}
