/**
 * Persistent Trace & Feedback Experiment
 * Yapı: DESIGN -> state -> input -> rule -> output
 */

// ==========================================
// 1. DESIGN: Ayarlanabilir Parametreler ve Kurallar
// ==========================================
const DESIGN = {
    gridSpacing: 25,          // Arka plandaki nokta matrisinin aralığı (piksel)
    selectionRadius: 35,      // İmlecin etki (seçim) yarıçapı
    colors: {
        background: '#050505',
        nodeDefault: 'rgba(255, 255, 255, 0.12)',
        nodeSelected: '#22c55e',   // Seçilen yerlerin yeşil rengi
        cursorTrail: 'rgba(34, 197, 94, 0.4)'
    }
};

// ==========================================
// 2. STATE: Anlık Durum Değişkenleri (Veri Kaybı Yok)
// ==========================================
let state = {
    nodes: [],                // Arka plandaki tüm matris noktaları
    isDrawing: false,         // Kullanıcı sürüklüyor mu?
    lastX: 0,
    lastY: 0,
    activeTracesCount: 0
};

// DOM Referansları
const canvas = document.getElementById('trailCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const statusBanner = document.getElementById('statusBanner');
const traceCountVal = document.getElementById('traceCountVal');
const memoryVal = document.getElementById('memoryVal');

// Canvas boyutunu ayarla ve grid noktalarını oluştur
function initGrid() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    state.nodes = [];
    for (let x = DESIGN.gridSpacing; x < canvas.width; x += DESIGN.gridSpacing) {
        for (let y = DESIGN.gridSpacing; y < canvas.height; y += DESIGN.gridSpacing) {
            state.nodes.push({
                x: x,
                y: y,
                selected: false,    // Veri kalıcılığı: Seçildiğinde true olur ve sıfırlanmaz
                intensity: 0.0      // Görsel parlama efekti için
            });
        }
    }
    state.activeTracesCount = 0;
    updateMetrics();
}

// ==========================================
// 3. INPUT: Çoklu Seçim ve Sürükleme Yönetimi
// ==========================================
function initInput() {
    canvas.addEventListener('pointerdown', (e) => {
        state.isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        state.lastX = e.clientX - rect.left;
        state.lastY = e.clientY - rect.top;
        processSelection(state.lastX, state.lastY);
        statusBanner.textContent = "State: Tracing & Accumulating Data";
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!state.isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        processSelection(x, y);
        state.lastX = x;
        state.lastY = y;
    });

    window.addEventListener('pointerup', () => {
        state.isDrawing = false;
        statusBanner.textContent = "State: Idle (Selections Preserved)";
    });

    clearBtn.addEventListener('click', () => {
        state.nodes.forEach(n => {
            n.selected = false;
            n.intensity = 0.0;
        });
        state.activeTracesCount = 0;
        updateMetrics();
        statusBanner.textContent = "State: Memory Cleared";
    });
}

// ==========================================
// 4. RULE: Seçim ve Kalıcılık Mantığı
// ==========================================
function processSelection(x, y) {
    state.nodes.forEach(node => {
        let dx = node.x - x;
        let dy = node.y - y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Eğer imlecin etki alanındaysa seç (asla sıfırlanmaz, kalıcıdır)
        if (dist < DESIGN.selectionRadius) {
            if (!node.selected) {
                node.selected = true;
                state.activeTracesCount++;
            }
            node.intensity = 1.0; // Her dokunulduğunda parlama yoğunluğunu tepeye çıkar
        }
    });

    updateMetrics();
}

function updatePhysics() {
    // Seçilen düğümlerin parıltı yoğunluğunu zamanla yumuşat ama yeşil kalıcılığını koru
    state.nodes.forEach(node => {
        if (node.intensity > 0.0) {
            node.intensity -= 0.02;
            if (node.intensity < 0.0) node.intensity = 0.0;
        }
    });
}

// ==========================================
// 5. OUTPUT: Görselleştirme (Yeşil İşaretleme)
// ==========================================
function renderOutput() {
    ctx.fillStyle = DESIGN.colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Tüm matris noktalarını çiz
    state.nodes.forEach(node => {
        ctx.beginPath();
        
        if (node.selected) {
            // Seçilen ve hafızada tutulan yerler YEŞİL renk ve parıltıyla gösterilir
            let radius = 3 + (node.intensity * 3);
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = DESIGN.colors.nodeSelected;
            ctx.shadowColor = DESIGN.colors.nodeSelected;
            ctx.shadowBlur = 8 * node.intensity; // Yeni seçildiğinde parlar
            ctx.fill();
            ctx.shadowBlur = 0; // Sıfırla
        } else {
            // Henüz dokunulmamış pasif noktalar
            ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = DESIGN.colors.nodeDefault;
            ctx.fill();
        }
    });
}

function updateMetrics() {
    traceCountVal.textContent = state.activeTracesCount;
    memoryVal.textContent = state.activeTracesCount > 50 ? "Dense (Accumulating)" : state.activeTracesCount > 0 ? "Active" : "Clean";
}

// Ana Döngü
function loop() {
    updatePhysics();
    renderOutput();
    requestAnimationFrame(loop);
}

// Başlatma
window.addEventListener('load', () => {
    initGrid();
    initInput();
    loop();
});