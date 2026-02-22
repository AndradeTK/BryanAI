/**
 * BryanAI Chrome Extension - Popup Script v2.0
 * Interface moderna com tabs, Cover Letter e análise avançada
 */

// Configuração
const DEFAULT_SERVER_URL = 'http://localhost:3000';
let serverUrl = DEFAULT_SERVER_URL;
let isConnected = false;
let currentCoverLetter = '';
let stats = { analyzeCount: 0, generateCount: 0 };

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await checkConnection();
    setupTabs();
    updateStats();
});

// =====================================
// CONFIGURAÇÃO E CONEXÃO
// =====================================

async function loadConfig() {
    try {
        const config = await chrome.storage.local.get(['serverUrl', 'stats']);
        serverUrl = config.serverUrl || DEFAULT_SERVER_URL;
        stats = config.stats || { analyzeCount: 0, generateCount: 0 };
        document.getElementById('serverUrl').value = serverUrl;
    } catch (e) {
        console.log('Usando configurações padrão');
    }
}

async function saveConfig() {
    serverUrl = document.getElementById('serverUrl').value.trim() || DEFAULT_SERVER_URL;
    
    try {
        await chrome.storage.local.set({ serverUrl, stats });
        showToast('Configurações salvas!');
        await checkConnection();
    } catch (e) {
        console.error('Erro ao salvar:', e);
        showToast('Erro ao salvar configurações', 'error');
    }
}

async function checkConnection() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    try {
        const response = await fetch(`${serverUrl}/api/curriculo/validar`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            isConnected = true;
            statusDot.classList.remove('offline');
            statusText.textContent = 'Online';
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        isConnected = false;
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
    }
}

async function testConnection() {
    showToast('Testando conexão...');
    await checkConnection();
    
    if (isConnected) {
        showToast('Conexão OK!', 'success');
    } else {
        showToast('Servidor não encontrado', 'error');
    }
}

// =====================================
// TABS
// =====================================

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Remove active de todos
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Ativa o selecionado
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

// =====================================
// CAPTURA DE DADOS
// =====================================

async function captureFromPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'captureJobData' });
        
        if (response && response.success) {
            document.getElementById('titulo').value = response.titulo || '';
            document.getElementById('descricao').value = response.descricao || '';
            showToast('Dados capturados!', 'success');
        } else {
            showToast('Não foi possível capturar dados desta página', 'error');
        }
    } catch (error) {
        console.error('Erro ao capturar:', error);
        showToast('Erro ao capturar. Cole manualmente.', 'error');
    }
}

function openDashboard() {
    chrome.tabs.create({ url: serverUrl });
}

// =====================================
// ANÁLISE DE JOB FIT
// =====================================

async function analyzeJob() {
    if (!isConnected) {
        showToast('Servidor offline', 'error');
        return;
    }
    
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    
    if (!titulo || !descricao) {
        showToast('Preencha título e descrição', 'error');
        return;
    }
    
    showLoading('loading', true);
    hideElement('result');
    
    try {
        const response = await fetch(`${serverUrl}/api/jobfit/quick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, descricao })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayAnalysisResult(data.data);
            incrementStat('analyzeCount');
        } else {
            showToast('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão', 'error');
    } finally {
        showLoading('loading', false);
    }
}

function displayAnalysisResult(data) {
    const scoreCard = document.getElementById('scoreCard');
    const scoreValue = document.getElementById('scoreValue');
    const fitBadge = document.getElementById('fitBadge');
    const strengthsList = document.getElementById('strengthsList');
    const gapsList = document.getElementById('gapsList');
    const keywordsList = document.getElementById('keywordsList');
    
    // Score
    scoreValue.textContent = data.score || '--';
    
    // Classe baseada no score
    scoreCard.className = 'score-card';
    fitBadge.className = 'fit-badge';
    
    if (data.score >= 80) {
        fitBadge.textContent = 'Excelente Match';
        fitBadge.classList.add('high');
    } else if (data.score >= 60) {
        scoreCard.classList.add('medium');
        fitBadge.textContent = 'Bom Match';
        fitBadge.classList.add('medium');
    } else {
        scoreCard.classList.add('low');
        fitBadge.textContent = 'Match Baixo';
        fitBadge.classList.add('low');
    }
    
    // Pontos fortes
    strengthsList.innerHTML = (data.pontos_fortes || []).map(item => 
        `<li><span class="list-icon">✓</span> ${item}</li>`
    ).join('');
    
    // Gaps
    gapsList.innerHTML = (data.gaps || []).map(item => 
        `<li><span class="list-icon">!</span> ${item}</li>`
    ).join('');
    
    // Keywords
    keywordsList.innerHTML = (data.keywords || []).map(kw => 
        `<span class="keyword-tag">${kw}</span>`
    ).join('');
    
    showElement('result');
}

function resetAnalysis() {
    hideElement('result');
    document.getElementById('titulo').value = '';
    document.getElementById('descricao').value = '';
}

// =====================================
// GERAÇÃO DE CURRÍCULO
// =====================================

async function generateResume(formato = 'pdf') {
    if (!isConnected) {
        showToast('Servidor offline', 'error');
        return;
    }
    
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const template = document.getElementById('template').value;
    const idioma = document.getElementById('idioma').value;
    
    if (!titulo || !descricao) {
        showToast('Preencha título e descrição na aba Analisar', 'error');
        return;
    }
    
    showToast('Gerando currículo...', 'info');
    
    try {
        const response = await fetch(`${serverUrl}/api/jobfit/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, descricao, formato, idioma, template })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Currículo gerado! Score: ${data.data.score}`, 'success');
            incrementStat('generateCount');
            
            // Download
            if (data.data.arquivo && data.data.arquivo.nome) {
                const downloadUrl = `${serverUrl}/api/arquivos/${data.data.arquivo.nome}`;
                if (chrome.downloads) {
                    chrome.downloads.download({ url: downloadUrl, filename: data.data.arquivo.nome });
                } else {
                    window.open(downloadUrl, '_blank');
                }
            }
        } else {
            showToast('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão', 'error');
    }
}

// =====================================
// COVER LETTER
// =====================================

async function generateCoverLetter() {
    if (!isConnected) {
        showToast('Servidor offline', 'error');
        return;
    }
    
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const empresa = document.getElementById('empresa').value.trim();
    const tom = document.getElementById('tomCarta').value;
    
    if (!titulo || !descricao) {
        showToast('Preencha título e descrição na aba Analisar', 'error');
        return;
    }
    
    showLoading('letterLoading', true);
    hideElement('letterResult');
    
    try {
        const response = await fetch(`${serverUrl}/api/cover-letter/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, empresa, descricao, tom, idioma: 'pt-BR' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentCoverLetter = data.coverLetter;
            document.getElementById('coverLetterText').textContent = data.coverLetter;
            showElement('letterResult');
            showToast('Cover Letter gerada!', 'success');
        } else {
            showToast('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro de conexão', 'error');
    } finally {
        showLoading('letterLoading', false);
    }
}

function copyCoverLetter() {
    if (!currentCoverLetter) return;
    
    navigator.clipboard.writeText(currentCoverLetter).then(() => {
        showToast('Copiado!', 'success');
    }).catch(() => {
        showToast('Erro ao copiar', 'error');
    });
}

function downloadCoverLetter() {
    if (!currentCoverLetter) return;
    
    const blob = new Blob([currentCoverLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cover-letter.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// =====================================
// UTILITÁRIOS
// =====================================

function showLoading(elementId, show) {
    const el = document.getElementById(elementId);
    if (show) {
        el.classList.add('active');
    } else {
        el.classList.remove('active');
    }
}

function showElement(elementId) {
    document.getElementById(elementId).classList.add('active');
}

function hideElement(elementId) {
    document.getElementById(elementId).classList.remove('active');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#1f2937';
    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function incrementStat(key) {
    stats[key] = (stats[key] || 0) + 1;
    updateStats();
    chrome.storage.local.set({ stats });
}

function updateStats() {
    document.getElementById('analyzeCount').textContent = stats.analyzeCount || 0;
    document.getElementById('generateCount').textContent = stats.generateCount || 0;
}
