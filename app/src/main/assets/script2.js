// Script untuk menyimpan data ke SQLite dan menampilkan di div container
// Menggunakan sql.js untuk menjalankan SQLite di browser
// Pastikan untuk menyertakan sql.js di HTML: <script src="https://sql.js.org/dist/sql-wasm.js"></script>

// Inisialisasi database SQLite
let db; 
let SQL;
//settings.zoomLevel = 1; // default

// Default Settings (digunakan jika database kosong)
const defaultSettings = {
    masjidName: 'MASJID NURUL JIHAD',
    masjidAddress: 'Jl. Raya Masjid Desa Sambiut, Kec. Totikum',
    prayerTimes: {
        imsak: '04:36',
        subuh: '04:45',
        syuruq: '05:50',
        dzuhur: '12:05',
        ashar: '15:20',
        maghrib: '18:15',
        isya: '19:30'
    },
    iqomahDelays: {
        subuh: 10,
        dzuhur: 1,
        ashar: 10,
        maghrib: 5,
        isya: 2
    },
    quote: {
        text: '"Dan Dialah yang menjadikan malam dan siang silih berganti"',
        source: '(QS. Al-Furqan: 62)'
    },
    heroImage: null, // Uint8Array untuk gambar hero
    videos: {
        quran: null,
        kajian: null,
        khutbah: null
    },
    audio: null, // Uint8Array untuk audio peringatan
    runningText: 'Selamat datang di Masjid Al-Ikhlas. Mari bersama menjaga kebersihan dan ketertiban masjid.'
};

// Load settings dari database atau gunakan defaults
let settings = { ...defaultSettings };

// Audio element untuk peringatan
let audioElement = new Audio();


window.addEventListener("error", (e) => {
    showDebugMessage("⚠️ Ada Eror sebelum javascript: " + e.message);
    return true; // cegah crash seluruh script
});

// Initialize on page load
// --- PASTE START: safe init sequence (gunakan safeRun untuk setiap tahap) ---
window.addEventListener('load', async () => {
  showDebugMessage("⏳ Memulai aplikasi (safe init)...");
  window.settings = window.settings || {};
  // init database (SQL.js + restore dari IndexedDB) — initDatabase sekarang menangani restore
  await safeRun("initDatabase", async () => {
    if (typeof initDatabase === 'function') await initDatabase();
    else showDebugMessage("⚠ initDatabase() tidak ditemukan");
  });
  // load settings (mengambil data dari `db` yang sudah benar)
  await safeRun("loadSettings", async () => {
    if (typeof loadSettings === 'function') await loadSettings();
    else showDebugMessage("⚠ loadSettings() tidak ditemukan");
  });
  // isi form admin dari settings
  await safeRun("loadAdminFormFromSettings", async () => {
    if (typeof loadAdminFormFromSettings === 'function') await loadAdminFormFromSettings();
    else showDebugMessage("⚠ loadAdminFormFromSettings() tidak ditemukan");
  });
  // load zoom setelah settings sudah siap
  await safeRun("loadZoomFromDB", async () => {
    if (typeof loadZoomFromDB === 'function') await loadZoomFromDB();
    else showDebugMessage("⚠ loadZoomFromDB() tidak ditemukan");
  });

  // UI updates (non-blocking but reported)
  await safeRun("updateClock", async () => { if (typeof updateClock === 'function') updateClock(); });
  await safeRun("updateDates", async () => { if (typeof updateDates === 'function') updateDates(); });
  await safeRun("updatePrayerTimes", async () => { if (typeof updatePrayerTimes === 'function') updatePrayerTimes(); });
  await safeRun("updateCountdowns", async () => { if (typeof updateCountdowns === 'function') updateCountdowns(); });

  // restore active section safely
  await safeRun("restoreActiveSection", async () => {
    try {
      const activeSection = localStorage.getItem('activeSection');
      if (activeSection) {
        localStorage.removeItem('activeSection');
        if (typeof showContent === 'function') showContent(activeSection);
      }
    } catch(e) { showDebugMessage("⚠ restoreActiveSection err: " + (e.message||e)); }
  });
  // fill iqomah inputs safely
  await safeRun("isiDelayIqomahKeForm", async () => {
    try {
      const map = {
        delaySubuh: settings?.iqomahDelays?.subuh,
        delayDzuhur: settings?.iqomahDelays?.dzuhur,
        delayAshar: settings?.iqomahDelays?.ashar,
        delayMaghrib: settings?.iqomahDelays?.maghrib,
        delayIsya: settings?.iqomahDelays?.isya
      };
      for (const id in map) {
        const el = document.getElementById(id);
        if (el) el.value = (map[id] ?? 0);
      }
    } catch(e) { showDebugMessage("⚠ isiDelayIqomahKeForm err: " + (e.message||e)); }
  });
  // kick off upload tasks but don't block the UI
  try {
    if (typeof uploadPdf === 'function') {
      safeRun("uploadAyatPDF", () => uploadPdf('uploadAyatForm', 'ayat_pdf', 'ayatSlideshow'));
      safeRun("uploadKasPDF", () => uploadPdf('uploadKasForm', 'kas_pdf', 'kasSlideshow'));
      safeRun("uploadJadwalPDF", () => uploadPdf('uploadJadwalForm', 'jadwal_pdf', 'jadwalSlideshow'));
    }
  } catch(e) { showDebugMessage("⚠ upload tasks err: " + (e.message||e)); }

  // ensure intervals use safeRun wrappers so an exception in a tick won't kill them
 // window.__intervals = window.__intervals || [];
 // window.__intervals.push(setInterval(() => safeRun("updateClock interval", updateClock), 1000));
 // window.__intervals.push(setInterval(() => safeRun("updateCountdowns interval", updateCountdowns), 1000));
 // window.__intervals.push(setInterval(() => safeRun("updateDates interval", updateDates), 60000));
     window.__intervals = window.__intervals || [];
    window.__intervals.push(setInterval(() => safeRunQuiet("updateClock", updateClock), 1000));
    window.__intervals.push(setInterval(() => safeRunQuiet("updateCountdowns", updateCountdowns), 1000));
    window.__intervals.push(setInterval(() => safeRunQuiet("updateDates", updateDates), 60000));
    window.__intervals.push(setInterval(() => safeRunQuiet("updatePrayerTimes", updatePrayerTimes), 60000));

  // event tombol zoom / fullscreen / refresh
  try {
    document.getElementById('zoom-in').addEventListener('click', async () => {
      zoomLevel = Math.min(2, zoomLevel + 0.1);
      applyZoom(zoomLevel);
      await saveZoomToDB();
    });
    document.getElementById('zoom-out').addEventListener('click', async () => {
      zoomLevel = Math.max(0.5, zoomLevel - 0.1);
      applyZoom(zoomLevel);
      await saveZoomToDB();
    });
  } catch (e) { /* ignore if buttons missing in some screens */ }

  try {
    document.getElementById('fullscreen')
        .addEventListener('click', function () {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
  } catch(e){}

  try {
    document.getElementById('refresh')
        .addEventListener('click', () => location.reload());
  } catch(e){}

  showDebugMessage("🚀 Aplikasi siap digunakan (safe init)");
});

// --- PASTE END ---
// SAFE RUN QUIET — hanya tampil jika ERROR
async function safeRunQuiet(stepName, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      await result;
    }
    // tidak ada debug message
  } catch (err) {
    showDebugMessage(`❌ ERROR di ${stepName}: ${err?.message || err}`, {level:'error', persist:true});
  }
}

// Clock function
/*function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = now.getSeconds();
    //const seconds = String(now.getSeconds()).padStart(2, '0');
   // document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
    const separator = seconds % 2 === 0 ? ':' : ' ';
    document.getElementById('clock').textContent = `${hours}${separator}${minutes}`;
} */
async function loadAdminFormFromDB() {
  try {
    if (!db) {
      showDebugMessage("⚠ DB belum siap saat loadAdminFormFromDB");
      return;
    }

    // masjid_info
    try {
      const r = db.exec("SELECT name, address FROM masjid_info WHERE id = 1");
      if (r.length && r[0].values.length) {
        document.getElementById("adminMasjidName").value = r[0].values[0][0] || "";
        document.getElementById("adminMasjidAddress").value = r[0].values[0][1] || "";
      }
    } catch(e){}

    // prayer_times
    try {
      const p = db.exec("SELECT subuh, dzuhur, ashar, maghrib, isya, imsak, syuruq FROM prayer_times WHERE id = 1");
      if (p.length && p[0].values.length) {
        const t = p[0].values[0];
        document.getElementById('adminSubuh').value   = t[0] || "";
        document.getElementById('adminDzuhur').value  = t[1] || "";
        document.getElementById('adminAshar').value   = t[2] || "";
        document.getElementById('adminMaghrib').value = t[3] || "";
        document.getElementById('adminIsya').value    = t[4] || "";
        document.getElementById('adminImsak').value   = t[5] || "";
        document.getElementById('adminSyuruq').value  = t[6] || "";
      }
    } catch(e){}

    // iqomah
    try {
      const d = db.exec("SELECT subuh, dzuhur, ashar, maghrib, isya FROM iqomah_delays WHERE id = 1");
      if (d.length && d[0].values.length) {
        const x = d[0].values[0];
        document.getElementById('delaySubuh').value   = (x[0] != null) ? x[0] : 0;
        document.getElementById('delayDzuhur').value  = (x[1] != null) ? x[1] : 0;
        document.getElementById('delayAshar').value   = (x[2] != null) ? x[2] : 0;
        document.getElementById('delayMaghrib').value = (x[3] != null) ? x[3] : 0;
        document.getElementById('delayIsya').value    = (x[4] != null) ? x[4] : 0;
      }
    } catch(e){}

    // quote & running text
    try {
      const q = db.exec("SELECT text, source FROM quote WHERE id = 1");
      if (q.length && q[0].values.length) {
        document.getElementById('adminQuoteText').value = q[0].values[0][0] || "";
        document.getElementById('adminQuoteSource').value = q[0].values[0][1] || "";
      }
    } catch(e){}
    try {
      const rt = db.exec("SELECT text FROM running_text WHERE id = 1");
      if (rt.length && rt[0].values.length) {
        document.getElementById('adminRunningText').value = rt[0].values[0][0] || "";
      }
    } catch(e){}

    // Note: file inputs (adminHeroImage, adminVideoQuran, ...) CANNOT be programmatically set for security.
    // We rely on loadMediaToUI() to show preview in the main UI.
    showDebugMessage("📝 Admin form terisi dari database");
  } catch (e) {
    showDebugMessage("❌ loadAdminFormFromDB ERROR: " + (e?.message||e), {level:'error'});
  }
}

// Date functions
function updateDates() {
    const now = new Date();
    
    // Gregorian date
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    
    document.getElementById('gregorianDate').textContent = `${dayName}, ${day} ${month} ${year}`;
    
    // Hijri date
    const hijriDate = toHijri(now);
    document.getElementById('hijriDate').textContent = `📅 ${hijriDate}`;
}

// Simple Hijri date conversion
function toHijri(date) {
    const hijriMonths = ['Muharram', 'Safar', 'Rabi\'ul Awal', 'Rabi\'ul Akhir', 'Jumadal Awal', 'Jumadal Akhir', 'Rajab', 'Sya\'ban', 'Ramadhan', 'Syawal', 'Dzulqa\'dah', 'Dzulhijjah'];
    
    const gregorianDate = date.getTime();
    const hijriEpoch = new Date('July 16, 622').getTime();
    const daysSinceHijri = Math.floor((gregorianDate - hijriEpoch) / (1000 * 60 * 60 * 24));
    const hijriYear = Math.floor(daysSinceHijri / 354.36) + 1;
    const daysInYear = daysSinceHijri % 354.36;
    const hijriMonth = Math.floor(daysInYear / 29.53);
    const hijriDay = Math.floor(daysInYear % 29.53) + 1;
    
    return `${hijriDay} ${hijriMonths[hijriMonth]} ${hijriYear}H`;
}

// Prayer times display
function updatePrayerTimes() {
    const prayers = [
        { name: 'IMSAK', time: settings.prayerTimes.imsak, id: 'imsak' },
        { name: 'SUBUH', time: settings.prayerTimes.subuh, id: 'subuh' },
        { name: 'SYURUQ', time: settings.prayerTimes.syuruq, id: 'syuruq' }, 
        { name: 'DZUHUR', time: settings.prayerTimes.dzuhur, id: 'dzuhur' }, 
        { name: 'ASHAR', time: settings.prayerTimes.ashar, id: 'ashar' },
        { name: 'MAGHRIB', time: settings.prayerTimes.maghrib, id: 'maghrib' },
        { name: 'ISYA', time: settings.prayerTimes.isya, id: 'isya' }
    ];

    const nextPrayer = getNextPrayer();
    
    // Update main prayer times
    updatePrayerTimeContainer('prayerTimes', prayers, nextPrayer);
    
    // Update sidebar prayer times for all menu pages
    updatePrayerTimeContainer('prayerTimesAyat', prayers, nextPrayer);
    updatePrayerTimeContainer('prayerTimesVideoQuran', prayers, nextPrayer);
    updatePrayerTimeContainer('prayerTimesKas', prayers, nextPrayer);
    updatePrayerTimeContainer('prayerTimesJadwalKajian', prayers, nextPrayer);
    updatePrayerTimeContainer('prayerTimesVideoKajian', prayers, nextPrayer);
    updatePrayerTimeContainer('prayerTimesKhutbah', prayers, nextPrayer);
}

function updatePrayerTimeContainer(containerId, prayers, nextPrayer) {
    const prayerTimesContainer = document.getElementById(containerId);
    if (!prayerTimesContainer) return;
    
    prayerTimesContainer.innerHTML = '';

    prayers.forEach(prayer => {
        const isNext = prayer.id === nextPrayer.id;
        const card = document.createElement('div');
        card.className = `prayer-card ${isNext ? 'next' : ''}`;
        card.innerHTML = `
            ${isNext ? '<div class="next-label">SELANJUTNYA</div>' : ''}
            <div class="prayer-name">${prayer.name}</div>
            <div class="prayer-time">${prayer.time}</div>
        `;
        prayerTimesContainer.appendChild(card);
    });
}

// Get next prayer
function getNextPrayer() {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
         { name: 'Imsak', time: settings.prayerTimes.imsak, id: 'imsak' },    // Perbaiki: gunakan imsak time
        { name: 'Subuh', time: settings.prayerTimes.subuh, id: 'subuh' },
        { name: 'Syuruq', time: settings.prayerTimes.syuruq, id: 'syuruq' }, // Perbaiki: gunakan syuruq time
        { name: 'Dzuhur', time: settings.prayerTimes.dzuhur, id: 'dzuhur' },
        { name: 'Ashar', time: settings.prayerTimes.ashar, id: 'ashar' },
        { name: 'Maghrib', time: settings.prayerTimes.maghrib, id: 'maghrib' },
        { name: 'Isya', time: settings.prayerTimes.isya, id: 'isya' }
    ];

    const prayerMinutes = prayers.map(p => {
        const [hours, minutes] = p.time.split(':');
        return {
            ...p,
            minutes: parseInt(hours) * 60 + parseInt(minutes)
        };
    });
    for (let prayer of prayerMinutes) {
        if (currentTime < prayer.minutes) {
            return prayer;
        }
    }
    return prayerMinutes[0];
}

let hasAudioPlayed = false;

function updateCountdowns() {
    // Deklarasikan nextPrayer di sini, di awal fungsi, sebelum variabel lain
    const nextPrayer = getNextPrayer();
    const azanCountdownOverlay = document.getElementById('azanCountdownOverlay');
const iqomahCountdownOverlay = document.getElementById('iqomahCountdownOverlay');

const now = new Date();
//const now = new Date('2025-11-07T09:35:00');
// Hapus deklarasi nextPrayer dari sini (jika ada), karena sudah di atas

const [hours, minutes] = nextPrayer.time.split(':').map(Number);
let prayerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
if (now > prayerTime) prayerTime.setDate(prayerTime.getDate() + 1);

const timeDiffMs = prayerTime - now;
const timeDiffMinutes = timeDiffMs / (1000 * 60);

const iqomahDelay = settings.iqomahDelays[nextPrayer.id]; // 10
const iqomahTime = new Date(prayerTime.getTime() + iqomahDelay * 60000);

const isUtamaActive = document.getElementById('utama').classList.contains('active');

// Azan Countdown
if (isUtamaActive && timeDiffMinutes > 0 && timeDiffMinutes <= 5) {
    azanCountdownOverlay.classList.add('active');
    iqomahCountdownOverlay.classList.remove('active');

    // Hitung dan tampilkan hitungan mundur jam:menit:detik
    const diffHours = Math.floor(timeDiffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((timeDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((timeDiffMs % (1000 * 60)) / 1000);

    azanCountdownOverlay.querySelector('.countdown-timer').textContent =
        `${String(diffHours).padStart(2, '0')}:${String(diffMinutes).padStart(2, '0')}:${String(diffSeconds).padStart(2, '0')}`;
    azanCountdownOverlay.querySelector('h3').textContent = `Menuju Azan ${nextPrayer.name}`;

    if (!hasAudioPlayed && settings.audio) {
        const blob = new Blob([settings.audio], { type: 'audio/mp3' });
        audioElement.src = URL.createObjectURL(blob);
        audioElement.play().catch(e => console.log("Audio play failed", e));
        hasAudioPlayed = true;
    }
} else {
    azanCountdownOverlay.classList.remove('active');
    // Saat azan countdown tidak aktif, hentikan audio jika diputar dan kosongkan timer
    if (hasAudioPlayed) {
        audioElement.pause();
        audioElement.currentTime = 0;
        hasAudioPlayed = false;
    }
    azanCountdownOverlay.querySelector('.countdown-timer').textContent = '--:--:--';
}

 const iqomahPrayers = [
        { name: 'Subuh', time: settings.prayerTimes.subuh, id: 'subuh' },
        { name: 'Dzuhur', time: settings.prayerTimes.dzuhur, id: 'dzuhur' },
        { name: 'Ashar', time: settings.prayerTimes.ashar, id: 'ashar' }, 
        { name: 'Maghrib', time: settings.prayerTimes.maghrib, id: 'maghrib' },
        { name: 'Isya', time: settings.prayerTimes.isya, id: 'isya' }
    ];

function getIqomahDelay(id) {
    return settings.iqomahDelays[id] || 1; // otomatis ambil delay dari setting
}

let currentPrayerForIqomah = null;
    let iqomahEndTime = null;
//const iqomahDelayAfterAzan = 1; // menit tunggu setelah azan
const iqomahCountdownDuration = 1; // durasi hitung mundur iqomah dalam menit

for (let prayer of iqomahPrayers) {
    const delay = getIqomahDelay(prayer.id);     // ⬅️ delay sesuai sholat
    const [h, m] = prayer.time.split(':').map(Number);

    let pTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

    let iqomahStart = new Date(pTime.getTime() + delay * 60000);       // ⬅️ otomatis
    //let iqomahEnd = new Date(iqomahStart.getTime() + delay * 60000);   // ⬅️ otomatis
    let iqomahEnd = new Date(iqomahStart.getTime() + iqomahCountdownDuration * 60000);
    
   // const [h, m] = prayer.time.split(':').map(Number);
    //let pTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);

    // waktu mulai iqomah 2 menit setelah azan
   // let iqomahStart = new Date(pTime.getTime() + iqomahDelayAfterAzan * 60000);
   // let iqomahEnd = new Date(iqomahStart.getTime() + iqomahCountdownDuration * 60000);

    if (now >= iqomahStart && now < iqomahEnd) {
        currentPrayerForIqomah = prayer;
        iqomahEndTime = iqomahEnd;
        break;
    }
}

// Menampilkan iqomah countdown
if (isUtamaActive && currentPrayerForIqomah) {
    iqomahCountdownOverlay.classList.add('active');
    const diffMsIqomah = iqomahEndTime - now;
    const diffMinutesIqomah = Math.floor(diffMsIqomah / (1000 * 60));
    const diffSecondsIqomah = Math.floor((diffMsIqomah % (1000 * 60)) / 1000);

    iqomahCountdownOverlay.querySelector('.countdown-timer').textContent =
        `${String(diffMinutesIqomah).padStart(2, '0')}:${String(diffSecondsIqomah).padStart(2, '0')}`;
    iqomahCountdownOverlay.querySelector('h3').textContent = `Iqomah ${currentPrayerForIqomah.name}`;

    if (diffMsIqomah <= 0) {
        iqomahCountdownOverlay.classList.remove('active');
        iqomahCountdownOverlay.querySelector('.countdown-timer').textContent = '--:--';
        iqomahCountdownOverlay.querySelector('h3').textContent = '';
    }
} else {
    iqomahCountdownOverlay.classList.remove('active');
    iqomahCountdownOverlay.querySelector('.countdown-timer').textContent = '--:--';
}

}
setInterval(updateCountdowns, 1000);

// Sidebar toggle
/*function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}
function toggletema() {
    const sidebar1 = document.getElementById('sidebar1');
    sidebar1.classList.toggle('active');
} */
// Content navigation
async function showContent(contentId) {
    // Cek jika section 'video-quran' sedang aktif, lalu pause video dan reset ke awal
    const currentActiveSection = document.querySelector('.content-section.active');
    if (currentActiveSection && currentActiveSection.id === 'video-quran') {
        const video = document.getElementById('videoQuran');
        if (video) {
            video.pause(); // Hentikan pemutaran video
            video.currentTime = 0; // Reset video ke awal (opsional, hapus jika tidak ingin reset)
        }
    }else if (currentActiveSection && currentActiveSection.id === 'video-kajian') {
        const video = document.getElementById('videoKajian');
        if (video) {
            video.pause(); // Hentikan pemutaran video
            video.currentTime = 0; // Reset video ke awal (opsional, hapus jika tidak ingin reset)
        }
    }else if (currentActiveSection && currentActiveSection.id === 'khutbah') {
        const video = document.getElementById('videoKhutbah');
        if (video) {
            video.pause(); // Hentikan pemutaran video
            video.currentTime = 0; // Reset video ke awal (opsional, hapus jika tidak ingin reset)
        }
    }

    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Remove active class from all menu items
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    // Show selected content
    document.getElementById(contentId).classList.add('active');
    
    // Add active class to clicked menu item
   // event.target.classList.add('active');
     if (event && event.target) {
        event.target.classList.add('active');  // Untuk klik manual
    } else {
        // Untuk restore: Cari menu item berdasarkan contentId (asumsikan ID menu item seperti 'menu-ayat')
        const menuItem = document.getElementById(`menu-${contentId}`);
        if (menuItem) {
            menuItem.classList.add('active');
            console.log('Active class added to menu item:', `menu-${contentId}`);  // Debug log
        } else {
            console.warn('Menu item not found for contentId:', contentId);
        }
    } 
    
    // Tambahan: Load PDF dari BLOB untuk section ayat, kas, atau jadwal-kajian
    try {
        if (contentId === 'ayat') {
            const stmt = db.prepare("SELECT pdf_data FROM ayat_pdf WHERE id = 1");
            const result = stmt.getAsObject();
            if (result.pdf_data) {
                await loadPdfSlideshow(result.pdf_data, 'ayatSlideshow'); 
            }
            stmt.free();
            //initFlipbook();
        } else if (contentId === 'kas') {
            const stmt = db.prepare("SELECT pdf_data FROM kas_pdf WHERE id = 1");
            const result = stmt.getAsObject();
            if (result.pdf_data) {
                await loadPdfSlideshow(result.pdf_data, 'kasSlideshow');
            }
            stmt.free();
        } else if (contentId === 'jadwal-kajian') {
            const stmt = db.prepare("SELECT pdf_data FROM jadwal_pdf WHERE id = 1");
            const result = stmt.getAsObject();
            if (result.pdf_data) {
                await loadPdfSlideshow(result.pdf_data, 'jadwalSlideshow');
            }
            stmt.free();
        }
    } catch (error) {
        console.error('Error loading PDF slideshow:', error);
        // Jika error, lanjutkan tanpa slideshow (fungsi tetap berjalan)
    } finally {
        // Pastikan toggleSidebar selalu dipanggil, bahkan jika ada error
      //  console.log('Calling toggleSidebar for contentId:', contentId); // Debug log
        toggleSidebar();
    }
    
    if (contentId === 'video-quran') {
        const video = document.getElementById('videoQuran');
        if (video) {
            video.loop = true; // Set video untuk looping
            video.play(); // Putar video otomatis
        }
    }else if (contentId === 'video-kajian') {
        const video = document.getElementById('videoKajian');
        if (video) {
            video.loop = true; // Set video untuk looping
            video.play(); // Putar video otomatis
        }
    }else if (contentId === 'khutbah') {
        const video = document.getElementById('videoKhutbah');
        if (video) {
            video.loop = true; // Set video untuk looping
            video.play(); // Putar video otomatis
        }
    }
    // toggleSidebar() sudah dipindah ke finally di atas untuk memastikan selalu dipanggil
    // Tambahan untuk section ayat: Tambahkan event listener untuk keydown
            if (contentId === 'ayat') {
                const ayatForm = document.getElementById('ayat-ayat');
            ayatForm.classList.toggle('hidden');
                document.removeEventListener('keydown', handleAyatKeydown);
                document.addEventListener('keydown', handleAyatKeydown);
            }else {
                document.removeEventListener('keydown', handleAyatKeydown);
            }
            
            if (contentId === 'kas') {
                const ayatForm = document.getElementById('kas-kas');
            ayatForm.classList.toggle('hidden');
                // Hapus listener sebelumnya jika ada
                document.removeEventListener('keydown', handleKasKeydown);
                // Tambahkan listener baru
                document.addEventListener('keydown', handleKasKeydown);
            }else {
                // Jika bukan ayat, hapus listener
                document.removeEventListener('keydown', handleKasKeydown);
            }
            
            if (contentId === 'jadwal-kajian') {
                const ayatForm = document.getElementById('jadwal-jadwal');
            ayatForm.classList.toggle('hidden');
                // Hapus listener sebelumnya jika ada
                document.removeEventListener('keydown', handleJadwalKeydown);
                // Tambahkan listener baru
                document.addEventListener('keydown', handleJadwalKeydown);
            }else {
                // Jika bukan ayat, hapus listener
                document.removeEventListener('keydown', handleJadwalKeydown);
            } 
}

// -------------------- helpers existing (keep) --------------------
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const res = reader.result;
            const parts = res.split(',');
            resolve(parts.length > 1 ? parts[1] : parts[0]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function saveMediaBase64(key, file) {
    if (!file) {
        showDebugMessage("ℹ Tidak ada file untuk key: " + key);
        return;
    }
    try {
        const base64 = await fileToBase64(file);
        const mime = file.type || "application/octet-stream";
        db.run(
            `CREATE TABLE IF NOT EXISTS media_files (key TEXT PRIMARY KEY, mime TEXT, base64 TEXT);`
        );
        db.run(
            `INSERT OR REPLACE INTO media_files (key, mime, base64) VALUES (?,?,?)`,
            [key, mime, base64]
        );
        showDebugMessage("💾 Media disimpan: " + key);
    } catch (err) {
        showDebugMessage("❌ Gagal simpan media " + key + ": " + (err?.message || err), {level:"error"});
    }
}

// -------------------- saveAllMediaFromForm --------------------
async function saveAllMediaFromForm() {
    // mapping dari key DB -> id input form
    const map = {
        "hero_image": "adminHeroImage",
        "video_quran": "adminVideoQuran",
        "video_kajian": "adminVideoKajian",
        "video_khutbah": "adminVideoKhutbah",
        "audio": "adminAudio"
        // jika ada pdf uploader yang ingin disimpan ke media_files, tambahkan mis. "pdf": "adminPdf"
    };

    for (const key of Object.keys(map)) {
        try {
            const input = document.getElementById(map[key]);
            if (!input) {
                showDebugMessage("⚠ input tidak ditemukan: " + map[key]);
                continue;
            }
            const file = (input.files && input.files[0]) ? input.files[0] : null;
            if (file) {
                await saveMediaBase64(key, file);
            } else {
                showDebugMessage("ℹ Tidak ada file di input: " + map[key]);
            }
        } catch (e) {
            showDebugMessage("❌ saveAllMediaFromForm error key=" + key + " : " + (e?.message||e), {level:'error'});
        }
    }
}
// ==== perbaikan saveAdminSettings: simpan media dulu, lalu DB, lalu reload UI ====
async function saveAdminSettings() {
  const btn = document.getElementById('simpanadmin');
  if (btn) btn.disabled = true;
  showDebugMessage("⏳ ▶ Menyimpan pengaturan admin...", {level:'info', persist:false});
  try {
    if (!db) throw new Error("DB belum siap");

    // collect values
    const name = (document.getElementById('adminMasjidName')?.value || "").trim();
    const address = (document.getElementById('adminMasjidAddress')?.value || "").trim();

    const prayerTimes = {
      subuh: document.getElementById('adminSubuh')?.value || '',
      dzuhur: document.getElementById('adminDzuhur')?.value || '',
      ashar: document.getElementById('adminAshar')?.value || '',
      maghrib: document.getElementById('adminMaghrib')?.value || '',
      isya: document.getElementById('adminIsya')?.value || '',
      imsak: document.getElementById('adminImsak')?.value || '',
      syuruq: document.getElementById('adminSyuruq')?.value || ''
    };

    const iqomah = {
      subuh: parseInt(document.getElementById('delaySubuh')?.value) || 0,
      dzuhur: parseInt(document.getElementById('delayDzuhur')?.value) || 0,
      ashar: parseInt(document.getElementById('delayAshar')?.value) || 0,
      maghrib: parseInt(document.getElementById('delayMaghrib')?.value) || 0,
      isya: parseInt(document.getElementById('delayIsya')?.value) || 0
    };

    const quoteText = document.getElementById('adminQuoteText')?.value || '';
    const quoteSource = document.getElementById('adminQuoteSource')?.value || '';
    const runningText = document.getElementById('adminRunningText')?.value || '';

    // 0) simpan media dulu (jika ada)
    await saveAllMediaFromForm();

    // 1) simpan masjid_info
    db.run(`CREATE TABLE IF NOT EXISTS masjid_info (id INTEGER PRIMARY KEY, name TEXT, address TEXT);`);
    db.run(`INSERT OR REPLACE INTO masjid_info (id, name, address) VALUES (1, ?, ?)`, [name, address]);

    // 2) prayer_times
    db.run(`CREATE TABLE IF NOT EXISTS prayer_times (
      id INTEGER PRIMARY KEY,
      subuh TEXT, dzuhur TEXT, ashar TEXT, maghrib TEXT, isya TEXT, imsak TEXT, syuruq TEXT
    );`);
    db.run(`INSERT OR REPLACE INTO prayer_times (id, subuh, dzuhur, ashar, maghrib, isya, imsak, syuruq)
      VALUES (1, ?,?,?,?,?,?,?)`,
      [prayerTimes.subuh, prayerTimes.dzuhur, prayerTimes.ashar, prayerTimes.maghrib, prayerTimes.isya, prayerTimes.imsak, prayerTimes.syuruq]
    );

    // 3) iqomah delays
    db.run(`CREATE TABLE IF NOT EXISTS iqomah_delays (id INTEGER PRIMARY KEY, subuh INTEGER, dzuhur INTEGER, ashar INTEGER, maghrib INTEGER, isya INTEGER)`);
    db.run(`INSERT OR REPLACE INTO iqomah_delays (id, subuh, dzuhur, ashar, maghrib, isya) VALUES (1,?,?,?,?,?)`,
      [iqomah.subuh, iqomah.dzuhur, iqomah.ashar, iqomah.maghrib, iqomah.isya]);

    // 4) quote & running text
    db.run(`CREATE TABLE IF NOT EXISTS quote (id INTEGER PRIMARY KEY, text TEXT, source TEXT)`);
    db.run(`INSERT OR REPLACE INTO quote (id, text, source) VALUES (1, ?, ?)`, [quoteText, quoteSource]);

    db.run(`CREATE TABLE IF NOT EXISTS running_text (id INTEGER PRIMARY KEY, text TEXT)`);
    db.run(`INSERT OR REPLACE INTO running_text (id, text) VALUES (1, ?)`, [runningText]);

    // 5) update in-memory settings
    window.settings = window.settings || {};
    window.settings.masjidName = name;
    window.settings.masjidAddress = address;
    window.settings.prayerTimes = prayerTimes;
    window.settings.iqomahDelays = iqomah;
    window.settings.quote = {text: quoteText, source: quoteSource};
    window.settings.runningText = runningText;

    // 6) persist DB to IndexedDB
    await saveDatabaseToIndexedDB();

    // 7) reload UI + admin form from DB (ensure UI reads from DB)
    if (typeof loadSettings === 'function') await loadSettings();
    if (typeof loadAdminFormFromDB === 'function') await loadAdminFormFromDB();

    // 8) info + toggle admin panel (after UI updated)
    showDebugMessage("✅ Pengaturan admin berhasil disimpan", {level:'info', persist:true});
    setTimeout(() => { if (typeof toggleAdmin === 'function') toggleAdmin(); }, 150);

  } catch (err) {
    console.error('saveAdminSettings error', err);
    showDebugMessage("❌ Gagal menyimpan pengaturan admin: " + (err?.message||err), {level:'error', persist:true});
    alert('❌ Gagal menyimpan: ' + (err && err.message ? err.message : err));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function saveFileToIndexedDB(key, uint8) {
  return new Promise((resolve) => {
    const req = indexedDB.open("AppFilesDB", 1);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };

    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(uint8, key);

      tx.oncomplete = () => {
        showDebugMessage("💾 File disimpan: " + key);
        resolve();
      };
    };
  });
}

// Fungsi untuk inisialisasi database
async function initDatabase() {
    showDebugMessage("📦 Memuat SQL.js...");

    try {
        // 1. Load WASM + SQL.js
        SQL = await initSqlJs({
            locateFile: file => "file:///android_asset/" + file
        });

        // create temporary DB instance (empty) — will be replaced if restore exists
        db = new SQL.Database();
        showDebugMessage("🟩 SQL.js siap, mencoba restore dari IndexedDB...");

        // 2. Try to restore from IndexedDB; loadDatabaseFromIndexedDB returns true jika berhasil restore
        const restored = await loadDatabaseFromIndexedDB(); // returns boolean

        if (restored) {
            showDebugMessage("✅ DB dipulihkan dari IndexedDB — lanjutkan migrasi/check");
        } else {
            showDebugMessage("⚠ Tidak ada DB di IndexedDB — akan dibuat DB baru jika perlu");
        }

        // 3. Pastikan tabel tersedia (migrasi / create if not exists)
        db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY,
                mosque_name TEXT DEFAULT '',
                hero_image TEXT DEFAULT NULL,
                video_quran TEXT DEFAULT NULL,
                video_kajian TEXT DEFAULT NULL,
                last_update INTEGER DEFAULT 0
            );
        `);

        // 4. Cek apakah sudah ada data awal (table exists dan row)
        let check = [];
        try {
            check = db.exec("SELECT COUNT(*) AS total FROM settings");
        } catch (e) {
            // jika query gagal, anggap belum ada data
            check = [];
        }

        if (check.length === 0 || check[0].values.length === 0 || check[0].values[0][0] === 0) {
            // hanya buat row default jika memang belum ada
            db.run(`
                INSERT OR REPLACE INTO settings (id, mosque_name, last_update)
                VALUES (1, '', strftime('%s','now'));
            `);

            showDebugMessage("⚡ DB dibuat pertama kali (row settings)");
            // simpan hasil baru ke IndexedDB
            await saveDatabaseToIndexedDB();
        }

        // 5. Cek kolom apakah perlu migrasi
        try {
            const pi = db.exec("PRAGMA table_info(settings)");
            if (pi && pi.length) {
                const columns = pi[0].values.map(c => c[1]);
                if (!columns.includes("hero_image")) db.run(`ALTER TABLE settings ADD COLUMN hero_image TEXT DEFAULT NULL;`);
                if (!columns.includes("video_quran")) db.run(`ALTER TABLE settings ADD COLUMN video_quran TEXT DEFAULT NULL;`);
                if (!columns.includes("video_kajian")) db.run(`ALTER TABLE settings ADD COLUMN video_kajian TEXT DEFAULT NULL;`);
                if (!columns.includes("last_update")) db.run(`ALTER TABLE settings ADD COLUMN last_update INTEGER DEFAULT 0;`);
            }
        } catch (e) {
            showDebugMessage("⚠ Migrasi check failed: " + (e?.message || e));
        }

        // 6. Simpan setelah migrasi (aman)
        await saveDatabaseToIndexedDB();

        showDebugMessage("🟩 initDatabase selesai");

    } catch (e) {
        showDebugMessage("❌ initDatabase ERROR: " + (e && e.message ? e.message : e));
    }
}

// Fungsi untuk cek apakah tabel ada
function tableExists(name) {
  try {
    if (!db) return false;
    const r = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`);
    return r && r.length;
  } catch(e) { return false; }
}

async function loadSettings() {
  try {
    window.settings = window.settings || {};

    // MASJID INFO (try/catch safe queries)
    try {
      const r = db.exec("SELECT name, address FROM masjid_info WHERE id = 1");
      if (r.length && r[0].values.length) {
        const name = r[0].values[0][0] || "";
        const address = r[0].values[0][1] || "";
        window.settings.masjidName = name;
        window.settings.masjidAddress = address;
        const eln = document.getElementById('masjidName'); if (eln) eln.textContent = name;
        const ela = document.getElementById('masjidAddress'); if (ela) ela.textContent = address;
      }
    } catch(e){ /* table may not exist - ignore */ }

    // PRAYER TIMES
    try {
      const p = db.exec("SELECT subuh, dzuhur, ashar, maghrib, isya, imsak, syuruq FROM prayer_times WHERE id = 1");
      if (p.length && p[0].values.length) {
        const t = p[0].values[0];
        window.settings.prayerTimes = { subuh:t[0], dzuhur:t[1], ashar:t[2], maghrib:t[3], isya:t[4], imsak:t[5], syuruq:t[6] };
      }
    } catch(e){ /* no table */ }

    // IQOMAH
    try {
      const d = db.exec("SELECT subuh, dzuhur, ashar, maghrib, isya FROM iqomah_delays WHERE id = 1");
      if (d.length && d[0].values.length) {
        const x = d[0].values[0];
        window.settings.iqomahDelays = { subuh:x[0], dzuhur:x[1], ashar:x[2], maghrib:x[3], isya:x[4] };
      }
    } catch(e){}

    // QUOTE
    try {
      const q = db.exec("SELECT text, source FROM quote WHERE id = 1");
      if (q.length && q[0].values.length) {
        window.settings.quote = { text:q[0].values[0][0], source:q[0].values[0][1] };
        const qEl = document.getElementById('quoteText'); if (qEl) qEl.textContent = window.settings.quote.text;
        const sEl = document.getElementById('quoteSource'); if (sEl) sEl.textContent = window.settings.quote.source;
      }
    } catch(e){}

    // RUNNING TEXT
    try {
      const rt = db.exec("SELECT text FROM running_text WHERE id = 1");
      if (rt.length && rt[0].values.length) {
        window.settings.runningText = rt[0].values[0][0];
        // you have several running text areas
        const runningIds = ['runningText1','runningText2','runningText3','runningText4','runningText5','runningText6','runningText7'];
        runningIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = window.settings.runningText;
        });
      }
    } catch(e){}

    // Render prayer times into all containers you have in DOM
    const prayerContainers = [
      'prayerTimes', 'prayerTimesAyat', 'prayerTimesVideoQuran', 'prayerTimesKas',
      'prayerTimesJadwalKajian', 'prayerTimesVideoKajian', 'prayerTimesKhutbah'
    ];
    renderPrayerTimes(window.settings.prayerTimes || {}, prayerContainers);

    // LOAD MEDIA -> ensure keys match what you save
    loadMediaToUI("hero_image", "heroImage");
    loadMediaToUI("video_quran", "videoQuran");
    loadMediaToUI("video_kajian", "videoKajian");
    loadMediaToUI("video_khutbah", "videoKhutbah");
    loadMediaToUI("audio", "audioPlayer");
    // for any pdf viewers/slideshows you store as media, call loadMediaToUI with correct key & element

    showDebugMessage("▶ loadSettings selesai", {level:'info', persist:false});
  } catch (e) {
    showDebugMessage("❌ loadSettings ERROR: " + (e?.message || e), {level:'error', persist:true});
  }
}
// -------------------- loadMediaToUI (robust) --------------------
function base64ToBlob(base64, mime) {
    try {
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        return new Blob([new Uint8Array(byteNumbers)], { type: mime });
    } catch (e) {
        showDebugMessage("❌ base64ToBlob error: " + (e?.message||e), {level:"error"});
        return null;
    }
}

function loadMediaToUI(key, elementId) {
    try {
        if (!db) return;
        const r = db.exec(`SELECT mime, base64 FROM media_files WHERE key='${key}'`);
        if (!(r.length && r[0].values.length)) {
            // no media stored
            return;
        }
        const mime = r[0].values[0][0];
        const base64 = r[0].values[0][1];
        const blob = base64ToBlob(base64, mime);
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const el = document.getElementById(elementId);
        if (!el) return;

        const tag = el.tagName.toLowerCase();
        if (tag === 'img') {
            el.src = url;
        } else if (tag === 'video') {
            // set source child if exists
            const source = el.querySelector('source');
            if (source) {
                source.src = url;
            } else {
                el.src = url;
            }
            el.load();
        } else if (tag === 'audio') {
            const source = el.querySelector('source');
            if (source) source.src = url; else el.src = url;
            el.load();
        } else if (tag === 'iframe' || tag === 'embed' || tag === 'object') {
            el.src = url;
        } else {
            // fallback: treat as background image for div
            el.style.backgroundImage = `url(${url})`;
            el.style.backgroundSize = "cover";
            el.style.backgroundPosition = "center";
        }
        showDebugMessage("▶ Media loaded: " + key);
    } catch (e) {
        showDebugMessage("❌ Gagal load media " + key + ": " + (e?.message||e), {level:'error'});
    }
}

// -------------------- helper renderPrayerTimes --------------------
function renderPrayerTimes(prayerTimesObj, containerIds) {
    // prayerTimesObj keys: subuh,dzuhur,ashar,maghrib,isya,imsak,syuruq
    const times = [
        {key:'imsak', label:'Imsak'},
        {key:'subuh', label:'Subuh'},
        {key:'syuruq', label:'Syuruq'},
        {key:'dzuhur', label:'Dzuhur'},
        {key:'ashar', label:'Ashar'},
        {key:'maghrib', label:'Maghrib'},
        {key:'isya', label:'Isya'}
    ];
    const html = times.map(t => {
        const v = (prayerTimesObj && prayerTimesObj[t.key]) ? prayerTimesObj[t.key] : '--:--';
        return `<div class="prayer-card"><div class="prayer-name">${t.label}</div><div class="prayer-time">${v}</div></div>`;
    }).join('');
    for (const id of containerIds) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }
}
// Fungsi untuk menyimpan database ke IndexedDB
async function saveDatabaseToIndexedDB() {
    return new Promise((resolve, reject) => {
        try {
            if (!db) {
                showDebugMessage("⚠ db belum siap saat saveDatabaseToIndexedDB");
                return resolve();
            }

            const binary = db.export(); // ArrayBuffer-like
            const uint8 = new Uint8Array(binary);

            const req = indexedDB.open("AppDatabase", 1);

            req.onupgradeneeded = e => {
                const idb = e.target.result;
                if (!idb.objectStoreNames.contains("sqlite")) {
                    idb.createObjectStore("sqlite");
                }
            };

            req.onsuccess = e => {
                const idb = e.target.result;
                const tx = idb.transaction("sqlite", "readwrite");
                tx.objectStore("sqlite").put(uint8, "main");

                tx.oncomplete = () => {
                    showDebugMessage("💾 SQLite tersimpan ke IndexedDB (Uint8Array)");
                    resolve();
                };

                tx.onerror = () => {
                    showDebugMessage("❌ IndexedDB tx error saat menyimpan SQLite");
                    reject(tx.error);
                };
            };

            req.onerror = e => {
                showDebugMessage("❌ IndexedDB request error: " + (e?.target?.error || e));
                reject(e);
            };

        } catch (err) {
            showDebugMessage("❌ saveDatabaseToIndexedDB exception: " + (err?.message || err));
            reject(err);
        }
    });
}

// Fungsi untuk memuat database dari IndexedDB
async function loadDatabaseFromIndexedDB() {
    return new Promise(resolve => {
        const req = indexedDB.open("AppDatabase", 1);

        req.onupgradeneeded = e => {
            const idb = e.target.result;
            if (!idb.objectStoreNames.contains("sqlite")) {
                idb.createObjectStore("sqlite");
            }
        };

        req.onsuccess = e => {
            const idb = e.target.result;
            const tx = idb.transaction("sqlite", "readonly");
            const store = tx.objectStore("sqlite");
            const getReq = store.get("main");

            getReq.onsuccess = async () => {
                const data = getReq.result;

                if (!data) {
                    showDebugMessage("⚠ DB belum ada di IndexedDB (first run)");
                    return resolve(false);
                }

                let uint8;
                try {
                    if (data instanceof Uint8Array) {
                        uint8 = data;
                    } else if (data instanceof ArrayBuffer) {
                        uint8 = new Uint8Array(data);
                    } else if (data && typeof data === 'object' && ('buffer' in data) && data.buffer instanceof ArrayBuffer) {
                        // sometimes serialized TypedArray-like object — handle defensively
                        uint8 = new Uint8Array(data.buffer);
                    } else {
                        // last resort: if blob-like (won't usually happen on Android), try arrayBuffer
                        if (typeof data.arrayBuffer === 'function') {
                            const buf = await data.arrayBuffer();
                            uint8 = new Uint8Array(buf);
                        } else {
                            showDebugMessage("❌ Format DB tidak diketahui saat load");
                            return resolve(false);
                        }
                    }
                } catch (err) {
                    showDebugMessage("❌ Error parsing saved DB: " + (err?.message || err));
                    return resolve(false);
                }

                try {
                    // replace current db instance with restored DB (compatible with SQL.js old versions)
                    db = new SQL.Database(uint8);
                    showDebugMessage("📥 Database SQLite berhasil dimuat dari IndexedDB");
                    return resolve(true);
                } catch (err) {
                    showDebugMessage("❌ Gagal buat SQL.Database dari data: " + (err?.message || err));
                    return resolve(false);
                }
            };

            getReq.onerror = () => {
                showDebugMessage("❌ Gagal membaca DB dari IndexedDB");
                resolve(false);
            };
        };

        req.onerror = () => {
            showDebugMessage("❌ IndexedDB gagal dibuka");
            resolve(false);
        };
    });
}


/*function showDebugMessage(msg) {
    // Buat debug box jika belum ada
    let box = document.getElementById("debugBox");
    if (!box) {
        box = document.createElement("div");
        box.id = "debugBox";
        box.style.position = "fixed";
        box.style.bottom = "10px";
        box.style.right = "10px";
        box.style.width = "350px";
        box.style.height = "200px";
        box.style.background = "rgba(0,0,0,0.85)";
        box.style.color = "#00FFEA";
        box.style.fontSize = "13px";
        box.style.padding = "10px";
        box.style.borderRadius = "8px";
        box.style.zIndex = "999999";
        box.style.overflowY = "auto";
        box.style.fontFamily = "monospace";
        document.body.appendChild(box);
    }

    // Tambahkan teks baru di bawah (tidak menimpa yang lama)
    let time = new Date().toLocaleTimeString();
    box.innerHTML += `[${time}] ${msg}<br>`;

    // Buat tombol clear log hanya sekali
    if (!document.getElementById("clearDebugBtn")) {
        let btn = document.createElement("button");
        btn.id = "clearDebugBtn";
        btn.innerText = "Hapus Log";
        btn.style.position = "fixed";
        btn.style.bottom = "220px"; // tepat di atas box
        btn.style.right = "10px";
        btn.style.padding = "6px 12px";
        btn.style.border = "none";
        btn.style.background = "#ff0048";
        btn.style.color = "white";
        btn.style.borderRadius = "6px";
        btn.style.cursor = "pointer";
        btn.style.zIndex = "999999";
        btn.onclick = () => {
            box.innerHTML = "";  // hapus isi log, box tetap ada
            showDebugMessage("Log sudah dibersihkan"); // tampilkan 1 pesan setelah clear
        };
        document.body.appendChild(btn);
    }
}
*/

//////////////////////////////////
// Fungsi toggle yang sudah ada, dimodifikasi agar independen (tidak menutup yang lain)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    // Jika dibuka, set fokus awal
    if (sidebar.classList.contains('active')) {
        currentIndex = 0;
        setFocus(currentIndex);
    }
}

function toggletema() {
    const sidebar1 = document.getElementById('sidebar1');
    sidebar1.classList.toggle('active');
    // Jika dibuka, set fokus awal
    if (sidebar1.classList.contains('active')) {
        currentIndex1 = 0;
        setFocus1(currentIndex1);
    }
}

async function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    const overlay = document.getElementById('adminOverlay');

    // === Jika panel sedang aktif → tutup ===
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        overlay.classList.remove('active');
        return;
    }

    // Pastikan database sudah load
    if (!window.settings) {
        showDebugMessage("⚠ Settings belum siap. Menunggu load dari database...");
        return;
    }

    // Ambil helper get()
    const get = id => document.getElementById(id);

    // ==== MASJID INFO ====
    get('adminMasjidName').value = settings.masjidName ?? "";
    get('adminMasjidAddress').value = settings.masjidAddress ?? "";

    // ==== PRAYER TIMES ====
    const p = settings.prayerTimes ?? {};
    get('adminSubuh').value   = p.subuh   ?? "";
    get('adminSyuruq').value  = p.syuruq  ?? "";
    get('adminImsak').value   = p.imsak   ?? "";
    get('adminDzuhur').value  = p.dzuhur  ?? "";
    get('adminAshar').value   = p.ashar   ?? "";
    get('adminMaghrib').value = p.maghrib ?? "";
    get('adminIsya').value    = p.isya    ?? "";

    // ==== QUOTE ====
    const q = settings.quote ?? {};
    get('adminQuoteText').value = (q.text ?? "").replace(/"/g, "");
    get('adminQuoteSource').value = q.source ?? "";

    // ==== RUNNING TEXT ====
    get('adminRunningText').value = settings.runningText ?? "";

    // ==== VIDEO / MEDIA (jika ada) ====
    const mv = settings.videos ?? {};
    if (mv.quran) get('adminVideoQuranInfo').textContent = mv.quran.filename ?? "";
    if (mv.kajian) get('adminVideoKajianInfo').textContent = mv.kajian.filename ?? "";

    // ==== PDF / KAJIAN ====
    const kj = settings.kajian ?? {};
    if (kj.file) get('adminKajianInfo').textContent = kj.file ?? "";

    // ==== BUKA PANEL ====
    panel.classList.add('active');
    overlay.classList.add('active');

    // ==== FOCUS PERTAMA ====
    try {
        adminIndex = 0;
        setAdminFocus(adminIndex);
    } catch (e) {
        console.warn("setAdminFocus error diabaikan:", e);
    }
}



// Kode JavaScript lainnya tetap sama
const menu = document.getElementById('menu');
const items = menu.querySelectorAll('li');
let currentIndex = 0;

function setFocus(index) {
  items.forEach((item, i) => {
    item.tabIndex = (i === index) ? 0 : -1;
    if (i === index) {
      item.classList.add('active'); // beri tanda visual
      item.focus();
    } else {
      item.classList.remove('active');
    }
  });
}

function executeMenu(index) {
  //alert(`Menu item ${index + 1} dipilih`);
  // Tambahkan logika aksi sesuai menu di sini
  const item = items[index];
  // contoh: "showContent('utama')" -> ambil parameter di dalam tanda kutip
  const onclickText = item.getAttribute('onclick');
  // ekstrak nilai parameter dari string onclickText
  const match = onclickText.match(/showContent\('(.+)'\)/);
  if (match && match[1]) {
    showContent(match[1]);
  }
}

const menu1 = document.getElementById('menu1');
const items1 = menu1.querySelectorAll('li');
let currentIndex1 = 0;
function setFocus1(index) {
  items1.forEach((item1, i) => {
    item1.tabIndex = (i === index) ? 0 : -1;
    if (i === index) {
      item1.classList.add('active'); // beri tanda visual
      item1.focus();
    } else {
      item1.classList.remove('active');
    }
  });
}

function executeMenu1(index) {
  //alert(`Menu item ${index + 1} dipilih`);
  // Tambahkan logika aksi sesuai menu di sini
  // if (index === 0) {
     //   toggletema();
   // } else {
  const item = items1[index];
  // contoh: "showContent('utama')" -> ambil parameter di dalam tanda kutip
  const onclickText = item.getAttribute('onclick');
  // ekstrak nilai parameter dari string onclickText
  const match = onclickText.match(/changeTheme\('(.+)'\)/);
  if (match && match[1]) {
    changeTheme(match[1]);
  }
    //}
}

const adminPanel = document.getElementById('adminPanel');
const focusableSelectors = 'input,textarea,button';
const focusableElements = adminPanel.querySelectorAll(focusableSelectors);

let adminIndex = 0;

function setAdminFocus(index) {
  focusableElements.forEach((el, i) => {
    if (i === index) {
      el.focus();
      el.classList.add('focus-highlight');
    } else {
      el.classList.remove('focus-highlight');
    }
  });
}

function executeAdminAction(index) {
  const el = focusableElements[index];
  if (el.tagName.toLowerCase() === 'button') {
    el.click();
  } else if (el.type === 'time') {
    // Trigger native time picker by clicking input
    el.click();
  } else if (el.type === 'file') {
    // Trigger file chooser dialog
    el.click();
  } else if (el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea') {
    // Tampilkan keyboard virtual jika ada (tergantung perangkat)
    el.focus();
    // Jika perlu, bisa trigger event tertentu untuk keyboard virtual
  }
}

// Inisialisasi fokus awal (hanya jika menu sudah terbuka, tapi di sini diasumsikan tertutup awal)
setFocus(currentIndex);
setFocus1(currentIndex1);
if (adminPanel.classList.contains('active')) {
  setAdminFocus(adminIndex);
}

// Event listener utama untuk menangani semua keydown tanpa saling mengganggu
document.addEventListener('keydown', function(event) {
  console.log('Key pressed:', event.key, 'KeyCode:', event.keyCode); // Tambahkan log untuk debug
  // Prioritas: AdminPanel > Menu1 > Menu Utama > Global Keys
  // Jika adminPanel aktif, tangani navigasi admin
  if (adminPanel.classList.contains('active')) {
    console.log('AdminPanel active, handling key');
    if (event.key === 'ArrowDown' || event.keyCode === 40) {
      adminIndex = (adminIndex + 1) % focusableElements.length;
      setAdminFocus(adminIndex);
      event.preventDefault();
    } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
      adminIndex = (adminIndex - 1 + focusableElements.length) % focusableElements.length;
      setAdminFocus(adminIndex);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === 'OK' || event.keyCode === 13) {
      executeAdminAction(adminIndex);
      event.preventDefault();
    }
    return; // Jangan lanjut ke kondisi lain jika admin aktif
  }
  
  // Jika menu1 aktif, tangani navigasi menu1
  if (document.getElementById('sidebar1').classList.contains('active')) {
    console.log('Menu1 active, handling key');
    if (event.key === 'ArrowDown' || event.keyCode === 40) {
      currentIndex1 = (currentIndex1 + 1) % items1.length;
      setFocus1(currentIndex1);
      event.preventDefault();
    } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
      currentIndex1 = (currentIndex1 - 1 + items1.length) % items1.length;
      setFocus1(currentIndex1);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === 'OK' || event.keyCode === 13) {
      executeMenu1(currentIndex1);
      event.preventDefault();
    }else if (event.key === 'ArrowLeft' || event.keyCode === 37) {
      toggletema(); 
      event.preventDefault();
    }
    return; // Jangan lanjut ke kondisi lain jika menu1 aktif
  }
  
  // Jika menu utama aktif, tangani navigasi menu utama
  if (document.getElementById('sidebar').classList.contains('active')) {
    console.log('Menu utama active, handling key');
    if (event.key === 'ArrowDown' || event.keyCode === 40) {
      currentIndex = (currentIndex + 1) % items.length;
      setFocus(currentIndex);
      event.preventDefault();
    } else if (event.key === 'ArrowUp' || event.keyCode === 38) {
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      setFocus(currentIndex);
      event.preventDefault();
    } else if (event.key === 'Enter' || event.key === 'OK' || event.keyCode === 13) {
      executeMenu(currentIndex);
      event.preventDefault();
    }else if (event.key === 'ArrowLeft' || event.keyCode === 37) {
      toggleSidebar(); 
      event.preventDefault();
    }else if (event.key === 'ArrowRight' || event.keyCode === 39) {  // Tambahan: ArrowRight juga memanggil toggleSidebar
      toggleSidebar(); 
      event.preventDefault();
    }
  }else if(document.getElementById('kas').classList.contains('active')) {
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
    toggleKasForm(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
    }
  }else if(document.getElementById('jadwal-kajian').classList.contains('active')) {
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
    toggleJadwalForm(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
    }
  }
  
  // Global keys (selalu aktif, tidak tergantung menu)
 /* if (event.key === 'ArrowLeft' || event.keyCode === 37) {
    toggleSidebar(); // Panggil fungsi menu overlay saat anak panah kiri ditekan
    event.preventDefault();
  } else if (event.key === 'ArrowRight' || event.keyCode === 39) {
    toggleAdmin(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
  } */
  
  // Jika tidak ada menu aktif, gunakan ArrowUp untuk membuka menu1 (seperti dalam kode asli)
  if(document.getElementById('ayat').classList.contains('active')) {
      //alert("ayat");
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
    toggleAyatForm(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
    }else if (event.key === 'ArrowLeft' || event.keyCode === 37) {
    toggleSidebar(); // Panggil fungsi menu overlay saat anak panah kiri ditekan
    event.preventDefault();
             }
  }else if(document.getElementById('kas').classList.contains('active')) {
      //alert("ayat");
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
    toggleKasForm(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
    }else if (event.key === 'ArrowLeft' || event.keyCode === 37) {
    toggleSidebar(); // Panggil fungsi menu overlay saat anak panah kiri ditekan
    event.preventDefault();
             }
  }else if(document.getElementById('jadwal-kajian').classList.contains('active')) {
      //alert("ayat");
      if (event.key === 'ArrowDown' || event.keyCode === 40) {
    toggleJadwalForm(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
    }else if (event.key === 'ArrowLeft' || event.keyCode === 37) {
    toggleSidebar(); // Panggil fungsi menu overlay saat anak panah kiri ditekan
    event.preventDefault();
             }
  }else if (!document.getElementById('sidebar').classList.contains('active') && 
      !document.getElementById('sidebar1').classList.contains('active') && 
      !adminPanel.classList.contains('active')) { 
          console.log('No menu active, checking for ArrowUp to open menu1');
    if (event.key === 'ArrowUp' || event.keyCode === 38) {
      toggletema(); // Gunakan toggletema untuk membuka menu1
      event.preventDefault();
    } else if (event.key === 'ArrowDown' || event.keyCode === 40) {
    toggleAdmin(); // Panggil fungsi setting saat anak panah kanan ditekan
    event.preventDefault();
    }else if (event.key === 'ArrowLeft' || event.keyCode === 37) {
    toggleSidebar(); // Panggil fungsi menu overlay saat anak panah kiri ditekan
    event.preventDefault();
  }
  }
  
   const activeVideo = getActiveVideo();
            console.log('Active video:', activeVideo ? 'Ada' : 'Tidak ada'); // Debugging
            if (activeVideo) {
                console.log('Video sedang dimainkan, event aktif'); // Debugging
                if (isInOptionMenu) {
                    // Navigasi di menu option
                    switch (event.key) {
                        case 'ArrowRight':
                            activeSubIndex = (activeSubIndex + 1) % subOptions.length;
                            updateActiveTool();
                            event.preventDefault();
                            break;
                        case 'ArrowLeft':
                            // Kembali ke menu utama
                            isInOptionMenu = false;
                            updateActiveTool();
                            event.preventDefault();
                            break;
                        case 'Enter':
                            const subAction = subOptions[activeSubIndex];
                            executeSubOption(activeVideo, subAction);
                            event.preventDefault();
                            break;
                        case 'Escape':
                            // Escape juga kembali
                            isInOptionMenu = false;
                            updateActiveTool();
                            event.preventDefault();
                            break;
                    }
                } else {
                     // Navigasi menu utama
                    switch (event.key) {
                        case 'ArrowRight':
                            activeToolIndex = (activeToolIndex + 1) % tools.length;
                            updateActiveTool(); // Update indikator
                            event.preventDefault();
                            break;
                        case 'Enter':
                            const action = tools[activeToolIndex];
                            executeTool(activeVideo, action); // Eksekusi play jika fokus play/stop
                            event.preventDefault();
                            break;
                    }
                }
            } else {
                console.log('Video tidak dimainkan atau tidak ada, event tidak aktif'); // Debugging
                updateActiveTool(); // Pastikan overlay disembunyikan dengan animasi
            }
  
});

 function getActiveVideo() {
            const currentActiveSection = document.querySelector('.content-section.active');
            if (currentActiveSection) {
                if (currentActiveSection.id === 'video-quran') {
                    return document.getElementById('videoQuran');
                } else if (currentActiveSection.id === 'video-kajian') {
                    return document.getElementById('videoKajian');
                } else if (currentActiveSection.id === 'khutbah') {
                    return document.getElementById('videoKhutbah');
                }
            }
            return null;
        }
 function getActiveIndicator() {
            const currentActiveSection = document.querySelector('.content-section.active');
            if (currentActiveSection) {
                if (currentActiveSection.id === 'video-quran') {
                    return document.getElementById('toolIndicatorVideoQuran');
                } else if (currentActiveSection.id === 'video-kajian') {
                    return document.getElementById('toolIndicatorVideoKajian'); // Asumsikan ID serupa
                } else if (currentActiveSection.id === 'khutbah') {
                    return document.getElementById('toolIndicatorKhutbah'); // Asumsikan ID serupa
                }
            }
            return null;
        }
 function getActiveOptionMenu() {
            const currentActiveSection = document.querySelector('.content-section.active');
            if (currentActiveSection) {
                if (currentActiveSection.id === 'video-quran') {
                    return document.getElementById('optionMenuVideoQuran');
                } else if (currentActiveSection.id === 'video-kajian') {
                    return document.getElementById('optionMenuVideoKajian'); // Asumsikan ID serupa
                } else if (currentActiveSection.id === 'khutbah') {
                    return document.getElementById('optionMenuKhutbah'); // Asumsikan ID serupa
                }
            }
            return null;
        }
const tools = ['play', 'volume', 'fullscreen', 'option'];
// Variabel untuk melacak tool yang aktif (fokus internal)
 const subOptions = ['download', 'speed', 'pip'];
        // Variabel untuk melacak tool yang aktif (fokus internal)
        let activeToolIndex = 0;
        let activeSubIndex = 0; // Untuk sub-option
        let isInOptionMenu = false; // Flag apakah sedang di menu option
        
  function updateActiveTool() {
            const indicator = getActiveIndicator();
            const optionMenu = getActiveOptionMenu();
            const activeVideo = getActiveVideo();
            if (isInOptionMenu) {
                // Jika di menu option, update highlight sub-option
                if (optionMenu) {
                    const items = optionMenu.querySelectorAll('.option-item');
                    items.forEach((item, index) => {
                        if (index === activeSubIndex) {
                            item.classList.add('active');
                        } else {
                            item.classList.remove('active');
                        }
                    });
                    optionMenu.style.display = 'block';
                    optionMenu.classList.add('show');
                }
                if (indicator) {
                    indicator.classList.remove('show');
                    setTimeout(() => indicator.style.display = 'none', 300);
                }
            } else {
                // Menu utama
                if (indicator && activeVideo) {
                const toolName = tools[activeToolIndex];
                let displayName = '';
                let icon = '';
                switch (toolName) {
                  case 'play': 
                    displayName = 'Play/Stop'; 
                    icon = '▶️'; // Ikon play/stop (bisa diganti dengan simbol atau emoji lain jika diperlukan)
                    break;
                  case 'volume': 
                    displayName = 'Volume'; 
                    icon = '🔊'; // Ikon volume
                    break;
                  case 'fullscreen': 
                    displayName = 'Fullscreen'; 
                    icon = '⛶'; // Ikon fullscreen
                    break;
                  case 'option': 
                    displayName = 'Option'; 
                    icon = '⚙️'; // Ikon option
                    break;
                }
                // Menggunakan innerHTML untuk menampilkan teks, ikon, dan baris baru dengan "Next" serta ikon menu (hamburger menu ☰)
                indicator.innerHTML = ` ${displayName} ${icon}<hr> ⬅️ Menu, Next ➡️`;
                indicator.style.display = 'block';
                indicator.classList.add('show');
                console.log('Fokus pada tool:', toolName); // Debugging
            } else if (indicator) {
                    indicator.classList.remove('show');
                    setTimeout(() => indicator.style.display = 'none', 300);
                }
                if (optionMenu) {
                    optionMenu.classList.remove('show');
                    setTimeout(() => optionMenu.style.display = 'none', 300);
                }
            }
        }
// Fungsi untuk eksekusi tool berdasarkan fokus
 function executeTool(video, action) {
            console.log('Eksekusi tool:', action); // Debugging
             const fuleElement = document.querySelector('.fule'); // Ambil elemen .fule
             const optionMenuElement = document.querySelector('.tool-indicator');
            switch (action) {
                case 'play':
                    // Toggle play/stop, atau restart jika ended
                    if (video.ended) {
                        video.currentTime = 0;
                        video.play();
                    } else if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                    break;
                case 'volume':
                    // Toggle mute untuk volume (menggunakan controls bawaan)
                    video.muted = !video.muted;
                    break;
                case 'fullscreen':
                    // Toggle fullscreen untuk video element saja (bukan page)
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                             if (fuleElement) {
                                fuleElement.classList.remove('show');
                                setTimeout(() => {
                                    video.removeChild(fuleElement); // Hapus dari video
                                    document.body.appendChild(fuleElement); // Kembalikan ke body
                                    fuleElement.style.display = 'none';
                                }, 300);
                            }
                            if (optionMenuElement) {
                                optionMenuElement.classList.remove('show');
                                setTimeout(() => {
                                    video.removeChild(optionMenuElement); // Hapus dari video
                                    document.body.appendChild(optionMenuElement); // Kembalikan ke body
                                    optionMenuElement.style.display = 'none';
                                }, 300);
                            }
                    } else {
                        if (video.requestFullscreen) {
                            video.requestFullscreen();
                        } else if (video.webkitRequestFullscreen) {
                            video.webkitRequestFullscreen();
                        } else if (video.msRequestFullscreen) {
                            video.msRequestFullscreen();
                        } else {
                            console.log('Fullscreen tidak didukung browser ini'); // Debugging
                        }
                         if (fuleElement) {
                            document.body.removeChild(fuleElement); // Hapus dari body
                            video.appendChild(fuleElement); // Tambahkan ke video
                            fuleElement.style.display = 'block';
                            setTimeout(() => fuleElement.classList.add('show'), 10);
                        }
                        if (optionMenuElement) {
                            document.body.removeChild(optionMenuElement); // Hapus dari body
                            video.appendChild(optionMenuElement); // Tambahkan ke video
                            optionMenuElement.style.display = 'block';
                            setTimeout(() => optionMenuElement.classList.add('show'), 10);
                        }
                    }
                     break;
                case 'option':
                    // Tampilkan menu option
                    isInOptionMenu = true;
                    activeSubIndex = 0; // Reset ke sub-option pertama
                    updateActiveTool();
                    break;
            }
        }
        
  document.addEventListener('fullscreenchange', () => {
    const fuleElement = document.querySelector('.fule');
    const optionMenuElement = document.querySelector('.tool-indicator');
    const video = document.querySelector('video'); // Asumsikan video adalah elemen video utama
    if (document.fullscreenElement) {
        // Masuk fullscreen: Pindahkan elemen ke video
        if (fuleElement) {
            document.body.removeChild(fuleElement);
            video.appendChild(fuleElement);
            fuleElement.style.display = 'block';
            setTimeout(() => fuleElement.classList.add('show'), 10);
        }
        if (optionMenuElement) {
            document.body.removeChild(optionMenuElement);
            video.appendChild(optionMenuElement);
            optionMenuElement.style.display = 'block';
            setTimeout(() => optionMenuElement.classList.add('show'), 10);
        }
    } else {
        // Keluar fullscreen: Kembalikan elemen ke body
        if (fuleElement) {
            video.removeChild(fuleElement);
            document.body.appendChild(fuleElement);
            fuleElement.classList.remove('show');
            setTimeout(() => fuleElement.style.display = 'none', 300);
        }
        if (optionMenuElement) {
            video.removeChild(optionMenuElement);
            document.body.appendChild(optionMenuElement);
            optionMenuElement.classList.remove('show');
            setTimeout(() => optionMenuElement.style.display = 'none', 300);
        }
    }
});

  document.getElementById("simpanadmin").addEventListener("click", async function () {
    const btn = document.getElementById('simpanadmin');
    btn.disabled = true;
    btn.innerText = "Menyimpan...";

    await saveAdminSettings(); // ← tunggu sampai selesai benar-benar tersimpan

    btn.disabled = false;
    btn.innerText = "Simpan";
});

 // Fungsi untuk eksekusi sub-option
        function executeSubOption(video, subAction) {
            console.log('Eksekusi sub-option:', subAction); // Debugging
            switch (subAction) {
                case 'download':
                    // Download video (asumsi src bisa didownload; jika tidak, placeholder)
                    const link = document.createElement('a');
                    link.href = video.src;
                    link.download = 'video.mp4'; // Nama file default
                    link.click();
                    break;
                case 'speed':
                    // Toggle playback speed (1x -> 1.5x -> 2x -> 1x)
                    const speeds = [1, 1.5, 2];
                    const currentSpeed = video.playbackRate;
                    const nextSpeedIndex = (speeds.indexOf(currentSpeed) + 1) % speeds.length;
                    video.playbackRate = speeds[nextSpeedIndex];
                    alert(`Playback speed: ${video.playbackRate}x`);
                    break;
                case 'pip':
                    // Toggle Picture in Picture
                    if (document.pictureInPictureElement) {
                        document.exitPictureInPicture();
                    } else if (video.requestPictureInPicture) {
                        video.requestPictureInPicture();
                    } else {
                        alert('Picture in Picture tidak didukung browser ini');
                    }
                    break;
            }
            // Kembali ke menu utama setelah eksekusi
            isInOptionMenu = false;
            updateActiveTool();
        }

const adminPanel1 = document.getElementById('ayat-ayat');
const focusableSelectors1 = 'input,button';
const focusableElements1 = adminPanel1.querySelectorAll(focusableSelectors1);
let adminIndex1 = 0;
function setayatFocus(index) {
  focusableElements1.forEach((el, i) => {
    if (i === index) {
      el.focus();
      el.classList.add('focus-highlight');
    } else {
      el.classList.remove('focus-highlight');
    }
  });
}
function executeayat(index) {
  const el = focusableElements1[index];
  if (el.tagName.toLowerCase() === 'button') {
    el.click();
  } else if (el.type === 'file') {
    // Trigger file chooser dialog
    el.click();
  } 
}

const adminPanel2 = document.getElementById('kas-kas');
const focusableSelectors2 = 'input,button';
const focusableElements2 = adminPanel2.querySelectorAll(focusableSelectors2);
let adminIndex2 = 0;
function setkasFocus(index) {
  focusableElements2.forEach((el, i) => {
    if (i === index) {
      el.focus();
      el.classList.add('focus-highlight');
    } else {
      el.classList.remove('focus-highlight');
    }
  });
}
function executekas(index) {
  const el = focusableElements2[index];
  if (el.tagName.toLowerCase() === 'button') {
    el.click();
  } else if (el.type === 'file') {
    // Trigger file chooser dialog
    el.click();
  } 
}

const adminPanel3 = document.getElementById('jadwal-jadwal');
const focusableSelectors3 = 'input,button';
const focusableElements3 = adminPanel3.querySelectorAll(focusableSelectors3);
let adminIndex3 = 0;
function setjadwalFocus(index) {
  focusableElements3.forEach((el, i) => {
    if (i === index) {
      el.focus();
      el.classList.add('focus-highlight');
    } else {
      el.classList.remove('focus-highlight');
    }
  });
}
function executejadwal(index) {
  const el = focusableElements3[index];
  if (el.tagName.toLowerCase() === 'button') {
    el.click();
  } else if (el.type === 'file') {
    // Trigger file chooser dialog
    el.click();
  } 
}

function handleAyatKeydown(event1) {
            // Asumsikan 'ArrowDown' untuk toggle (sesuai contoh "keydown")
            if (event1.key === 'ArrowDown') {
                event1.preventDefault(); // Cegah scroll default
                toggleKasForm();
            }else if (event1.key === 'ArrowRight') {
              adminIndex1 = (adminIndex1 - 1 + focusableElements1.length) % focusableElements1.length;
              setayatFocus(adminIndex1);
              event1.preventDefault();
             }else if (event1.key === 'Enter' || event1.key === 'OK' || event1.keyCode === 13) {
              executeayat(adminIndex1);
              event1.preventDefault();
            }
            // Jika ada keyword lain, tambahkan di sini, tapi sesuai permintaan hanya ini untuk ayat
    }
function handleKasKeydown(event2) {
            // Asumsikan 'ArrowDown' untuk toggle (sesuai contoh "keydown")
            if (event2.key === 'ArrowDown') {
                event2.preventDefault(); // Cegah scroll default
                toggleKasForm();
            }else if (event2.key === 'ArrowRight') {
              adminIndex2 = (adminIndex2 - 1 + focusableElements2.length) % focusableElements2.length;
              setkasFocus(adminIndex2);
              event2.preventDefault();
             }else if (event2.key === 'Enter' || event2.key === 'OK' || event2.keyCode === 13) {
              executekas(adminIndex2);
              event2.preventDefault();
            }  
            // Jika ada keyword lain, tambahkan di sini, tapi sesuai permintaan hanya ini untuk ayat
    }
function handleJadwalKeydown(event3) {
            // Asumsikan 'ArrowDown' untuk toggle (sesuai contoh "keydown")
            if (event3.key === 'ArrowDown') {
                event3.preventDefault(); // Cegah scroll default
                toggleJadwalForm();
            }else if (event3.key === 'ArrowRight') {
              adminIndex3 = (adminIndex3 - 1 + focusableElements3.length) % focusableElements3.length;
              setjadwalFocus(adminIndex3);
              event3.preventDefault();
             }else if (event3.key === 'Enter' || event3.key === 'OK' || event3.keyCode === 13) {
              executejadwal(adminIndex3);
              event3.preventDefault();
            }
            // Jika ada keyword lain, tambahkan di sini, tapi sesuai permintaan hanya ini untuk ayat
    }

// Fungsi utama untuk mengontrol guliran nama masjid ==================================================================
document.addEventListener('DOMContentLoaded', function() {
   const activeSection = localStorage.getItem('activeSection');
       if (activeSection) {
           console.log('Restoring active section:', activeSection);  // Debug log
           // Tambahkan delay kecil untuk memastikan DOM siap
           setTimeout(() => {
               try {
                   showContent(activeSection);  // Panggil showContent untuk mengaktifkan listener, form, dll.
                   console.log('showContent called successfully for:', activeSection);  // Debug log
               } catch (error) {
                   console.error('Error restoring section:', error);
               }
           }, 100);  // Delay 100ms
           localStorage.removeItem('activeSection');  // Hapus setelah digunakan agar tidak loop pada refresh manual
       } else {
           console.log('No active section to restore');
       }
    
    const masjidName = document.getElementById('masjidName'); // Elemen yang akan digulirkan
    let isScrolling = false; // Status awal: off (centered)

    // Fungsi untuk memulai guliran
    const myToggle = document.getElementById('myToggle');

    myToggle.addEventListener('change', function() {
      if (this.checked) {
        startScroll();
      } else {
        stopScroll();
      }
    });
    
    function startScroll() {
        masjidName.style.transform = 'translateX(0%)'; // Reset ke posisi awal (akan digeser animasi)
        masjidName.style.animation = 'marquee 10s linear infinite'; // Mulai animasi marquee
        masjidName.style.animationPlayState = 'running';
       // scrollSwitch.textContent = 'Off'; // Ubah teks tombol
       // scrollSwitch.classList.remove('off');
        isScrolling = true;
       // document.getElementById('myToggle').checked = true;
    }

    // Fungsi untuk menghentikan guliran dan kembali ke tengah
    function stopScroll() {
        masjidName.style.animation = 'none'; // Hentikan animasi
        masjidName.style.transform = 'translateX(0%)'; // Kembali ke posisi tengah (sesuai CSS awal)
       // scrollSwitch.textContent = 'On'; // Ubah teks tombol
       // scrollSwitch.classList.add('off');
        isScrolling = false;
        //document.getElementById('myToggle').checked = false;
    }

    // Inisialisasi: Mulai dengan off (teks di tengah)
    stopScroll();
    ///////////////////// ================================== ///////////////////
    const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.classList.contains('active') && target.classList.contains('content-section')) {
                            activeToolIndex = 0; // Reset fokus internal ke tool pertama (play/stop)
                            isInOptionMenu = false; // Reset menu
                            console.log('Fokus reset ke tool:', tools[activeToolIndex]); // Debugging
                            // Auto-play video saat section aktif
                            const video = getActiveVideo();
                            if (video) {
                                video.play().catch(e => console.log('Auto-play gagal:', e)); // Debugging jika auto-play blocked
                            }
                            updateActiveTool(); // Update indikator visual dengan animasi
                        }
                    }
                });
            });
            observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
});
///////////////////////////////////////////////////////////////////////////////////////////////////
// Fungsi untuk upload PDF dan simpan sebagai BLOB ke database
async function uploadPdf(formId, tableName, slideshowId) {
    const form = document.getElementById(formId);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Starting upload for form:', formId); // Debug log
        
        // Pastikan tabel ada sebelum query
        if (!tableExists(tableName)) {
            console.log('Table does not exist, creating:', tableName);
            db.run(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, pdf_data BLOB)`);
        }
        
        const fileInput = form.querySelector('input[type="file"]');
        const file = fileInput.files[0];
        
        if (!file) {
            console.error('No file selected');
            alert('Pilih file PDF terlebih dahulu!');
            return;
        }
        
        if (file.type !== 'application/pdf') {
            console.error('Invalid file type:', file.type);
            alert('File harus berupa PDF!');
            return;
        }
        
        // Validasi ukuran (maksimal 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            console.error('File too large:', file.size);
            alert('Ukuran file maksimal 10MB!');
            return;
        }
        
        try {
            console.log('Reading file as ArrayBuffer...');
            // Baca file sebagai ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            console.log('File read successfully, size:', uint8Array.length);
            
            console.log('Inserting into database...');
            // Simpan sebagai BLOB ke database
            db.run(`INSERT OR REPLACE INTO ${tableName} (id, pdf_data) VALUES (1, ?)`, [uint8Array]);
            console.log('Database insert successful');
            
            console.log('Saving to IndexedDB...');
            // Simpan ke IndexedDB untuk persistensi
            await saveDatabaseToIndexedDB();
            console.log('IndexedDB save successful');
            
            console.log('Loading slideshow...');
            // Load dan tampilkan slideshow
            await loadPdfSlideshow(uint8Array, slideshowId);
            console.log('Slideshow loaded successfully');
            
            alert('✔️ PDF Berhasil di upload!');
            const activeSection = document.querySelector('.content-section.active');
                if (activeSection) {
                    localStorage.setItem('activeSection', activeSection.id);
                    console.log('Active section saved:', activeSection.id);  // Debug log
                } else {
                    console.warn('No active section found, defaulting to ayat');
                    localStorage.setItem('activeSection', 'ayat');  // Fallback jika tidak ada
                }
    
            window.location.reload();
        } catch (error) {
            console.error('Error during upload:', error);
            alert('Gagal upload PDF. Periksa console untuk detail error.');
        }
    });
}
// Fungsi load PDF slideshow (LENGKAP)
/* async function loadPdfSlideshow(pdfBlob, slideshowId) {
    const slideshow = document.getElementById(slideshowId);
    slideshow.innerHTML = ''; // Clear previous content
    
    if (!pdfBlob) {
        slideshow.innerHTML = '<p>Tidak ada PDF untuk ditampilkan.</p>';
        return;
    }
    
    try {
        // Load PDF dari BLOB
        const pdf = await pdfjsLib.getDocument({ data: pdfBlob }).promise;
        const numPages = pdf.numPages;
        
        // Render setiap halaman sebagai canvas
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5; // Scale untuk kualitas
            const viewport = page.getViewport({ scale });
            
            // Buat canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render halaman ke canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            
            // Bungkus dalam div page untuk animasi
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.appendChild(canvas);
            slideshow.appendChild(pageDiv);
        }
        
        // Aktifkan animasi slideshow (slide effect seperti flipbook)
        slideshow.classList.add('slideshow-active');
        // Aktifkan animasi slideshow
       // Animasi: Geser halaman setiap 3 detik (seperti flipbook)
        let currentPage = 0;
        const pages = slideshow.querySelectorAll('.page');
        const totalPages = pages.length;
        
        // Fungsi untuk update posisi
        const updateSlides = () => {
            pages.forEach((page, index) => {
                const offset = index - currentPage;
                page.style.transform = `translateX(${offset * 100}%)`;
            });
        };
        
        // Inisialisasi posisi awal
        updateSlides();
        
        // Auto-slide
        setInterval(() => {
            currentPage = (currentPage + 1) % totalPages;
            updateSlides();
        }, 3000); // Ganti setiap 3 detik
         console.log('Slideshow loaded for:', slideshowId);
    } catch (error) {
        console.error('Error loading PDF slideshow:', error);
        slideshow.innerHTML = '<p>Gagal memuat PDF. Periksa file.</p>';
    }
} */
// Fungsi untuk inisialisasi flipbook saat PDF di-load
async function loadPdfSlideshow(pdfBlob, slideshowId) {
    const slideshow = document.getElementById(slideshowId);
    slideshow.innerHTML = ''; // Clear previous content
    
    if (!pdfBlob) {
        slideshow.innerHTML = '<p>Tidak ada PDF untuk ditampilkan.</p>';
        return;
    }
    
    try {
        // Load PDF dari BLOB
        const pdf = await pdfjsLib.getDocument({ data: pdfBlob }).promise;
        const numPages = pdf.numPages;
        
        // Render setiap halaman sebagai canvas
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5; // Scale untuk kualitas
            const viewport = page.getViewport({ scale });
            
            // Buat canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Render halaman ke canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            await page.render(renderContext).promise;
            
            // Bungkus dalam div page
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            pageDiv.appendChild(canvas);
            slideshow.appendChild(pageDiv);
        }
        
        // Tambahkan tombol fullscreen (arrowUp)
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.innerHTML = '↑'; // Ikon arrowUp
        fullscreenBtn.className = 'fullscreen-btn';
        fullscreenBtn.onclick = () => {
            if (slideshow.requestFullscreen) {
                slideshow.requestFullscreen();
            } else if (slideshow.webkitRequestFullscreen) { // Safari
                slideshow.webkitRequestFullscreen();
            } else if (slideshow.msRequestFullscreen) { // IE/Edge
                slideshow.msRequestFullscreen();
            } else {
                alert('Fullscreen tidak didukung di browser ini.');
            }
        };
        slideshow.appendChild(fullscreenBtn);
        
        // Tambahkan kontrol manual (Next/Prev)
        const controls = document.createElement('div');
        controls.className = 'controls';
        
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<button class="btn btn-save">Prev</button>';
        prevBtn.onclick = () => flipPage(-1);
        
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = 'Next';
        nextBtn.onclick = () => flipPage(1);
        
        controls.appendChild(prevBtn);
        controls.appendChild(nextBtn);
        slideshow.appendChild(controls);
        
        // Variabel untuk animasi flipbook
        let currentPage = 0;
        const pages = slideshow.querySelectorAll('.page');
        const totalPages = pages.length;
        
        // Fungsi untuk flip halaman dengan animasi
               // Fungsi untuk flip halaman dengan animasi
        const flipPage = (direction) => {
            const oldPage = pages[currentPage];
            const nextPageIndex = (currentPage + direction + totalPages) % totalPages;
            const newPage = pages[nextPageIndex];
            
            // Hapus kelas sebelumnya dari semua halaman
            pages.forEach(page => {
                page.classList.remove('active', 'flipping-out', 'flipping-in');
                page.style.opacity = '0'; // Pastikan semua tersembunyi dulu
                page.style.zIndex = '1';
            });
            
            // Set halaman lama untuk flip out
            oldPage.classList.add('flipping-out');
            oldPage.style.opacity = '1'; // Tampilkan sementara untuk animasi
            oldPage.style.zIndex = '5';
            
            // Setelah transisi flip out, sembunyikan halaman lama
            setTimeout(() => {
                oldPage.classList.remove('flipping-out');
                oldPage.style.opacity = '0';
                oldPage.style.zIndex = '1';
                
                // Sekarang tampilkan halaman baru dengan flip in
                newPage.classList.add('flipping-in');
                newPage.style.opacity = '1';
                newPage.style.zIndex = '10';
                
                // Setelah flip in selesai, set sebagai active
                setTimeout(() => {
                    newPage.classList.remove('flipping-in');
                    newPage.classList.add('active');
                    currentPage = nextPageIndex; // Update currentPage setelah animasi
                }, 400);
            }, 400);
            
            //console.log('Flipping from page', currentPage + 1, 'to', nextPageIndex + 1);
        };
        
        // Inisialisasi: Tampilkan halaman pertama
        pages[0].classList.add('active');
        pages[0].style.opacity = '1';
        pages[0].style.zIndex = '10';

        
        // Auto-flip setiap 3 detik
        setInterval(() => {
            flipPage(1);
        }, 7000);
        
       // console.log('Flipbook loaded for:', slideshowId);
    } catch (error) {
        console.error('Error loading PDF flipbook:', error);
        slideshow.innerHTML = '<p>Gagal memuat PDF. Periksa file.</p>';
    }
}
// Fungsi navigasi untuk fallback slideshow
let currentPageIndex = {}; // Track halaman per slideshow
function changePage(direction, slideshowId) {
    const slideshow = document.getElementById(slideshowId);
    const pages = slideshow.querySelectorAll('.page');
    if (pages.length === 0) return;
    
    if (!currentPageIndex[slideshowId]) currentPageIndex[slideshowId] = 0;
    currentPageIndex[slideshowId] += direction;
    if (currentPageIndex[slideshowId] < 0) currentPageIndex[slideshowId] = pages.length - 1;
    if (currentPageIndex[slideshowId] >= pages.length) currentPageIndex[slideshowId] = 0;
    
    pages.forEach((page, index) => {
        page.style.display = index === currentPageIndex[slideshowId] ? 'block' : 'none';
    });
}
