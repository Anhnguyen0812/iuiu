/* ============================================================
   MÓN QUÀ DÀNH CHO BẠN - Script chính
   ============================================================
   Tính năng: đồng hồ đếm ngày, phát lời nhắn mô phỏng,
   album ảnh với lightbox, ghi âm & phát lại qua IndexedDB
   ============================================================ */

// ============================================================
// 1. CẤU HÌNH
// ============================================================

const CONFIG = {
  relationshipStart: "2025-06-27",
  nextAnniversary: "2026-06-27",
  gallery: ["anh1.jpg", "anh2.jpg", "anh3.jpg", "anh4.jpg", "anh5.jpg"],
  recordingDbName: "VoiceRecordingsDB",
  recordingStoreName: "recordings",
};

// ============================================================
// 2. HÀM TIỆN ÍCH
// ============================================================

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/** Format seconds to MM:SS */
function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Parse date string "YYYY-MM-DD" */
function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Count days between two dates (non-negative) */
function daysBetween(a, b) {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.max(0, Math.floor((y - x) / 86400000));
}

/** Format a Date to locale date string */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format a Date to relative time */
function formatRelativeTime(date) {
  const diff = Date.now() - (date instanceof Date ? date : new Date(date));
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return formatDate(date);
}

// ============================================================
// 3. TOAST NOTIFICATION
// ============================================================

const toastEl = $("#toast");
let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2300);
}

// ============================================================
// 4. DATE COUNTER
// ============================================================

function updateDateCounters() {
  const now = new Date();
  const daysTogether = daysBetween(parseDate(CONFIG.relationshipStart), now);
  const daysUntilAnniversary = daysBetween(now, parseDate(CONFIG.nextAnniversary));

  $("#daysTogether").textContent = daysTogether;
  $("#countdown").textContent = `${daysUntilAnniversary} ngày`;
}

// ============================================================
// 5. IMAGE ERROR HANDLING
// ============================================================

$$(".image-box img").forEach((img) => {
  img.addEventListener("error", () => {
    img.style.display = "none";
  });
});

// ============================================================
// 6. VOICE PLAYER (SIMULATED + REAL AUDIO)
// ============================================================

const playBtn = $("#playBtn");
const playerState = $("#playerState");
const playerTime = $("#playerTime");
const voiceTitle = $("#voiceTitle");

let isPlaying = false;
let elapsedSeconds = 0;
let totalSeconds = 88; // default: 01:28
let playerTimer = null;
let playerAudio = null;     // real Audio element when recording is loaded
let playerAudioUrl = null;  // object URL for the real audio

function stopPlayer(reset = false) {
  isPlaying = false;
  playBtn.classList.remove("playing");
  clearInterval(playerTimer);

  // Stop real audio if playing
  if (playerAudio && !playerAudio.paused) {
    playerAudio.pause();
    playerAudio.currentTime = 0;
  }

  if (playerAudio) {
    playerState.textContent = "Chạm để nghe bản ghi";
  } else {
    playerState.textContent = "Chạm để nghe";
  }

  if (reset) {
    elapsedSeconds = 0;
    playerTime.textContent = playerAudio
      ? fmtTime(Math.floor(totalSeconds))
      : fmtTime(totalSeconds);
  }
}

function startPlayer() {
  if (isPlaying) {
    stopPlayer();
    playerState.textContent = "Đã tạm dừng";
    return;
  }

  isPlaying = true;
  playBtn.classList.add("playing");

  // --- REAL AUDIO MODE ---
  if (playerAudio) {
    playerState.textContent = "Đang phát bản ghi";
    playerAudio.play().catch(() => {});

    // Use interval to update time display (like simulated mode)
    if (playerTimer) clearInterval(playerTimer);
    playerTimer = setInterval(() => {
      if (playerAudio && !playerAudio.paused) {
        const remaining = Math.max(0, Math.ceil(playerAudio.duration - playerAudio.currentTime));
        playerTime.textContent = fmtTime(remaining);
      }
    }, 200);

    playerAudio.addEventListener("ended", function onEnd() {
      clearInterval(playerTimer);
      stopPlayer(true);
      showToast("Bản ghi đã phát xong ♡");
    }, { once: true });
    return;
  }

  // --- SIMULATED MODE ---
  playerState.textContent = "Đang phát lời nhắn";

  playerTimer = setInterval(() => {
    elapsedSeconds++;
    const remaining = Math.max(0, totalSeconds - elapsedSeconds);
    playerTime.textContent = fmtTime(remaining);

    if (remaining === 0) {
      stopPlayer(true);
      showToast("Lời nhắn đã phát xong ♡");
    }
  }, 1000);
}

playBtn.addEventListener("click", startPlayer);

/** Load real recorded audio into the main player */
function loadRecordingToMainPlayer(blob, name) {
  // Clean up previous real audio
  if (playerAudioUrl) {
    URL.revokeObjectURL(playerAudioUrl);
  }
  if (playerAudio) {
    playerAudio.pause();
    playerAudio.src = "";
  }

  stopPlayer(true);

  playerAudioUrl = URL.createObjectURL(blob);
  playerAudio = new Audio(playerAudioUrl);

  // Wait for metadata to get duration
  playerAudio.addEventListener("loadedmetadata", () => {
    totalSeconds = Math.ceil(playerAudio.duration);
    playerTime.textContent = fmtTime(totalSeconds);
  }, { once: true });

  voiceTitle.textContent = name || "Bản ghi của bạn";
  playerState.textContent = "Chạm để nghe bản ghi";
}

/** Switch main player back to simulated mode */
function switchToSimulatedMode() {
  if (playerAudioUrl) {
    URL.revokeObjectURL(playerAudioUrl);
    playerAudioUrl = null;
  }
  if (playerAudio) {
    playerAudio.pause();
    playerAudio.src = "";
    playerAudio = null;
  }
  stopPlayer(true);
}

// Memory buttons – switch to a different simulated voice message
$$(".memory").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchToSimulatedMode();
    const [mins, secs] = btn.dataset.time.split(":").map(Number);
    stopPlayer(true);
    totalSeconds = mins * 60 + secs;
    playerTime.textContent = fmtTime(totalSeconds);
    voiceTitle.textContent = btn.dataset.title;
    $(".voice-card").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(startPlayer, 420);
  });
});

// ============================================================
// 7. MODAL (PRIVACY + GALLERY)
// ============================================================

function openModal(modalEl) {
  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modalEl) {
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Privacy modal
const privacyModal = $("#privacyModal");
$("#privacyBtn").addEventListener("click", () => openModal(privacyModal));
$$('[data-close="privacy"]').forEach((el) => {
  el.addEventListener("click", () => closeModal(privacyModal));
});

// Gallery modal
const galleryModal = $("#galleryModal");

function buildGallery() {
  const grid = $("#galleryGrid");
  grid.innerHTML = "";

  CONFIG.gallery.forEach((src, index) => {
    const btn = document.createElement("button");
    const img = document.createElement("img");

    img.src = src;
    img.alt = `Ảnh kỷ niệm ${index + 1}`;
    img.addEventListener("error", () => btn.remove());

    btn.append(img);
    btn.addEventListener("click", () => openLightbox(src));
    grid.append(btn);
  });
}

$("#galleryBtn").addEventListener("click", () => {
  buildGallery();
  openModal(galleryModal);
});

$$('[data-close="gallery"]').forEach((el) => {
  el.addEventListener("click", () => closeModal(galleryModal));
});

// ============================================================
// 8. LIGHTBOX
// ============================================================

const lightboxEl = $("#lightbox");
const lightboxImg = $("#lightboxImg");

function openLightbox(src) {
  lightboxImg.src = src;
  lightboxEl.classList.add("open");
  lightboxEl.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightboxEl.classList.remove("open");
  lightboxEl.setAttribute("aria-hidden", "true");
}

$$(".photo[data-src]").forEach((el) => {
  el.addEventListener("click", () => openLightbox(el.dataset.src));
});

$("#lightboxClose").addEventListener("click", closeLightbox);
lightboxEl.addEventListener("click", (e) => {
  if (e.target === lightboxEl) closeLightbox();
});

// ============================================================
// 9. KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal(privacyModal);
    closeModal(galleryModal);
    closeLightbox();
  }
});

// ============================================================
// 10. RECORDER - IndexedDB PERSISTENCE
// ============================================================

// ---- 10a. IndexedDB helpers ----

function openRecordingDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CONFIG.recordingDbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(CONFIG.recordingStoreName)) {
        const store = db.createObjectStore(CONFIG.recordingStoreName, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveRecordingToDb(blob, name) {
  return openRecordingDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.recordingStoreName, "readwrite");
      const store = tx.objectStore(CONFIG.recordingStoreName);
      const record = {
        name: name || `Bản ghi ${formatDate(new Date())}`,
        blob: blob,
        createdAt: Date.now(),
      };
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

function getAllRecordingsFromDb() {
  return openRecordingDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.recordingStoreName, "readonly");
      const store = tx.objectStore(CONFIG.recordingStoreName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort newest first
        const results = (request.result || []).sort(
          (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
        );
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteRecordingFromDb(id) {
  return openRecordingDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONFIG.recordingStoreName, "readwrite");
      const store = tx.objectStore(CONFIG.recordingStoreName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// ---- 10b. Recorder UI logic ----

const recordBtn = $("#recordBtn");
const listenBtn = $("#listenBtn");
const recordStatus = $("#recordStatus");
const recordedAudio = $("#recordedAudio");
const recordingHistory = $("#recordingHistory");

let mediaRecorder = null;
let audioChunks = [];
let currentAudioUrl = null;
let recordClockInterval = null;
let recordStartTime = null;
let lastRecordedBlob = null;

function updateRecordClock() {
  const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);
  recordStatus.textContent = `Đang ghi · ${fmtTime(elapsed)}`;
}

function revokeCurrentAudioUrl() {
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    showToast("Trình duyệt chưa hỗ trợ ghi âm");
    recordStatus.textContent = "Trình duyệt không hỗ trợ ghi âm.";
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, {
        type: mediaRecorder.mimeType || "audio/webm",
      });
      lastRecordedBlob = blob;

      revokeCurrentAudioUrl();
      currentAudioUrl = URL.createObjectURL(blob);
      recordedAudio.src = currentAudioUrl;

      // Stop all tracks from the stream
      stream.getTracks().forEach((track) => track.stop());

      listenBtn.disabled = false;
      recordStatus.textContent = 'Đã ghi xong · bấm "Nghe lại" để kiểm tra.';
      showToast("Đã lưu bản ghi tạm thời ♡");

      // Load recording into the main player at the top
      const now = new Date();
      const duration = Math.floor((Date.now() - recordStartTime) / 1000);
      const defaultName = `Bản ghi ${formatDate(now)}`;
      loadRecordingToMainPlayer(blob, defaultName);

      // Auto-save to IndexedDB
      saveRecordingToDb(blob, `${defaultName} ${fmtTime(duration)}`)
        .then(() => {
          showToast("Đã lưu bản ghi vào thiết bị");
          renderRecordingHistory();
        })
        .catch((err) => {
          console.error("Không thể lưu bản ghi:", err);
        });
    };

    mediaRecorder.start();
    recordStartTime = Date.now();
    recordClockInterval = setInterval(updateRecordClock, 500);

    recordBtn.classList.add("recording");
    recordBtn.querySelector("span").textContent = "Dừng ghi";
    listenBtn.disabled = true;
    updateRecordClock();
  } catch (err) {
    recordStatus.textContent =
      "Không thể sử dụng micro. Hãy kiểm tra quyền trình duyệt.";
    showToast("Bạn chưa cấp quyền sử dụng micro");
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;

  clearInterval(recordClockInterval);
  mediaRecorder.stop();
  recordBtn.classList.remove("recording");
  recordBtn.querySelector("span").textContent = "Ghi lại";
}

recordBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
  } else {
    startRecording();
  }
});

listenBtn.addEventListener("click", async () => {
  if (!recordedAudio.src) return;

  if (recordedAudio.paused) {
    try {
      await recordedAudio.play();
      listenBtn.textContent = "Tạm dừng";
      recordStatus.textContent = "Đang phát bản ghi của bạn.";
    } catch (err) {
      console.error("Lỗi phát audio:", err);
    }
  } else {
    recordedAudio.pause();
    listenBtn.textContent = "Nghe lại";
    recordStatus.textContent = "Đã tạm dừng.";
  }
});

recordedAudio.addEventListener("ended", () => {
  listenBtn.textContent = "Nghe lại";
  recordStatus.textContent = "Bản ghi đã phát xong.";
});

// ---- 10c. Recording history rendering ----

function renderRecordingHistory() {
  getAllRecordingsFromDb()
    .then((recordings) => {
      if (!recordingHistory) return;
      recordingHistory.innerHTML = "";

      if (!recordings || recordings.length === 0) {
        recordingHistory.innerHTML =
          '<small style="color:var(--muted)">Chưa có bản ghi nào.</small>';
        return;
      }

      const title = document.createElement("h3");
      title.textContent = "Các bản ghi đã lưu";
      recordingHistory.append(title);

      recordings.forEach((rec) => {
        const item = document.createElement("div");
        item.className = "rec-item";

        // Play button
        const playBtn = document.createElement("button");
        playBtn.textContent = "▶";
        playBtn.setAttribute("aria-label", `Phát bản ghi: ${rec.name}`);

        const url = URL.createObjectURL(rec.blob);
        const audioEl = new Audio(url);
        let isRecPlaying = false;

        playBtn.addEventListener("click", () => {
          if (isRecPlaying) {
            audioEl.pause();
            audioEl.currentTime = 0;
            playBtn.textContent = "▶";
            isRecPlaying = false;
            return;
          }

          // Stop any other playing recording
          $$(".rec-item .rec-play-btn.active").forEach((btn) => {
            btn.textContent = "▶";
            btn.classList.remove("active");
          });

          audioEl.play();
          playBtn.textContent = "■";
          playBtn.classList.add("active", "rec-play-btn");
          isRecPlaying = true;

          audioEl.onended = () => {
            playBtn.textContent = "▶";
            playBtn.classList.remove("active");
            isRecPlaying = false;
            URL.revokeObjectURL(url);
          };
        });

        // Name
        const nameSpan = document.createElement("span");
        nameSpan.className = "rec-name";
        nameSpan.textContent = rec.name;

        // Date
        const dateSpan = document.createElement("span");
        dateSpan.className = "rec-date";
        dateSpan.textContent = formatRelativeTime(rec.createdAt);

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.className = "rec-delete";
        delBtn.textContent = "✕";
        delBtn.setAttribute("aria-label", `Xoá bản ghi: ${rec.name}`);
        delBtn.addEventListener("click", async () => {
          await deleteRecordingFromDb(rec.id);
          showToast("Đã xoá bản ghi");
          renderRecordingHistory();
        });

        item.append(playBtn, nameSpan, dateSpan, delBtn);
        recordingHistory.append(item);
      });
    })
    .catch((err) => {
      console.error("Lỗi tải lịch sử ghi âm:", err);
    });
}

// ---- 10d. Cleanup on page unload ----

window.addEventListener("beforeunload", () => {
  revokeCurrentAudioUrl();
});

// ============================================================
// 11. KHỞI TẠO
// ============================================================

/** Load the most recent recording from IndexedDB into the main player */
function loadLatestRecordingIntoPlayer() {
  getAllRecordingsFromDb()
    .then((recordings) => {
      if (recordings && recordings.length > 0) {
        const latest = recordings[0];
        loadRecordingToMainPlayer(latest.blob, latest.name);
      }
    })
    .catch((err) => {
      console.error("Không thể tải bản ghi gần nhất:", err);
    });
}

// ============================================================
// 11. KHỞI TẠO
// ============================================================

updateDateCounters();
renderRecordingHistory();
loadLatestRecordingIntoPlayer();
