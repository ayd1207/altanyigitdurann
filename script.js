/* ==========================================
   DESIGN OBJECT (Tasarım Ayarları ve Parametreler)
   ================================---------- */
const DESIGN = {
    canvasWidth: 500,          // Çizim tuvalinin genişliği
    canvasHeight: 300,         // Çizim tuvalinin yüksekliği
    nodeRadius: 16,            // Çekilebilir noktanın yarıçapı
    springStiffness: 0.08,     // Yayın sertlik katsayısı (geri çekilme hızı)
    damping: 0.85,             // Titreşimi sönümleme oranı (esneklik hissi)
    tensionThreshold: 120,     // Şiddetli tepki tetiklenme eşik mesafesi (piksel)
    colors: {
        background: "#0b0b0b",
        nodeNormal: "#ffffff",
        nodeActive: "#ff5555",
        stringColor: "#444444"
    },
    audio: {
        pullFrequencyBase: 150,// Gerilim arttıkça yükselen ses frekansı tabanı
        releaseVolume: 0.15    // Bırakma sesi yüksekliği
    }
};

/* ==========================================
   STATE (Durum Yönetimi)
   ================================---------- */
const state = {
    originX: DESIGN.canvasWidth / 2,
    originY: DESIGN.canvasHeight / 2,
    x: DESIGN.canvasWidth / 2,
    y: DESIGN.canvasHeight / 2,
    vx: 0,
    vy: 0,
    isDragging: false,
    currentPullDistance: 0,
    lastActionState: "Calm",
    dialogueHistory: []
};

// Web Audio API için ses motoru hazırlığı
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Minimalist web sesi üreticisi (harici dosya gerektirmez)
function playTone(freq, type, duration) {
    if (!audioCtx) return;
    try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(DESIGN.audio.releaseVolume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {
        // Tarayıcı izin politikaları için hata önleyici
    }
}

/* ==========================================
   INPUT (Girdi Yönetimi - Mouse & Touch)
   ================================---------- */
const canvas = document.getElementById('interactiveCanvas');
const ctx = canvas.getContext('2d');

canvas.width = DESIGN.canvasWidth;
canvas.height = DESIGN.canvasHeight;

function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('touchstart', startDrag);

window.addEventListener('mousemove', drag);
window.addEventListener('touchmove', drag);

window.addEventListener('mouseup', endDrag);
window.addEventListener('touchend', endDrag);

function startDrag(e) {
    initAudio();
    const pos = getEventPos(e);
    const dist = Math.hypot(pos.x - state.x, pos.y - state.y);
    if (dist < DESIGN.nodeRadius * 2) {
        state.isDragging = true;
    }
}

function drag(e) {
    if (!state.isDragging) return;
    const pos = getEventPos(e);
    state.x = pos.x;
    state.y = pos.y;
    
    // Girdi anında hesaplanan çekme mesafesi
    state.currentPullDistance = Math.hypot(state.x - state.originX, state.y - state.originY);
    
    // Çektikçe artan hafif gerilim sesi
    playTone(DESIGN.audio.pullFrequencyBase + state.currentPullDistance * 0.5, 'sine', 0.05);
}

function endDrag() {
    if (!state.isDragging) return;
    state.isDragging = false;
    
    // Bırakma anında kural tetiklenir
    evaluateRule(state.currentPullDistance);
}

/* ==========================================
   RULE (Sistem Kuralları ve Karşılıklılık Mantığı)
   ================================---------- */
function evaluateRule(distance) {
    let responseText = "";
    
    if (distance > DESIGN.tensionThreshold) {
        // Kural 1: Sert ve aşırı gerilim durumu
        state.lastActionState = "Tense / Resistant";
        const harshResponses = [
            "You pushed too hard. The system recoils.",
            "Excessive force received. Resistance increased.",
            "That was heavy. I need lighter contact."
        ];
        responseText = harshResponses[Math.floor(Math.random() * harshResponses.length)];
        playTone(80, 'sawtooth', 0.2); // Kalın, sert ses
    } else if (distance < 40) {
        // Kural 2: Çok zayıf / kararsız girdi
        state.lastActionState = "Hesitant / Soft";
        const softResponses = [
            "A gentle touch. Barely a whisper.",
            "Too subtle. Speak a little clearer.",
            "Resting in the quiet space."
        ];
        responseText = softResponses[Math.floor(Math.random() * softResponses.length)];
        playTone(300, 'sine', 0.1); // Yumuşak, ince ses
    } else {
        // Kural 3: Dengeli / Akışkan diyalog
        state.lastActionState = "Balanced / Fluid";
        const balancedResponses = [
            "Rhythm accepted. We are in tune.",
            "A reciprocal motion.",
            "The dialogue flows back to you."
        ];
        responseText = balancedResponses[Math.floor(Math.random() * balancedResponses.length)];
        playTone(200, 'triangle', 0.15); // Dengeli ses
    }

    // Durumu ve çıktıyı güncelle
    updateOutput(state.lastActionState, responseText);
}

/* ==========================================
   OUTPUT (Görselleştirme ve Arayüz Güncelleme)
   ================================---------- */
const stateIndicator = document.getElementById('stateIndicator');
const responseOutput = document.getElementById('responseOutput');
const resetButton = document.getElementById('resetButton');

function updateOutput(statusText, messageText) {
    stateIndicator.textContent = `State: ${statusText}`;
    responseOutput.style.opacity = 0;
    setTimeout(() => {
        responseOutput.textContent = messageText;
        responseOutput.style.opacity = 1;
    }, 150);
}

// Reset Butonu İşlevi
resetButton.addEventListener('click', () => {
    state.x = state.originX;
    state.y = state.originY;
    state.vx = 0;
    state.vy = 0;
    state.currentPullDistance = 0;
    state.lastActionState = "Calm";
    updateOutput("Calm", "Dialogue reset. Waiting for input...");
    playTone(400, 'sine', 0.1);
});

// Fiziksel yay animasyon döngüsü (Spring Physics Loop)
function animate() {
    ctx.fillStyle = DESIGN.colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!state.isDragging) {
        // Hooke Yasası: Yayın merkeze dönme kuvveti
        let ax = (state.originX - state.x) * DESIGN.springStiffness;
        let ay = (state.originY - state.y) * DESIGN.springStiffness;

        state.vx += ax;
        state.vy += ay;

        state.vx *= DESIGN.damping;
        state.vy *= DESIGN.damping;

        state.x += state.vx;
        state.y += state.vy;
    }

    // Yay Çizgisini Çiz
    ctx.beginPath();
    ctx.moveTo(state.originX, state.originY);
    ctx.lineTo(state.x, state.y);
    ctx.strokeStyle = DESIGN.colors.stringColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Merkez Sabit Noktası
    ctx.beginPath();
    ctx.arc(state.originX, state.originY, 4, 0, Math.PI * 2);
    ctx.fillStyle = DESIGN.colors.stringColor;
    ctx.fill();

    // Çekilebilir Düğüm Noktası
    ctx.beginPath();
    ctx.arc(state.x, state.y, DESIGN.nodeRadius, 0, Math.PI * 2);
    ctx.fillStyle = state.isDragging ? DESIGN.colors.nodeActive : DESIGN.colors.nodeNormal;
    ctx.fill();

    requestAnimationFrame(animate);
}

// Animasyonu başlat
animate();