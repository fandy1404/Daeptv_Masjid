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



// Initialize on page load
window.onload = async function() {
    await initDatabase();
    updateClock();
    updateDates();
    updatePrayerTimes();
    updateCountdowns();
    
     const activeSection = localStorage.getItem('activeSection');
            if (activeSection === 'ayat') {
                localStorage.removeItem('activeSection'); // Hapus setelah digunakan
                showContent('ayat');
            }
    await uploadPdf('uploadAyatForm', 'ayat_pdf', 'ayatSlideshow');
    await uploadPdf('uploadKasForm', 'kas_pdf', 'kasSlideshow');
    await uploadPdf('uploadJadwalForm', 'jadwal_pdf', 'jadwalSlideshow');
    
    // Update every second
    setInterval(updateClock, 1000);
    setInterval(updateCountdowns, 1000);
    
    // Update dates every minute
    setInterval(updateDates, 60000);
    document.getElementById('delaySubuh').value = settings.iqomahDelays.subuh;
document.getElementById('delayDzuhur').value = settings.iqomahDelays.dzuhur;
document.getElementById('delayAshar').value = settings.iqomahDelays.ashar;
document.getElementById('delayMaghrib').value = settings.iqomahDelays.maghrib;
document.getElementById('delayIsya').value = settings.iqomahDelays.isya;

};

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
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = now.getSeconds();

    document.getElementById('h').textContent = hours;
    document.getElementById('m').textContent = minutes;

    // separator "hilang" tapi tidak memengaruhi layout
    const sep = document.getElementById('sep');
    sep.style.opacity = (seconds % 2 === 0) ? '1' : '0';
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



async function saveAdminSettings() {
    // Get values from form
    settings.masjidName = document.getElementById('adminMasjidName').value;
    settings.masjidAddress = document.getElementById('adminMasjidAddress').value;
    settings.prayerTimes.subuh = document.getElementById('adminSubuh').value;
    settings.prayerTimes.syuruq = document.getElementById('adminSyuruq').value;
    settings.prayerTimes.imsak = document.getElementById('adminImsak').value;
    settings.prayerTimes.dzuhur = document.getElementById('adminDzuhur').value;
    settings.prayerTimes.ashar = document.getElementById('adminAshar').value;
    settings.prayerTimes.maghrib = document.getElementById('adminMaghrib').value;
    settings.prayerTimes.isya = document.getElementById('adminIsya').value;
    settings.quote.text = '"' + document.getElementById('adminQuoteText').value + '"';
    settings.quote.source = document.getElementById('adminQuoteSource').value;
    settings.runningText = document.getElementById('adminRunningText').value;
    
    // Handle file uploads
    const heroImageFile = document.getElementById('adminHeroImage').files[0];
    if (heroImageFile) {
        settings.heroImage = new Uint8Array(await heroImageFile.arrayBuffer());
    }
    
    const videoQuranFile = document.getElementById('adminVideoQuran').files[0];
    if (videoQuranFile) {
        settings.videos.quran = new Uint8Array(await videoQuranFile.arrayBuffer());
    }
    
    const videoKajianFile = document.getElementById('adminVideoKajian').files[0];
    if (videoKajianFile) {
        settings.videos.kajian = new Uint8Array(await videoKajianFile.arrayBuffer());
    }
    
    const videoKhutbahFile = document.getElementById('adminVideoKhutbah').files[0];
    if (videoKhutbahFile) {
        settings.videos.khutbah = new Uint8Array(await videoKhutbahFile.arrayBuffer());
    }
    
    const audioFile = document.getElementById('adminAudio').files[0];
    if (audioFile) {
        settings.audio = new Uint8Array(await audioFile.arrayBuffer());
    }
    
    settings.iqomahDelays = {
    subuh: parseInt(document.getElementById('delaySubuh').value) || 10,
    dzuhur: parseInt(document.getElementById('delayDzuhur').value) || 1,
    ashar: parseInt(document.getElementById('delayAshar').value) || 10,
    maghrib: parseInt(document.getElementById('delayMaghrib').value) || 5,
    isya: parseInt(document.getElementById('delayIsya').value) || 2
};

    // Simpan ke database
    db.run("INSERT OR REPLACE INTO masjid_info (id, name, address) VALUES (1, ?, ?)", [settings.masjidName, settings.masjidAddress]);
     db.run("INSERT OR REPLACE INTO prayer_times (id, subuh, dzuhur, ashar, maghrib, isya, imsak, syuruq) VALUES (1, ?, ?, ?, ?, ?, ?, ?)", [settings.prayerTimes.subuh, settings.prayerTimes.dzuhur, settings.prayerTimes.ashar, settings.prayerTimes.maghrib, settings.prayerTimes.isya, settings.prayerTimes.imsak, settings.prayerTimes.syuruq]);
    db.run("INSERT OR REPLACE INTO iqomah_delays (id, subuh, dzuhur, ashar, maghrib, isya) VALUES (1, ?, ?, ?, ?, ?)", [settings.iqomahDelays.subuh, settings.iqomahDelays.dzuhur, settings.iqomahDelays.ashar, settings.iqomahDelays.maghrib, settings.iqomahDelays.isya]);
    db.run("INSERT OR REPLACE INTO quote (id, text, source) VALUES (1, ?, ?)", [settings.quote.text, settings.quote.source]);
    db.run("INSERT OR REPLACE INTO media (id, hero_image, video_quran, video_kajian, video_khutbah, audio_azan) VALUES (1, ?, ?, ?, ?, ?)", [settings.heroImage, settings.videos.quran, settings.videos.kajian, settings.videos.khutbah, settings.audio]);
    db.run("INSERT OR REPLACE INTO running_text (id, text) VALUES (1, ?)", [settings.runningText]);
    
    // Persist to IndexedDB
    await saveDatabaseToIndexedDB();
    
    // Update display
    await loadSettings();
    updatePrayerTimes();
    
    // Close admin panel
    toggleAdmin();
    
    alert('✔️ Pengaturan berhasil disimpan!');
}

// Fungsi untuk inisialisasi database
async function initDatabase() {
    try {
        // Load sql.js
        const sqlPromise = initSqlJs({
            //locateFile: file => `https://sql.js.org/dist/${file}`
            //locateFile: file => `assets/${file}`
            locateFile: file => file
        });
        SQL = await sqlPromise;
        
        // Load dari IndexedDB untuk persistensi
        await loadDatabaseFromIndexedDB();
         if (!db) {
            db = new SQL.Database();
        }

        // 3. Tambahkan tabel zoom_settings — SELALU di luar IF
        db.run(`
            CREATE TABLE IF NOT EXISTS zoom_settings (
                id INTEGER PRIMARY KEY,
                zoom REAL
            );
        `);
        db.run("INSERT OR IGNORE INTO zoom_settings (id, zoom) VALUES (1, 1)");
        await saveDatabaseToIndexedDB(); // ⬅ WAJIB di init agar DB tersimpan permanen
        // Jika database kosong atau tabel tidak ada, buat baru
        if (!tableExists('masjid_info')) {
            //db = new SQL.Database();
            // Buat tabel-tabel
            db.run(`
                CREATE TABLE IF NOT EXISTS masjid_info (
                    id INTEGER PRIMARY KEY,
                    name TEXT,
                    address TEXT
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS prayer_times (
                    id INTEGER PRIMARY KEY,
                    subuh TEXT,
                    dzuhur TEXT,
                    ashar TEXT,
                    maghrib TEXT,
                    isya TEXT,
                    imsak TEXT,
                    syuruq TEXT
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS iqomah_delays (
                    id INTEGER PRIMARY KEY,
                    subuh INTEGER,
                    dzuhur INTEGER,
                    ashar INTEGER,
                    maghrib INTEGER,
                    isya INTEGER
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS quote (
                    id INTEGER PRIMARY KEY,
                    text TEXT,
                    source TEXT
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS media (
                    id INTEGER PRIMARY KEY,
                    hero_image BLOB,
                    video_quran BLOB,
                    video_kajian BLOB,
                    video_khutbah BLOB,
                    audio_azan BLOB
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS running_text (
                    id INTEGER PRIMARY KEY,
                    text TEXT
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS ayat_pdf (
                    id INTEGER PRIMARY KEY,
                    pdf_data BLOB
                );
            `);
             db.run(`
                CREATE TABLE IF NOT EXISTS kas_pdf (
                    id INTEGER PRIMARY KEY,
                    pdf_data BLOB
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS jadwal_pdf (
                    id INTEGER PRIMARY KEY,
                    pdf_data BLOB
                );
            `);
            

            // Insert defaults
            db.run("INSERT INTO masjid_info (id, name, address) VALUES (1, ?, ?)", [defaultSettings.masjidName, defaultSettings.masjidAddress]);
            db.run("INSERT INTO prayer_times (id, subuh, dzuhur, ashar, maghrib, isya, imsak, syuruq) VALUES (1, ?, ?, ?, ?, ?, ?, ?)", [defaultSettings.prayerTimes.subuh, defaultSettings.prayerTimes.dzuhur, defaultSettings.prayerTimes.ashar, defaultSettings.prayerTimes.maghrib, defaultSettings.prayerTimes.isya, defaultSettings.prayerTimes.imsak, defaultSettings.prayerTimes.syuruq]);
            db.run("INSERT INTO iqomah_delays (id, subuh, dzuhur, ashar, maghrib, isya) VALUES (1, ?, ?, ?, ?, ?)", [defaultSettings.iqomahDelays.subuh, defaultSettings.iqomahDelays.dzuhur, defaultSettings.iqomahDelays.ashar, defaultSettings.iqomahDelays.maghrib, defaultSettings.iqomahDelays.isya]);
            db.run("INSERT INTO quote (id, text, source) VALUES (1, ?, ?)", [defaultSettings.quote.text, defaultSettings.quote.source]);
            db.run("INSERT INTO media (id, hero_image, video_quran, video_kajian, video_khutbah, audio_azan) VALUES (1, ?, ?, ?, ?, ?)", [defaultSettings.heroImage, defaultSettings.videos.quran, defaultSettings.videos.kajian, defaultSettings.videos.khutbah, defaultSettings.audio]);
            db.run("INSERT INTO running_text (id, text) VALUES (1, ?)", [defaultSettings.runningText]);

        }
        
        // Load settings ke memory SETELAH tabel dibuat
        await loadSettings();
        try {
                const z = db.exec("SELECT zoom FROM zoom_settings WHERE id = 1");
                if (z && z.length && z[0].values.length) {
                    applyZoom(z[0].values[0][0]);
                }
            } catch (e) {
                console.log("Zoom read error:", e);
            }

        //applyZoom(settings.zoomLevel);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        // Fallback ke defaults jika gagal
        settings = { ...defaultSettings };
    }
}

function applyZoom(level) {
    document.documentElement.style.fontSize = `${16 * level}px`;
}

// Fungsi untuk cek apakah tabel ada
function tableExists(tableName) {
    try {
        const result = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
        return result.length > 0 && result[0].values.length > 0;
    } catch (e) {
        return false;
    }
}

// Fungsi loadSettings dengan pengecekan tabel
async function loadSettings() {
    try {
        // Load Zoom Level
if (tableExists('zoom_settings')) {
    const zoomData = db.exec("SELECT zoom FROM zoom_settings WHERE id = 1")[0];
    if (zoomData) {
        settings.zoomLevel = zoomData.values[0][0];
        applyZoom(settings.zoomLevel);
    }
}

        // Masjid Info
        if (tableExists('masjid_info')) {
            const masjidInfo = db.exec("SELECT * FROM masjid_info WHERE id = 1")[0];
            if (masjidInfo) {
                settings.masjidName = masjidInfo.values[0][1];
                settings.masjidAddress = masjidInfo.values[0][2];
                document.getElementById('masjidName').textContent = settings.masjidName;
                document.getElementById('masjidAddress').textContent = settings.masjidAddress;
            }
        }
        
        // Prayer Times
        if (tableExists('prayer_times')) {
            const prayerTimes = db.exec("SELECT * FROM prayer_times WHERE id = 1")[0];
            if (prayerTimes) {
                const times = prayerTimes.values[0];
                settings.prayerTimes.subuh = times[1];
                settings.prayerTimes.dzuhur = times[2];
                settings.prayerTimes.ashar = times[3];
                settings.prayerTimes.maghrib = times[4];
                settings.prayerTimes.isya = times[5];
                settings.prayerTimes.imsak = times[6];
                settings.prayerTimes.syuruq = times[7];
            }
        }
        
        // Iqomah Delays
        if (tableExists('iqomah_delays')) {
            const iqomahDelays = db.exec("SELECT * FROM iqomah_delays WHERE id = 1")[0];
            if (iqomahDelays) {
                const delays = iqomahDelays.values[0];
                settings.iqomahDelays.subuh = delays[1];
                settings.iqomahDelays.dzuhur = delays[2];
                settings.iqomahDelays.ashar = delays[3];
                settings.iqomahDelays.maghrib = delays[4];
                settings.iqomahDelays.isya = delays[5];
            }
        }
        
        // Quote
        if (tableExists('quote')) {
            const quote = db.exec("SELECT * FROM quote WHERE id = 1")[0];
            if (quote) {
                settings.quote.text = quote.values[0][1];
                settings.quote.source = quote.values[0][2];
                document.getElementById('quoteText').textContent = settings.quote.text;
                document.getElementById('quoteSource').textContent = settings.quote.source;
            }
        }
        
        // Media
        if (tableExists('media')) {
            const media = db.exec("SELECT * FROM media WHERE id = 1")[0];
            if (media) {
                const mediaValues = media.values[0];
                if (mediaValues[1]) {
                    settings.heroImage = mediaValues[1];
                    const blob = new Blob([mediaValues[1]], { type: 'image/jpeg' });
                    document.getElementById('heroImage').src = URL.createObjectURL(blob);
                }
                if (mediaValues[2]) {
                    settings.videos.quran = mediaValues[2];
                    const blob = new Blob([mediaValues[2]], { type: 'video/mp4' });
                    document.getElementById('videoQuran').src = URL.createObjectURL(blob);
                }
                if (mediaValues[3]) {
                    settings.videos.kajian = mediaValues[3];
                    const blob = new Blob([mediaValues[3]], { type: 'video/mp4' });
                    document.getElementById('videoKajian').src = URL.createObjectURL(blob);
                }
                if (mediaValues[4]) {
                    settings.videos.khutbah = mediaValues[4];
                    const blob = new Blob([mediaValues[4]], { type: 'video/mp4' });
                    document.getElementById('videoKhutbah').src = URL.createObjectURL(blob);
                }
                if (mediaValues[5]) {
                    settings.audio = mediaValues[5];
                }
            }
        }
        
        // Running Text
        if (tableExists('running_text')) {
            const runningText = db.exec("SELECT * FROM running_text WHERE id = 1")[0];
            if (runningText) {
                settings.runningText = runningText.values[0][1];
                document.getElementById('runningText').textContent = settings.runningText;
            }
        }
        // Load PDFs (penambahan untuk memperbaiki masalah 1)
        if (tableExists('ayat_pdf')) {
            const ayatPdf = db.exec("SELECT pdf_data FROM ayat_pdf WHERE id = 1")[0];
            if (ayatPdf && ayatPdf.values[0][0]) {
                await loadPdfSlideshow(ayatPdf.values[0][0], 'ayatSlideshow');
            }
        }
        if (tableExists('kas_pdf')) {
            const kasPdf = db.exec("SELECT pdf_data FROM kas_pdf WHERE id = 1")[0];
            if (kasPdf && kasPdf.values[0][0]) {
                await loadPdfSlideshow(kasPdf.values[0][0], 'kasSlideshow');
            }
        }
        if (tableExists('jadwal_pdf')) {
            const jadwalPdf = db.exec("SELECT pdf_data FROM jadwal_pdf WHERE id = 1")[0];
            if (jadwalPdf && jadwalPdf.values[0][0]) {
                await loadPdfSlideshow(jadwalPdf.values[0][0], 'jadwalSlideshow');
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback ke defaults
        settings = { ...defaultSettings };
    }
}


// Fungsi untuk menyimpan database ke IndexedDB
async function saveDatabaseToIndexedDB() {
    return new Promise((resolve, reject) => {
        const data = db.export();
        const blob = new Blob([data], { type: "application/octet-stream" });

        const request = indexedDB.open('PrayerMonitorDB', 1);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sqliteDB')) {
                db.createObjectStore('sqliteDB');
            }
        };

        request.onsuccess = function(event) {
            const idb = event.target.result;
            const tx = idb.transaction(['sqliteDB'], 'readwrite');
            const store = tx.objectStore('sqliteDB');
            store.put(blob, 'database');

            tx.oncomplete = () => {
                idb.close();
                resolve();  // ⬅ WAJIB agar await bekerja
            };
        };

        request.onerror = function(event) {
            console.error('Error saving to IndexedDB:', event.target.error);
            reject(event.target.error);  // ⬅ WAJIB agar bisa terdeteksi jika error
        };
    });
}

// Fungsi untuk memuat database dari IndexedDB
function loadDatabaseFromIndexedDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open('PrayerMonitorDB', 1);

        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sqliteDB')) {
                db.createObjectStore('sqliteDB');
            }
        };

        request.onsuccess = function(event) {
            const idb = event.target.result;
            const tx = idb.transaction(['sqliteDB'], 'readonly');
            const store = tx.objectStore('sqliteDB');
            const getReq = store.get('database');

            getReq.onsuccess = function() {
                const result = getReq.result;

                if (!result) {
                    db = new SQL.Database();
                    resolve();
                    idb.close();
                    return;
                }

                result.arrayBuffer()
                    .then(buffer => {
                        db = new SQL.Database(new Uint8Array(buffer));
                        resolve();
                        idb.close();
                    })
                    .catch(err => {
                        console.error('SQLite buffer error:', err);
                        db = new SQL.Database();
                        resolve();
                        idb.close();
                    });
            };

            getReq.onerror = function(event) {
                console.error('Error load record:', event.target.error);
                db = new SQL.Database();
                resolve();
                idb.close();
            };
        };

        request.onerror = function(event) {
            console.error('IndexedDB open error:', event.target.error);
            db = new SQL.Database();
            resolve();
        };
    });
}

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

function toggleAdmin() {
    const panel = document.getElementById('adminPanel');
    const overlay = document.getElementById('adminOverlay');
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
        overlay.classList.remove('active');
    } else {
        // Load current settings into form
        document.getElementById('adminMasjidName').value = settings.masjidName;
        document.getElementById('adminMasjidAddress').value = settings.masjidAddress;
        document.getElementById('adminSubuh').value = settings.prayerTimes.subuh;
        document.getElementById('adminSyuruq').value = settings.prayerTimes.syuruq;
        document.getElementById('adminImsak').value = settings.prayerTimes.imsak;
        document.getElementById('adminDzuhur').value = settings.prayerTimes.dzuhur;
        document.getElementById('adminAshar').value = settings.prayerTimes.ashar;
        document.getElementById('adminMaghrib').value = settings.prayerTimes.maghrib;
        document.getElementById('adminIsya').value = settings.prayerTimes.isya;
        document.getElementById('adminQuoteText').value = settings.quote.text.replace(/"/g, '');
        document.getElementById('adminQuoteSource').value = settings.quote.source;
        document.getElementById('adminRunningText').value = settings.runningText;
        
        panel.classList.add('active');
        overlay.classList.add('active');
        // Jika dibuka, set fokus awal
        adminIndex = 0;
        setAdminFocus(adminIndex);
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
