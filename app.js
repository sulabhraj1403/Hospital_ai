// Major Hospital AI Video Creator — corrected app.js

const $ = id => document.getElementById(id);
let stopped = false, scenes = [], musicInfo = null;

function status(t, p = null) {
  const el = $("status");
  const bar = $("bar");
  if (el) el.textContent = t;
  if (bar && p !== null) bar.style.width = p + "%";
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

  const raw = await r.text();
  let j = {};
  try {
    j = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Server returned ${r.status}: ${raw.slice(0, 250)}`);
  }

  if (!r.ok) throw new Error(j.error || j.message || `Server error (${r.status})`);
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

    const ii = audio.imageinfo[0], md = ii.extmetadata || {};
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

// Create the final hospital card as a real PNG, not SVG.
// This avoids FFmpeg trying to decode an SVG as a PNG file.
function makeEndCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f7f9fc";
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d8e0ec";
  ctx.lineWidth = 5;

  const x = 70, y = 180, w = 940, h = 1560, r = 48;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1769e0";
  ctx.beginPath();
  ctx.arc(540, 480, 115, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(500, 480);
  ctx.lineTo(580, 480);
  ctx.moveTo(540, 440);
  ctx.lineTo(540, 520);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#172033";
  ctx.font = "700 82px Arial, sans-serif";
  ctx.fillText("Major Hospital", 540, 760);

  ctx.fillStyle = "#1769e0";
  ctx.font = "600 43px Arial, sans-serif";
  ctx.fillText("Major (Dr.) Ratish Kumar", 540, 850);

  ctx.fillStyle = "#39465a";
  ctx.font = "38px Arial, sans-serif";
  ctx.fillText("Orthopaedic Surgeon", 540, 925);

  ctx.strokeStyle = "#d8e0ec";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(250, 1010);
  ctx.lineTo(830, 1010);
  ctx.stroke();

  ctx.fillStyle = "#596579";
  ctx.font = "32px Arial, sans-serif";
  ctx.fillText("Dhaka, East Champaran, Bihar", 540, 1095);

  ctx.fillStyle = "#172033";
  ctx.font = "600 36px Arial, sans-serif";
  ctx.fillText("Orthopaedic Care & Medical Awareness", 540, 1370);

  ctx.fillStyle = "#697386";
  ctx.font = "30px Arial, sans-serif";
  ctx.fillText("Consult a qualified doctor for personal medical advice.", 540, 1450);

  return canvas.toDataURL("image/png");
}

async function makeVideo(images, seconds, captions, musicBlob) {
  const { FFmpeg } = window.FFmpeg;
  const { fetchFile, toBlobURL } = window.FFmpegUtil;

  if (!FFmpeg || !fetchFile || !toBlobURL) {
    throw new Error("FFmpeg library did not load. Refresh the page and try again.");
  }

  const ff = new FFmpeg();
  ff.on("progress", ({ progress }) =>
    status("Assembling MP4…", 80 + Math.round(progress * 19))
  );

  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  const [coreURL, wasmURL, workerURL] = await Promise.all([
    toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    toBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript")
  ]);

  await ff.load({
    coreURL,
    wasmURL,
    workerURL,
    classWorkerURL: "/static/ffmpeg/worker.js"
  });

  for (let i = 0; i < images.length; i++) {
    await ff.writeFile(`img${i}.png`, await fetchFile(images[i]));
  }

  const args = [];

  for (let i = 0; i < images.length; i++) {
    args.push("-loop", "1", "-t", String(seconds), "-i", `img${i}.png`);
  }

  if (musicBlob) {
    await ff.writeFile("music", await fetchFile(musicBlob));
    args.push("-stream_loop", "-1", "-i", "music");
  }

  // Normalize every image to the same 1080x1920 vertical frame before concat.
  const filters = images.map((_, i) =>
    `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,` +
    `pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}]`
  ).join(";");

  const concatInputs = images.map((_, i) => `[v${i}]`).join("");

  args.push(
    "-filter_complex",
    `${filters};${concatInputs}concat=n=${images.length}:v=1:a=0[v]`
  );

  args.push("-map", "[v]");

  if (musicBlob) {
    args.push("-map", `${images.length}:a:0`, "-shortest");
  }

  args.push(
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "video.mp4"
  );

  await ff.exec(args);

  const data = await ff.readFile("video.mp4");
  return new Blob([data.buffer], { type: "video/mp4" });
}

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

function initApp() {
  const required = [
    "settingsBtn", "closeSettings", "saveSettings", "hospitalText",
    "stop", "generate", "topic", "sceneCount", "seconds", "language",
    "scenesCard", "scenes", "resultCard", "preview", "download",
    "credits", "status", "bar", "music", "captions"
  ];

  const missing = required.filter(id => !$(id));
  if (missing.length) {
    console.error("Missing HTML elements:", missing);
    alert("App setup error. Missing: " + missing.join(", "));
    return;
  }

  $("settingsBtn").onclick = () => $("settings").classList.remove("hidden");
  $("closeSettings").onclick = () => $("settings").classList.add("hidden");
  $("saveSettings").onclick = () => {
    localStorage.hospitalText = $("hospitalText").value;
    $("settings").classList.add("hidden");
  };

  $("hospitalText").value =
    localStorage.hospitalText || "Major Hospital • Dhaka, East Champaran";

  $("stop").onclick = () => {
    stopped = true;
    status("Stopping…");
  };

  $("generate").onclick = async () => {
    stopped = false;
    $("generate").disabled = true;
    $("stop").classList.remove("hidden");
    $("resultCard").classList.add("hidden");
    $("scenesCard").classList.add("hidden");
    $("scenes").innerHTML = "";

    try {
      const topic = $("topic").value.trim();
      if (!topic) throw Error("Enter a topic first.");

      const count = +$("sceneCount").value;
      const seconds = +$("seconds").value;
      const language = $("language").value;

      status("Creating script and scene plan…", 3);

      const plan = await jsonPost("/api/script", {
        topic,
        language,
        count,
        hospital: "Major Hospital, Dhaka, East Champaran"
      });

      scenes = plan.scenes || [];
      if (!scenes.length) throw Error("No scenes were returned by the script API.");

      $("scenesCard").classList.remove("hidden");

      for (let i = 0; i < scenes.length; i++) {
        if (stopped) throw Error("Stopped");

        status(
          `Generating scene ${i + 1} of ${scenes.length}…`,
          5 + Math.round(i / scenes.length * 50)
        );

        // script.js uses visualPrompt. imagePrompt is kept as fallback.
        const prompt = scenes[i].visualPrompt || scenes[i].imagePrompt || "";

        if (!prompt.trim()) {
          throw Error(`Scene ${i + 1} has no visual prompt.`);
        }

        const r = await jsonPost("/api/image", { prompt });

        if (!r.imageBase64 || !r.mimeType) {
          throw Error(`Image API returned no image for scene ${i + 1}.`);
        }

        scenes[i].image = dataUrl(r.mimeType, r.imageBase64);

        const div = document.createElement("div");
        div.className = "scene";
        div.innerHTML =
          `<img src="${scenes[i].image}">` +
          `<div><h3>${i + 1}. ${esc(scenes[i].title)}</h3>` +
          `<p>${esc(scenes[i].caption || "")}</p></div>`;

        $("scenes").appendChild(div);
      }

      // Mandatory final hospital end card.
      const endCard = {
        title: "Major Hospital — End Card",
        caption: "Major Hospital • Major (Dr.) Ratish Kumar • Orthopaedic Surgeon",
        image: makeEndCard()
      };

      scenes.push(endCard);

      const endDiv = document.createElement("div");
      endDiv.className = "scene";
      endDiv.innerHTML =
        `<img src="${endCard.image}">` +
        `<div><h3>${scenes.length}. Major Hospital — End Card</h3>` +
        `<p>${esc(endCard.caption)}</p></div>`;

      $("scenes").appendChild(endDiv);

      let mb = null;
      musicInfo = null;

      if ($("music").checked) {
        status("Finding suitable background music…", 63);
        musicInfo = await getMusic(topic);

        if (musicInfo) {
          try {
            mb = await blobFromUrl(musicInfo.url);
          } catch {
            mb = null;
          }
        }
      }

      status("Building vertical MP4…", 80);

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
        ? `Music: ${esc(strip(musicInfo.title))}` +
          `${musicInfo.artist ? " — " + esc(strip(musicInfo.artist)) : ""}. ` +
          `License: ${esc(musicInfo.license)}. ` +
          `<a href="${musicInfo.source}" target="_blank" rel="noopener">Source</a>`
        : "No music track was found; video created without background music.";

      $("resultCard").classList.remove("hidden");
      status("Video ready.", 100);

    } catch (e) {
      console.error(e);
      status(e.message || "Something went wrong.");
      alert(e.message || "Something went wrong.");
    } finally {
      $("generate").disabled = false;
      $("stop").classList.add("hidden");
    }
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
