/**
 * BryanAI Chrome Extension - Popup Script
 * Gerencia a interface do popup e comunicação com o servidor
 */

// Configuração padrão
const DEFAULT_SERVER_URL = 'http://localhost:3000';

// Elementos DOM
let serverUrl = DEFAULT_SERVER_URL;
let isConnected = false;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar configurações salvas
    const config = await chrome.storage.local.get(['serverUrl']);
    serverUrl = config.serverUrl || DEFAULT_SERVER_URL;
    document.getElementById('serverUrl').value = serverUrl;

    // Verificar conexão com o servidor
    await checkConnection();

    // Event listeners
    document.getElementById('captureBtn').addEventListener('click', captureFromPage);
    document.getElementById('analyzeBtn').addEventListener('click', analyzeJob);
    document.getElementById('generateBtn').addEventListener('click', generateResume);
    document.getElementById('saveConfig').addEventListener('click', saveConfig);
});

/**
 * Verifica conexão com o servidor
 */
async function checkConnection() {
    const statusBox = document.getElementById('connectionStatus');
    
    try {
        const response = await fetch(`${serverUrl}/api/curriculo/validar`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            isConnected = true;
            statusBox.className = 'status-box success';
            statusBox.innerHTML = `
                <h3>✅ Conectado ao BryanAI</h3>
                <p>Currículo ${data.data?.completude || 0}% completo</p>
            `;
        } else {
            throw new Error('Servidor não respondeu corretamente');
        }
    } catch (error) {
        isConnected = false;
        statusBox.className = 'status-box error';
        statusBox.innerHTML = `
            <h3>❌ Servidor offline</h3>
            <p>Verifique se o servidor está rodando em ${serverUrl}</p>
        `;
    }
}

/**
 * Captura dados da página atual
 */
async function captureFromPage() {
    const captureBtn = document.getElementById('captureBtn');
    captureBtn.disabled = true;
    captureBtn.textContent = 'Capturando...';

    try {
        // Envia mensagem para o content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'captureJobData' });
        
        if (response && response.success) {
            document.getElementById('titulo').value = response.titulo || '';
            document.getElementById('descricao').value = response.descricao || '';
            showToast('Dados capturados com sucesso!', 'success');
        } else {
            showToast('Não foi possível capturar os dados desta página', 'error');
        }
    } catch (error) {
        console.error('Erro ao capturar:', error);
        showToast('Erro ao capturar dados. Tente colar manualmente.', 'error');
    } finally {
        captureBtn.disabled = false;
        captureBtn.textContent = '📋 Capturar da Página';
    }
}

/**
 * Analisa compatibilidade com a vaga
 */
async function analyzeJob() {
    if (!isConnected) {
        showToast('Conecte-se ao servidor primeiro', 'error');
        return;
    }

    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();

    if (!titulo || !descricao) {
        showToast('Preencha o título e a descrição', 'error');
        return;
    }

    showLoading(true);
    hideResult();

    try {
        const response = await fetch(`${serverUrl}/api/jobfit/quick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, descricao })
        });

        const data = await response.json();

        if (data.success) {
            showResult(data.data);
        } else {
            showToast('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Erro na análise:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Gera currículo otimizado
 */
async function generateResume() {
    if (!isConnected) {
        showToast('Conecte-se ao servidor primeiro', 'error');
        return;
    }

    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const idioma = document.getElementById('idioma').value;

    if (!titulo || !descricao) {
        showToast('Preencha o título e a descrição', 'error');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${serverUrl}/api/jobfit/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, descricao, formato: 'pdf', idioma })
        });

        const data = await response.json();

        if (data.success) {
            showResult(data.data.analise);
            showToast(`Currículo gerado! Score: ${data.data.score}`, 'success');
            
            // Baixar o arquivo gerado
            if (data.data.arquivo && data.data.arquivo.nome) {
                const downloadUrl = `${serverUrl}/api/arquivos/${data.data.arquivo.nome}`;
                chrome.downloads.download({ url: downloadUrl, filename: data.data.arquivo.nome });
            }
        } else {
            showToast('Erro: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Erro ao gerar:', error);
        showToast('Erro ao conectar com o servidor', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Exibe o resultado da análise
 */
function showResult(data) {
    const resultBox = document.getElementById('resultBox');
    const scoreCircle = document.getElementById('scoreCircle');
    const fitLevel = document.getElementById('fitLevel');
    const resultSummary = document.getElementById('resultSummary');

    scoreCircle.textContent = data.score;
    
    // Define cor baseada no score
    if (data.score >= 80) {
        scoreCircle.className = 'score-circle high';
    } else if (data.score >= 60) {
        scoreCircle.className = 'score-circle medium';
    } else {
        scoreCircle.className = 'score-circle low';
    }

    fitLevel.textContent = `Compatibilidade: ${data.fit || data.nivel_compatibilidade || 'N/A'}`;
    resultSummary.textContent = data.resumo || data.resumo_executivo || '';

    resultBox.classList.add('visible');
}

/**
 * Esconde resultado
 */
function hideResult() {
    document.getElementById('resultBox').classList.remove('visible');
}

/**
 * Mostra/esconde loading
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    const form = document.getElementById('jobForm');
    
    if (show) {
        loading.classList.add('visible');
        form.style.display = 'none';
    } else {
        loading.classList.remove('visible');
        form.style.display = 'block';
    }
}

/**
 * Salva configurações
 */
async function saveConfig() {
    const newUrl = document.getElementById('serverUrl').value.trim();
    
    if (!newUrl) {
        showToast('URL inválida', 'error');
        return;
    }

    serverUrl = newUrl;
    await chrome.storage.local.set({ serverUrl });
    showToast('Configurações salvas!', 'success');
    await checkConnection();
}

/**
 * Mostra notificação toast simples
 */
function showToast(message, type = 'info') {
    // Cria elemento toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        color: white;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
