const CONFIG={relationshipStart:"2024-10-22",nextAnniversary:"2026-10-21",gallery:["anh1.jpg","anh2.jpg","anh3.jpg","anh4.jpg","anh5.jpg"]};
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const toast=$("#toast");let toastTimer;
function showToast(t){toast.textContent=t;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2300)}
function parseDate(s){const[y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function days(a,b){const x=new Date(a.getFullYear(),a.getMonth(),a.getDate()),y=new Date(b.getFullYear(),b.getMonth(),b.getDate());return Math.max(0,Math.floor((y-x)/86400000))}
function updateDates(){const now=new Date();$("#daysTogether").textContent=days(parseDate(CONFIG.relationshipStart),now);$("#countdown").textContent=`${days(now,parseDate(CONFIG.nextAnniversary))} ngày`}
$$('.image-box img').forEach(img=>img.addEventListener('error',()=>img.style.display='none'));
let playing=false,elapsed=0,total=88,timer;const playBtn=$("#playBtn"),state=$("#playerState"),time=$("#playerTime");
function fmt(v){return `${String(Math.floor(v/60)).padStart(2,"0")}:${String(v%60).padStart(2,"0")}`}
function stop(reset=false){playing=false;playBtn.classList.remove("playing");clearInterval(timer);state.textContent="Chạm để nghe";if(reset){elapsed=0;time.textContent=fmt(total)}}
function play(){if(playing){stop();state.textContent="Đã tạm dừng";return}playing=true;playBtn.classList.add("playing");state.textContent="Đang phát lời nhắn";timer=setInterval(()=>{elapsed++;const left=Math.max(0,total-elapsed);time.textContent=fmt(left);if(!left){stop(true);showToast("Lời nhắn đã phát xong ♡")}},1000)}
playBtn.addEventListener("click",play);
$$('.memory').forEach(btn=>btn.addEventListener('click',()=>{const[m,s]=btn.dataset.time.split(':').map(Number);stop(true);total=m*60+s;time.textContent=fmt(total);$("#voiceTitle").textContent=btn.dataset.title;$(".voice-card").scrollIntoView({behavior:"smooth",block:"center"});setTimeout(play,420)}));
function openModal(el){el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeModal(el){el.classList.remove('open');el.setAttribute('aria-hidden','true');document.body.style.overflow=''}
const privacy=$("#privacyModal"),gallery=$("#galleryModal"),lightbox=$("#lightbox"),lightboxImg=$("#lightboxImg");
$("#privacyBtn").addEventListener('click',()=>openModal(privacy));
$$('[data-close="privacy"]').forEach(x=>x.addEventListener('click',()=>closeModal(privacy)));
function buildGallery(){const grid=$("#galleryGrid");grid.innerHTML='';CONFIG.gallery.forEach((src,i)=>{const b=document.createElement('button'),img=document.createElement('img');img.src=src;img.alt=`Ảnh kỷ niệm ${i+1}`;img.addEventListener('error',()=>b.remove());b.append(img);b.addEventListener('click',()=>openLightbox(src));grid.append(b)})}
$("#galleryBtn").addEventListener('click',()=>{buildGallery();openModal(gallery)});$$('[data-close="gallery"]').forEach(x=>x.addEventListener('click',()=>closeModal(gallery)));
function openLightbox(src){lightboxImg.src=src;lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false')}
function closeLightbox(){lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true')}
$$('.photo[data-src]').forEach(x=>x.addEventListener('click',()=>openLightbox(x.dataset.src)));$("#lightboxClose").addEventListener('click',closeLightbox);lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal(privacy);closeModal(gallery);closeLightbox()}});
let recorder,chunks=[],audioUrl,clock,startAt;const recordBtn=$("#recordBtn"),listenBtn=$("#listenBtn"),status=$("#recordStatus"),audio=$("#recordedAudio");
function recordClock(){status.textContent=`Đang ghi · ${fmt(Math.floor((Date.now()-startAt)/1000))}`}
async function startRecord(){if(!navigator.mediaDevices||!window.MediaRecorder){showToast('Trình duyệt chưa hỗ trợ ghi âm');return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(blob);audio.src=audioUrl;stream.getTracks().forEach(t=>t.stop());listenBtn.disabled=false;status.textContent='Đã ghi xong · bấm “Nghe lại” để kiểm tra.';showToast('Đã lưu bản ghi tạm thời ♡')};recorder.start();startAt=Date.now();clock=setInterval(recordClock,500);recordBtn.classList.add('recording');recordBtn.querySelector('span').textContent='Dừng ghi';listenBtn.disabled=true;recordClock()}catch(e){status.textContent='Không thể sử dụng micro. Hãy kiểm tra quyền trình duyệt.';showToast('Bạn chưa cấp quyền sử dụng micro')}}
function stopRecord(){if(!recorder||recorder.state!=='recording')return;clearInterval(clock);recorder.stop();recordBtn.classList.remove('recording');recordBtn.querySelector('span').textContent='Ghi lại'}
recordBtn.addEventListener('click',()=>recorder?.state==='recording'?stopRecord():startRecord());listenBtn.addEventListener('click',async()=>{if(!audio.src)return;if(audio.paused){await audio.play();listenBtn.textContent='Tạm dừng';status.textContent='Đang phát bản ghi của bạn.'}else{audio.pause();listenBtn.textContent='Nghe lại';status.textContent='Đã tạm dừng.'}});audio.addEventListener('ended',()=>{listenBtn.textContent='Nghe lại';status.textContent='Bản ghi đã phát xong.'});window.addEventListener('beforeunload',()=>audioUrl&&URL.revokeObjectURL(audioUrl));
updateDates();
