/**
 * THE DRIFT ANCHOR - Feedback Loop Experience
 * Mimari Sıralaması: DESIGN -> state -> input -> rule -> output
 */

// ==========================================
// 1. DESIGN (Ayarlanabilir Parametreler ve Kurallar)
// ==========================================
const DESIGN = {
    nodeMass: 1.2,          // Nesnenin atalet (momentum) katsayısı. Yüksek değer = zor durur.
    enginePower: 0.4,       // Kullanıcının girdisinin (itme kuvvetinin) gücü.
    friction: 0.96,         // Sürtünme katsayısı (Hızın zamanla sönümlenmesi).
    currentChangeSpeed: 0.02, // Gizli rüzgarın değişim hızı ve sıklığı.
    maxCurrentForce: 0.6,   // Gizli akıntının ulaşabileceği maksimum şiddet.
    safeCorridorWidth: 120, // Merkezdeki güvenli hattın genişliği (piksel).
    trailLength: 35         // Nesnenin arkasında kalan izin uzunluğu (geri bildirim için).
};

// ==========================================
// 2. state (Uygulama Durum Yönetimi)
// ==========================================
let state = {
    node: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0
    },
    hiddenCurrent: {
        x: 0, // Yatay gizli rüzgar kuvveti
        targetX: 0
    },
    input: {
        left: false,
        right: false,
        mouseX: null,
        isDragging: false
    },
    trail: [],     // Geçmiş pozisyonlar (İz efekti ve geri bildirim için)
    stability: 100, // Kararlılık yüzdesi
    isPaused: false
};

// Canvas ve Context Hazırlığı
const canvas = document.getElementById('driftCanvas');
const ctx = canvas.getContext('2d');
const stabilityValEl = document.getElementById('stabilityVal');
const resetBtn = document.getElementById('resetBtn');

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // İlk yüklemede nesneyi merkeze konumlandır
    if (state.node.x === 0 && state.node.y === 0) {
        state.node.x = canvas.width / 2;
        state.node.y = canvas.height / 2;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ==========================================
// 3. input (Girdi Yönetimi - Klavye, Fare ve Dokunma)
// ==========================================
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.input.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.input.right = true;
    if (e.key === 'r' || e.key === 'R') resetState();
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') state.input.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') state.input.right = false;
});

// Fare ve Dokunma Desteği (Eşdeğer Girdi Rotası)
canvas.addEventListener('mousedown', (e) => {
    state.input.isDragging = true;
    updateMousePosition(e);
});

window.addEventListener('mousemove', (e) => {
    if (state.input.isDragging) updateMousePosition(e);
});

window.addEventListener('mouseup', () => {
    state.input.isDragging = false;
    state.input.mouseX = null;
});

function updateMousePosition(e) {
    const rect = canvas.getBoundingClientRect();
    state.input.mouseX = e.clientX - rect.left;
}

resetBtn.addEventListener('click', resetState);

function resetState() {
    state.node.x = canvas.width / 2;
    state.node.y = canvas.height / 2;
    state.node.vx = 0;
    state.node.vy = 0;
    state.trail = [];
    state.stability = 100;
    state.hiddenCurrent.x = 0;
}

// Sekme Odak Kaybı (Blur) Koruması
window.addEventListener('blur', () => {
    state.isPaused = true;
    state.input.left = false;
    state.input.right = false;
    state.input.isDragging = false;
});

window.addEventListener('focus', () => {
    state.isPaused = false;
});

// ==========================================
// 4. rule (Fizik Kuralları ve Gizli Durum Hesaplamaları)
// ==========================================
function updatePhysics() {
    if (state.isPaused) return;

    // A. Gizli Durum (Rüzgar/Akıntı) Evrimi
    // Zamanla rastgele yön değiştiren görünmeyen yatay akıntı
    if (Math.random() < 0.03) {
        state.hiddenCurrent.targetX = (Math.random() * 2 - 1) * DESIGN.maxCurrentForce;
    }
    // Hedef akıntıya yumuşak geçiş (easing)
    state.hiddenCurrent.x += (state.hiddenCurrent.targetX - state.hiddenCurrent.x) * DESIGN.currentChangeSpeed;

    // B. Kullanıcı Girdisi Kuvveti
    let userForce = 0;
    if (state.input.left) userForce -= DESIGN.enginePower;
    if (state.input.right) userForce += DESIGN.enginePower;

    // Fare ile çekim/itme alternatifi
    if (state.input.isDragging && state.input.mouseX !== null) {
        const diff = state.input.mouseX - state.node.x;
        userForce += Math.sign(diff) * Math.min(Math.abs(diff) * 0.02, DESIGN.enginePower);
    }

    // C. Kuvvetlerin Bileşkesi (İnput + Gizli Akıntı) / Atalet
    const totalAcceleration = (userForce + state.hiddenCurrent.x) / DESIGN.nodeMass;
    state.node.vx += totalAcceleration;
    state.node.vx *= DESIGN.friction; // Sürtünme

    // D. Pozisyon Güncelleme
    state.node.x += state.node.vx;

    // Ekran sınırları koruması (Duvarlardan sekme)
    if (state.node.x < 20) { state.node.x = 20; state.node.vx *= -0.5; }
    if (state.node.x > canvas.width - 20) { state.node.x = canvas.width - 20; state.node.vx *= -0.5; }

    // E. İz (Trail) Kaydı ve Geri Bildirim Güncellemesi
    state.trail.push({ x: state.node.x, y: state.node.y, current: state.hiddenCurrent.x });
    if (state.trail.length > DESIGN.trailLength) {
        state.trail.shift();
    }

    // F. Kararlılık (Stability) Hesaplama
    const centerX = canvas.width / 2;
    const distanceFromCenter = Math.abs(state.node.x - centerX);
    const inCorridor = distanceFromCenter <= DESIGN.safeCorridorWidth / 2;
    
    if (inCorridor) {
        state.stability = Math.min(100, state.stability + 0.3);
    } else {
        state.stability = Math.max(0, state.stability - 0.8);
    }
    stabilityValEl.textContent = Math.round(state.stability);
}

// ==========================================
// 5. output (Görselleştirme ve Render Döngüsü)
// ==========================================
function render() {
    // Ekranı Temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;

    // A. Güvenli Koridor (Arka Plan Rehberi)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.fillRect(centerX - DESIGN.safeCorridorWidth / 2, 0, DESIGN.safeCorridorWidth, canvas.height);

    // Merkez Çizgisi
    ctx.strokeStyle = 'rgba(75, 85, 99, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); // Çizgiyi normale döndür

    // B. Durum Geri Bildirimi: Bükülen ve Renk Değiştiren İz (Trail)
    if (state.trail.length > 1) {
        for (let i = 1; i < state.trail.length; i++) {
            const p1 = state.trail[i - 1];
            const p2 = state.trail[i];
            const ratio = i / state.trail.length;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y + (i * 2));
            ctx.lineTo(p2.x, p2.y + (i * 2));

            // Rüzgar şiddetine göre renk değişimi (Mavi: Sakin, Turuncu/Kırmızı: Sert Akıntı)
            const currentIntensity = Math.abs(p2.current);
            const red = Math.round(59 + currentIntensity * 300);
            const blue = Math.round(130 - currentIntensity * 100);
            ctx.strokeStyle = `rgba(${red}, 130, ${blue}, ${ratio * 0.6})`;
            ctx.lineWidth = ratio * 4;
            ctx.stroke();
        }
    }

    // C. Nesne (Node) Çizimi
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(state.node.x, canvas.height / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // Gölgeyi sıfırla

    // D. Eylem Onayı (Action Acknowledgement): Kuvvet Yönü Göstergesi
    if (state.input.left || state.input.right || state.input.isDragging) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let dir = state.input.left ? -1 : (state.input.right ? 1 : Math.sign(state.input.mouseX - state.node.x));
        ctx.moveTo(state.node.x, canvas.height / 2);
        ctx.lineTo(state.node.x + dir * 25, canvas.height / 2);
        ctx.stroke();
    }
}

// Ana Döngü (Game Loop)
function loop() {
    updatePhysics();
    render();
    requestAnimationFrame(loop);
}

// Deneyimi Başlat
requestAnimationFrame(loop);