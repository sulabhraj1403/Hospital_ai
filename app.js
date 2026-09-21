// Replace the existing app.js with this version.
// The only functional change requested is a mandatory final hospital end card.
// It is created locally in the browser, so it does not use Gemini quota.

const $=id=>document.getElementById(id);
let stopped=false, scenes=[], musicInfo=null;

$("settingsBtn").onclick=()=>$("settings").classList.remove("hidden");
$("closeSettings").onclick=()=>$("settings").classList.add("hidden");
$("saveSettings").onclick=()=>{localStorage.hospitalText=$("hospitalText").value;$("settings").classList.add("hidden")};
$("hospitalText").value=localStorage.hospitalText||"Major Hospital • Dhaka, East Champaran";

function status(t,p=null){$("status").textContent=t;if(p!==null)$("bar").style.width=p+"%"}
function dataUrl(mime,b64){return `data:${mime};base64,${b64}`}

async function jsonPost(url,body){
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json(); if(!r.ok) throw new Error(j.error||"Server error"); return j;
}

async function getMusic(topic){
  const q=encodeURIComponent(`instrumental music ${topic}`);
  const api=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
  try{
    const j=await fetch(api).then(r=>r.json());
    const pages=Object.values(j.query?.pages||{});
    const audio=pages.find(p=>/\.(mp3|ogg|oga|wav)$/i.test(p.imageinfo?.[0]?.url||""));
    if(!audio) return null;
    const ii=audio.imageinfo[0], md=ii.extmetadata||{};
    return {
      url:ii.url,
      title:md.ObjectName?.value||audio.title,
      artist:md.Artist?.value||"",
      license:md.LicenseShortName?.value||"See source",
      source:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(audio.title.replace(/^File:/,"File:"))
    };
  }catch(e){return null}
}

async function blobFromUrl(url){
  const r=await fetch(url);
  if(!r.ok) throw Error("Music download failed");
  return await r.blob();
}

// Mandatory final card. This is rendered locally as SVG and therefore
// always appears even when the selected free image source contains no text.
function makeEndCard(){
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

async function makeVideo(images, seconds, captions, musicBlob){
  const {FFmpeg}=window.FFmpeg, {fetchFile,toBlobURL}=window.FFmpegUtil;
  const ff=new FFmpeg();
  ff.on("progress",({progress})=>status("Assembling MP4…",80+Math.round(progress*19)));
  const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL:await toBlobURL(base+"/ffmpeg-core.js","text/javascript"),
    wasmURL:await toBlobURL(base+"/ffmpeg-core.wasm","application/wasm")
  });

  for(let i=0;i<images.length;i++){
    await ff.writeFile(`img${i}.png`,await fetchFile(images[i]));
  }

  const args=[];
  for(let i=0;i<images.length;i++)
    args.push("-loop","1","-t",String(seconds),"-i",`img${i}.png`);

  if(musicBlob){
    await ff.writeFile("music",await fetchFile(musicBlob));
    args.push("-stream_loop","-1","-i","music");
  }

  args.push("-filter_complex",`concat=n=${images.length}:v=1:a=0,format=yuv420p[v]`);

  if(musicBlob)
    args.push("-map","[v]","-map",`${images.length}:a:0`,"-shortest");
  else
    args.push("-map","[v]");

  args.push("-r","30","-c:v","libx264","-preset","veryfast","-movflags","+faststart","video.mp4");

  await ff.exec(args);
  const data=await ff.readFile("video.mp4");
  return new Blob([data.buffer],{type:"video/mp4"});
}

$("stop").onclick=()=>{stopped=true;status("Stopping…")};

$("generate").onclick=async()=>{
  stopped=false;
  $("generate").disabled=true;
  $("stop").classList.remove("hidden");
  $("resultCard").classList.add("hidden");
  $("scenesCard").classList.add("hidden");
  $("scenes").innerHTML="";

  try{
    const topic=$("topic").value.trim();
    if(!topic) throw Error("Enter a topic first.");

    const count=+$("sceneCount").value;
    const seconds=+$("seconds").value;
    const language=$("language").value;

    status("Creating script and scene plan…",3);

    const plan=await jsonPost("/api/script",{
      topic,
      language,
      sceneCount:count,
      secondsPerScene:seconds,
      hospital:"Major Hospital, Dhaka, East Champaran"
    });

    scenes=plan.scenes||[];
    $("scenesCard").classList.remove("hidden");

    for(let i=0;i<scenes.length;i++){
      if(stopped) throw Error("Stopped");

      status(`Generating scene ${i+1} of ${scenes.length}…`,5+Math.round(i/scenes.length*50));

      const imagePrompt =
        scenes[i].visualPrompt ||
        scenes[i].imagePrompt ||
        scenes[i].visual ||
        "";
      if(!imagePrompt) throw Error(`Scene ${i+1} has no image prompt.`);
      const r=await jsonPost("/api/image",{prompt:imagePrompt});
      scenes[i].image=dataUrl(r.mimeType,r.imageBase64);

      const div=document.createElement("div");
      div.className="scene";
      div.innerHTML=`<img src="${scenes[i].image}"><div><h3>${i+1}. ${esc(scenes[i].title)}</h3><p>${esc(scenes[i].caption||"")}</p></div>`;
      $("scenes").appendChild(div);
    }

    // ALWAYS append the mandatory Major Hospital / doctor end card.
    scenes.push({
      title:"Major Hospital — End Card",
      caption:"Major Hospital • Major (Dr.) Ratish Kumar • Orthopaedic Surgeon",
      image:makeEndCard()
    });

    const endDiv=document.createElement("div");
    endDiv.className="scene";
    endDiv.innerHTML=`<img src="${scenes[scenes.length-1].image}"><div><h3>${scenes.length}. Major Hospital — End Card</h3><p>Major Hospital • Major (Dr.) Ratish Kumar • Orthopaedic Surgeon</p></div>`;
    $("scenes").appendChild(endDiv);

    let mb=null;

    if($("music").checked){
      status("Finding suitable background music…",63);
      musicInfo=await getMusic(topic);
      if(musicInfo){
        try{mb=await blobFromUrl(musicInfo.url)}catch(e){mb=null}
      }
    }

    status("Building vertical MP4…",80);

    const blob=await makeVideo(
      scenes.map(x=>x.image),
      seconds,
      $("captions").checked,
      mb
    );

    const url=URL.createObjectURL(blob);
    $("preview").src=url;
    $("download").href=url;
    $("download").download="major-hospital-video.mp4";

    $("credits").innerHTML=musicInfo
      ? `Music: ${esc(strip(musicInfo.title))}${musicInfo.artist?" — "+strip(musicInfo.artist):""}. License: ${esc(musicInfo.license)}. <a href="${musicInfo.source}" target="_blank" rel="noopener">Source</a>`
      : "No music track was found; video created without background music.";

    $("resultCard").classList.remove("hidden");
    status("Video ready.",100);

  }catch(e){
    status(e.message||"Something went wrong.");
    alert(e.message||"Something went wrong.");
  }finally{
    $("generate").disabled=false;
    $("stop").classList.add("hidden");
  }
};

function esc(s){
  return String(s||"").replace(/[&<>"']/g,m=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function strip(s){
  return String(s||"").replace(/<[^>]+>/g,"");
}
