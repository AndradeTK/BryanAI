/**
 * BryanAI Chrome Extension - Popup Script v2.0
 * Interface moderna com tabs, Cover Letter e análise avançada
 */

// Configuração
// Produção — ver a nota em content.js.
const DEFAULT_SERVER_URL = 'https://app.bryanandrade.dev';
let serverUrl = DEFAULT_SERVER_URL;
let apiToken = '';
let isConnected = false;
let currentCoverLetter = '';
let stats = { analyzeCount: 0, generateCount: 0 };

/**
 * Cabeçalhos das chamadas ao backend. O servidor exige autenticação em todas as
 * rotas; o token vem da aba Configurações e é o mesmo EXTENSION_API_TOKEN do
 * .env do servidor.
 */
async function authHeaders() {
    const { apiToken: stored } = await chrome.storage.local.get(['apiToken']);
    const headers = { 'Content-Type': 'application/json' };
    const token = stored || apiToken;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await checkConnection();
    setupTabs();
    setupEventListeners();
    updateStats();
});

// =====================================
// EVENT LISTENERS
// =====================================

function setupEventListeners() {
    // Quick Actions
    document.getElementById('btnCapture')?.addEventListener('click', captureFromPage);
    document.getElementById('btnSaveTracker')?.addEventListener('click', saveToTracker);
    document.getElementById('btnScoreBadge')?.addEventListener('click', showScoreBadge);
    document.getElementById('btnPanel')?.addEventListener('click', togglePanel);
    document.getElementById('btnDashboard')?.addEventListener('click', openDashboard);
    document.getElementById('btnFooterDash')?.addEventListener('click', (e) => {
        e.preventDefault();
        openDashboard();
    });
    
    // Analyze Tab
    document.getElementById('btnAnalyze')?.addEventListener('click', analyzeJob);
    document.getElementById('btnDownloadPdf')?.addEventListener('click', () => generateResume('pdf'));
    document.getElementById('btnReset')?.addEventListener('click', resetAnalysis);
    
    // Generate Tab
    document.getElementById('btnGenPdf')?.addEventListener('click', () => generateResume('pdf'));
    document.getElementById('btnGenDocx')?.addEventListener('click', () => generateResume('docx'));
    
    // Cover Letter Tab
    document.getElementById('btnGenLetter')?.addEventListener('click', generateCoverLetter);
    document.getElementById('btnCopyLetter')?.addEventListener('click', copyCoverLetter);
    document.getElementById('btnDownloadLetter')?.addEventListener('click', downloadCoverLetter);
    
    // Config Tab
    document.getElementById('btnSaveConfig')?.addEventListener('click', saveConfig);
    document.getElementById('btnTestConn')?.addEventListener('click', testConnection);
}

// =====================================
// CONFIGURAÇÃO E CONEXÃO
// =====================================

async function loadConfig() {
    try {
        const config = await chrome.storage.local.get(['serverUrl', 'apiToken', 'stats']);
        serverUrl = config.serverUrl || DEFAULT_SERVER_URL;
        apiToken = config.apiToken || '';
        stats = config.stats || { analyzeCount: 0, generateCount: 0 };
        document.getElementById('serverUrl').value = serverUrl;
        document.getElementById('apiToken').value = apiToken;
    } catch (e) {
        console.log('Usando configurações padrão');
    }
}

async function saveConfig() {
    serverUrl = document.getElementById('serverUrl').value.trim() || DEFAULT_SERVER_URL;
    apiToken = document.getElementById('apiToken').value.trim();

    try {
        await chrome.storage.local.set({ serverUrl, apiToken, stats });
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
            headers: await authHeaders()
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
    console.log('[BryanAI Popup] Iniciando captura...');
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('[BryanAI Popup] Aba ativa:', tab?.url);
        
        if (!tab) {
            showToast('Nenhuma aba ativa encontrada', 'error');
            return;
        }
        
        // Verifica se é uma URL suportada (alvos canadenses)
        const supportedSites = ['linkedin.com', 'indeed.ca', 'indeed.com', 'jobbank.gc.ca', 'greenhouse.io', 'lever.co', 'ashbyhq.com', 'myworkdayjobs.com', 'glassdoor.ca'];
        const isSupported = supportedSites.some(site => tab.url?.includes(site));

        if (!isSupported) {
            showToast('Site não suportado. Use Job Bank, Indeed.ca, LinkedIn, Greenhouse, Lever...', 'error');
            console.log('[BryanAI Popup] Site não suportado:', tab.url);
            return;
        }
        
        // Tenta enviar mensagem para o content script
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'captureJobData' });
            console.log('[BryanAI Popup] Resposta do content script:', response);
            
            if (response && response.success) {
                document.getElementById('titulo').value = response.titulo || '';
                document.getElementById('descricao').value = response.descricao || '';
                showToast('Dados capturados!', 'success');
            } else {
                showToast('Não foi possível capturar. Tente recarregar a página (F5)', 'error');
            }
        } catch (sendError) {
            console.error('[BryanAI Popup] Erro ao enviar mensagem:', sendError);
            // Content script pode não estar carregado - tenta injetar manualmente
            showToast('Recarregue a página da vaga (F5) e tente novamente', 'error');
        }
    } catch (error) {
        console.error('[BryanAI Popup] Erro ao capturar:', error);
        showToast('Erro ao capturar. Cole manualmente.', 'error');
    }
}

async function saveToTracker() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return showToast('Nenhuma aba ativa.', 'error');

        const supportedSites = ['linkedin.com', 'indeed.ca', 'indeed.com', 'jobbank.gc.ca', 'greenhouse.io', 'lever.co', 'ashbyhq.com', 'myworkdayjobs.com', 'glassdoor.ca'];
        if (!supportedSites.some(site => tab.url?.includes(site))) {
            return showToast('Site não suportado para captura automática.', 'error');
        }

        showToast('Salvando vaga...', 'info');
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'saveJobToTracker' });
        if (response && response.success) {
            showToast(response.data?.deduped ? 'Vaga já estava salva (atualizada).' : 'Vaga salva no Kanban!', 'success');
        } else {
            showToast('Erro: ' + (response?.error || 'não foi possível salvar'), 'error');
        }
    } catch (e) {
        showToast('Recarregue a página da vaga (F5) e tente novamente.', 'error');
    }
}

async function showScoreBadge() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return showToast('Nenhuma aba ativa.', 'error');
        showToast('Analisando a vaga...', 'info');
        const r = await chrome.tabs.sendMessage(tab.id, { action: 'injectScoreBadge' });
        if (r && r.success) {
            showToast(`Score ${r.score}/100 — veja o badge na página.`, 'success');
            window.close();
        } else {
            showToast('Erro: ' + (r?.error || 'não foi possível analisar'), 'error');
        }
    } catch (e) {
        showToast('Recarregue a página da vaga (F5) e tente novamente.', 'error');
    }
}

async function togglePanel() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return showToast('Nenhuma aba ativa.', 'error');
        await chrome.tabs.sendMessage(tab.id, { action: 'toggleOverlay' });
        showToast('Painel alternado na página.', 'success');
        window.close();
    } catch (e) {
        showToast('Abra uma página de vaga e tente novamente (F5).', 'error');
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
        // Usa /analyze (análise completa com pontos fortes/gaps/keywords + veredictos
        // canadenses), não /quick (que só devolve score/resumo/fit).
        const response = await fetch(`${serverUrl}/api/jobfit/analyze`, {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify({ titulo, descricao })
        });

        const data = await response.json();

        if (data.success) {
            displayAnalysisResult(data.data.analise);
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
    const resultElement = document.getElementById('result');
    
    // Score
    scoreValue.textContent = data.score || '--';
    
    // Classe baseada no score
    scoreCard.className = 'score-card';
    fitBadge.className = 'fit-badge';

    const nivel = data.nivel_compatibilidade;
    if (data.score >= 80) {
        fitBadge.textContent = nivel || 'Excelente Match';
        fitBadge.classList.add('high');
    } else if (data.score >= 60) {
        scoreCard.classList.add('medium');
        fitBadge.textContent = nivel || 'Bom Match';
        fitBadge.classList.add('medium');
    } else {
        scoreCard.classList.add('low');
        fitBadge.textContent = nivel || 'Match Baixo';
        fitBadge.classList.add('low');
    }

    // Alerta canadense (bloqueio de autorização de trabalho)
    if (data.canadian && data.canadian.work_auth_verdict === 'needs_sponsorship_blocker') {
        strengthsList.innerHTML =
            '<li><span class="list-icon">⚠️</span> Esta vaga exige autorização de trabalho no Canadá que você não possui.</li>';
    } else if (data.pontos_fortes && data.pontos_fortes.length > 0) {
        // pontos_fortes são objetos { ponto, relevancia }
        strengthsList.innerHTML = data.pontos_fortes.map(item =>
            `<li><span class="list-icon">✓</span> ${item.ponto || item}</li>`
        ).join('');
    } else if (data.resumo_executivo) {
        strengthsList.innerHTML = `<li><span class="list-icon">📝</span> ${data.resumo_executivo}</li>`;
    } else {
        strengthsList.innerHTML = '<li><span class="list-icon">ℹ️</span> Análise concluída</li>';
    }

    // Gaps identificados são objetos { gap, criticidade, ... }
    const gaps = data.gaps_identificados;
    if (gaps && gaps.length > 0) {
        gapsList.innerHTML = gaps.map(item =>
            `<li><span class="list-icon">!</span> ${item.gap || item}</li>`
        ).join('');
        gapsList.parentElement.style.display = 'block';
    } else {
        gapsList.parentElement.style.display = 'none';
    }

    // Keywords ausentes (as que faltam no currículo)
    const keywords = data.keywords_match && data.keywords_match.ausentes;
    if (keywords && keywords.length > 0) {
        keywordsList.innerHTML = keywords.map(kw =>
            `<span class="keyword-tag">${kw}</span>`
        ).join('');
        keywordsList.parentElement.style.display = 'block';
    } else {
        keywordsList.parentElement.style.display = 'none';
    }
    
    // Mostra resultado com animação e scroll
    showElement('result');
    
    // Scroll automático para o resultado
    setTimeout(() => {
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Destaque visual temporário
        resultElement.style.animation = 'pulse 0.5s ease-in-out 2';
        setTimeout(() => {
            resultElement.style.animation = '';
        }, 1000);
    }, 100);
    
    // Mostra toast de sucesso
    showToast(`Análise concluída! Score: ${data.score}`, 'success');
}

function resetAnalysis() {
    hideElement('result');
    document.getElementById('titulo').value = '';
    document.getElementById('descricao').value = '';
}

// =====================================
// GERAÇÃO DE CURRÍCULO
// =====================================

let isGenerating = false;

async function generateResume(formato = 'pdf') {
    if (!isConnected) {
        showToast('Servidor offline', 'error');
        return;
    }
    
    if (isGenerating) {
        showToast('Já existe uma geração em andamento...', 'info');
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
    
    // Lock buttons and show loading
    isGenerating = true;
    setGenerateButtonsState(true);
    showToast('Gerando currículo... Aguarde.', 'info');
    
    try {
        console.log('[BryanAI] Gerando com template:', template);
        
        const response = await fetch(`${serverUrl}/api/jobfit/generate`, {
            method: 'POST',
            headers: await authHeaders(),
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
    } finally {
        // Unlock buttons
        isGenerating = false;
        setGenerateButtonsState(false);
    }
}

function setGenerateButtonsState(loading) {
    const buttons = [
        document.getElementById('btnDownloadPdf'),
        document.getElementById('btnGenPdf'),
        document.getElementById('btnGenDocx')
    ];
    
    buttons.forEach(btn => {
        if (btn) {
            btn.disabled = loading;
            if (loading) {
                btn.dataset.originalText = btn.textContent;
                btn.textContent = '⏳ Gerando...';
                btn.style.opacity = '0.6';
                btn.style.cursor = 'wait';
            } else {
                btn.textContent = btn.dataset.originalText || btn.textContent;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        }
    });
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
        const response = await fetch(`${serverUrl}/api/cover-letter`, {
            method: 'POST',
            headers: await authHeaders(),
            body: JSON.stringify({ titulo, empresa, descricao, tom, idioma: 'pt-BR' })
        });

        const data = await response.json();

        if (data.success) {
            currentCoverLetter = data.data.coverLetter;
            document.getElementById('coverLetterText').textContent = data.data.coverLetter;
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
