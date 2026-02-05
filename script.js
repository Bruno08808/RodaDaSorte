let wheels = {};
let currentWheelId = null;
let isSpinning = false;

const corucheColors = ['#1DBFA5', '#0052CC', '#26E0B9', '#003D99', '#1AC8A8', '#0040A8'];

class Wheel {
    constructor(id) {
        this.id = id;
        this.segments = [];
        this.rotation = 0;
        this.history = [];
    }
}

// --- INICIALIZAÇÃO E CARREGAMENTO ---

async function init() {
    // 1. Tentar carregar do LocalStorage primeiro
    const hasLocalData = loadFromLocalStorage();

    if (!hasLocalData) {
        try {
            // 2. Se não houver dados locais, carregar do JSON
            const response = await fetch('config.json');
            const configData = await response.json();
            
            const id = 'wheel-' + Date.now();
            wheels[id] = new Wheel(id);
            wheels[id].segments = configData.defaultWheel.segments;
            currentWheelId = id;
            saveToLocalStorage();
        } catch (error) {
            console.error("Erro ao carregar config.json:", error);
            if (Object.keys(wheels).length === 0) createNewWheel();
        }
    }

    refreshUI();
}

function refreshUI() {
    updateWheelTabs();
    renderWheel();
    updateSegmentList();
    updateHistory();
}

// --- GESTÃO DE RODAS (TABS) ---

function updateWheelTabs() {
    const tabs = document.getElementById('wheelTabs');
    if (!tabs) return;
    tabs.innerHTML = '';
    
    Object.keys(wheels).forEach((id, i) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${id === currentWheelId ? 'active' : ''}`;
        btn.textContent = `Roda ${i + 1}`;
        btn.onclick = () => {
            currentWheelId = id;
            saveToLocalStorage(); // Guarda qual é a roda ativa
            refreshUI();
        };
        tabs.appendChild(btn);
    });
}

function createNewWheel() {
    const id = 'wheel-' + Date.now();
    wheels[id] = new Wheel(id);
    // Cria com 4 opções padrão se for uma roda nova e vazia
    wheels[id].segments = [
        { text: 'Opção 1', emoji: '🎁', color: corucheColors[0] },
        { text: 'Opção 2', emoji: '✨', color: corucheColors[1] },
        { text: 'Opção 3', emoji: '🎉', color: corucheColors[2] },
        { text: 'Opção 4', emoji: '🚀', color: corucheColors[3] }
    ];
    currentWheelId = id;
    saveToLocalStorage();
    refreshUI();
}

function deleteCurrentWheel() {
    const wheelKeys = Object.keys(wheels);
    if (wheelKeys.length <= 1) return alert("Não podes apagar a única roda!");
    
    delete wheels[currentWheelId];
    currentWheelId = Object.keys(wheels)[0];
    saveToLocalStorage();
    refreshUI();
}

// --- RENDERIZAÇÃO E LÓGICA DA RODA ---

function renderWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const wheel = wheels[currentWheelId];

    canvas.width = 800;
    canvas.height = 800;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numSegments = wheel.segments.length;
    const sliceAngle = (Math.PI * 2) / numSegments;

    wheel.segments.forEach((segment, index) => {
        const startAngle = (index * sliceAngle) + wheel.rotation - Math.PI / 2;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = segment.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'white';
        ctx.font = `bold ${numSegments > 15 ? 16 : 24}px Poppins`;
        const content = segment.emoji ? `${segment.emoji} ${segment.text}` : segment.text;
        ctx.fillText(content, radius - 50, 10);
        ctx.restore();
    });

    // Centro e Seta
    drawStaticElements(ctx, centerX, centerY);
}

function drawStaticElements(ctx, centerX, centerY) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#0052CC';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#0052CC';
    ctx.beginPath();
    ctx.moveTo(centerX - 30, 10);
    ctx.lineTo(centerX + 30, 10);
    ctx.lineTo(centerX, 70);
    ctx.closePath();
    ctx.fill();
}

function spinWheel() {
    if (isSpinning) return;
    const wheel = wheels[currentWheelId];
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = true;
    isSpinning = true;

    const winningIndex = Math.floor(Math.random() * wheel.segments.length);
    const sliceDeg = 360 / wheel.segments.length;
    const stopAt = 360 - (winningIndex * sliceDeg) - (sliceDeg / 2);
    const totalRotation = (360 * 10) + stopAt;

    let start = null;
    const duration = 5000;

    function animate(time) {
        if (!start) start = time;
        const progress = Math.min((time - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        wheel.rotation = (totalRotation * ease * Math.PI) / 180;
        renderWheel();

        if (progress < 1) requestAnimationFrame(animate);
        else {
            isSpinning = false;
            spinBtn.disabled = false;
            wheel.rotation %= (Math.PI * 2);
            const winner = wheel.segments[winningIndex];
            addToHistory(winner);
            showWinner(winner.text, winner.color, winner.emoji);
            saveToLocalStorage();
        }
    }
    requestAnimationFrame(animate);
}

// --- SEGMENTOS E HISTÓRICO ---

function addSegments() {
    const num = Math.min(parseInt(document.getElementById('numSegments').value) || 2, 50);
    const wheel = wheels[currentWheelId];
    
    const newSegments = Array.from({length: num}, (_, i) => {
        return wheel.segments[i] || { 
            text: `Opção ${i + 1}`, 
            emoji: '', 
            color: corucheColors[i % corucheColors.length] 
        };
    });
    
    wheel.segments = newSegments;
    saveToLocalStorage();
    refreshUI();
}

function updateSegmentList() {
    const list = document.getElementById('segmentList');
    if (!list) return;
    list.innerHTML = '';
    wheels[currentWheelId].segments.forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'segment-item';
        div.innerHTML = `
            <input type="color" value="${s.color}" onchange="updateSeg(${i}, 'color', this.value)">
            <div class="segment-controls">
                <input type="text" value="${s.emoji}" placeholder="Emoji" oninput="updateSeg(${i}, 'emoji', this.value)">
                <input type="text" value="${s.text}" placeholder="Texto" oninput="updateSeg(${i}, 'text', this.value)">
            </div>
            <button class="remove-seg-btn" onclick="removeSeg(${i})">×</button>
        `;
        list.appendChild(div);
    });
}

function updateSeg(idx, field, val) {
    wheels[currentWheelId].segments[idx][field] = val;
    renderWheel();
    saveToLocalStorage();
}

function removeSeg(idx) {
    if (wheels[currentWheelId].segments.length <= 2) return;
    wheels[currentWheelId].segments.splice(idx, 1);
    refreshUI();
    saveToLocalStorage();
}

function addToHistory(winner) {
    wheels[currentWheelId].history.unshift(winner);
    if (wheels[currentWheelId].history.length > 10) wheels[currentWheelId].history.pop();
    updateHistory();
}

function updateHistory() {
    const h = document.getElementById('history');
    if (!h) return;
    h.innerHTML = wheels[currentWheelId].history.map(i => 
        `<div class="history-item">${i.emoji} ${i.text}</div>`
    ).join('') || 'Vazio';
}

function showWinner(text, color, emoji) {
    const div = document.createElement('div');
    div.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:40px; border-radius:20px; box-shadow:0 0 100px rgba(0,0,0,0.5); border:10px solid ${color}; z-index:10000; text-align:center; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);`;
    div.innerHTML = `<h1 style="font-size:40px">${emoji}</h1><h2 style="font-size:30px">${text}</h2>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// --- STORAGE ---

function saveToLocalStorage() {
    localStorage.setItem('corucheWheel_VFinal', JSON.stringify({
        wheels, 
        currentWheelId
    }));
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('corucheWheel_VFinal');
    if (!data) return false;
    const parsed = JSON.parse(data);
    wheels = parsed.wheels;
    currentWheelId = parsed.currentWheelId;
    return true;
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    document.querySelector('.theme-toggle').textContent = document.body.classList.contains('dark-mode') ? 'Modo claro' : 'Modo escuro';
}

document.addEventListener('DOMContentLoaded', init);