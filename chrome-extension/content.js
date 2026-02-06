/**
 * BryanAI Chrome Extension - Content Script
 * Injeta funcionalidades nas páginas de vagas
 */

// Seletores para diferentes sites de emprego
const SITE_SELECTORS = {
    'linkedin.com': {
        titulo: [
            '.job-details-jobs-unified-top-card__job-title h1 a',
            '.job-details-jobs-unified-top-card__job-title h1',
            'h1.t-24.t-bold a',
            'h1.t-24.t-bold',
            '.jobs-unified-top-card__job-title',
            'h1.topcard__title'
        ],
        descricao: [
            '#job-details',
            '.jobs-description__content',
            '.jobs-box__html-content',
            '.jobs-description-content__text',
            '.description__text'
        ]
    },
    'gupy.io': {
        titulo: [
            'h1[data-testid="job-title"]',
            '.job-title h1',
            'h1.sc-*'
        ],
        descricao: [
            '[data-testid="job-description"]',
            '.job-description',
            '.sc-* .description'
        ]
    },
    'indeed.com': {
        titulo: [
            '.jobsearch-JobInfoHeader-title',
            'h1.icl-u-xs-mb--xs'
        ],
        descricao: [
            '#jobDescriptionText',
            '.jobsearch-jobDescriptionText'
        ]
    },
    'glassdoor.com': {
        titulo: [
            '.e1tk4kwz4',
            '[data-test="jobTitle"]'
        ],
        descricao: [
            '.jobDescriptionContent',
            '[data-test="description"]'
        ]
    },
    'vagas.com.br': {
        titulo: [
            'h1.titulo-vaga',
            '.informacoes-vaga h1'
        ],
        descricao: [
            '.descricao-vaga',
            '.job-description'
        ]
    },
    'catho.com.br': {
        titulo: [
            '.job-title h1',
            '[data-testid="job-title"]'
        ],
        descricao: [
            '.job-description',
            '[data-testid="job-description"]'
        ]
    },
    'infojobs.com.br': {
        titulo: [
            '.job-title h1',
            'h1.text-primary'
        ],
        descricao: [
            '.job-description',
            '.description-body'
        ]
    }
};

/**
 * Detecta o site atual
 */
function detectSite() {
    const hostname = window.location.hostname;
    for (const site of Object.keys(SITE_SELECTORS)) {
        if (hostname.includes(site)) {
            return site;
        }
    }
    return null;
}

/**
 * Tenta encontrar elemento usando múltiplos seletores
 */
function findElement(selectors) {
    for (const selector of selectors) {
        try {
            const element = document.querySelector(selector);
            if (element) return element;
        } catch (e) {
            continue;
        }
    }
    return null;
}

/**
 * Extrai texto limpo de um elemento
 */
function extractText(element) {
    if (!element) return '';
    return element.innerText
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Captura dados da vaga da página atual
 */
function captureJobData() {
    const site = detectSite();
    
    let titulo = '';
    let descricao = '';

    if (site && SITE_SELECTORS[site]) {
        const selectors = SITE_SELECTORS[site];
        
        const tituloElement = findElement(selectors.titulo);
        titulo = extractText(tituloElement);

        const descricaoElement = findElement(selectors.descricao);
        descricao = extractText(descricaoElement);
    }

    // Fallback: busca por padrões comuns
    if (!titulo) {
        const possibleTitles = document.querySelectorAll('h1');
        for (const h1 of possibleTitles) {
            const text = h1.innerText.trim();
            if (text.length > 5 && text.length < 200) {
                titulo = text;
                break;
            }
        }
    }

    if (!descricao) {
        // Tenta encontrar pelo conteúdo
        const keywords = ['descrição', 'description', 'responsabilidades', 'requisitos', 'requirements'];
        const allElements = document.querySelectorAll('div, section, article');
        
        for (const el of allElements) {
            const text = el.innerText.toLowerCase();
            const hasKeyword = keywords.some(kw => text.includes(kw));
            
            if (hasKeyword && el.innerText.length > 200 && el.innerText.length < 10000) {
                descricao = el.innerText.trim();
                break;
            }
        }
    }

    // Se ainda não encontrou, usa seleção do usuário
    if (!descricao) {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 50) {
            descricao = selection.toString().trim();
        }
    }

    return {
        success: !!(titulo || descricao),
        titulo,
        descricao,
        site: site || 'desconhecido',
        url: window.location.href
    };
}

/**
 * Adiciona botão flutuante na página
 */
function addFloatingButton() {
    // Verifica se já existe
    if (document.getElementById('bryanai-float-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'bryanai-float-btn';
    btn.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🚀 Analisar com BryanAI
        </div>
    `;

    btn.addEventListener('click', () => {
        // Abre o popup da extensão com os dados preenchidos
        const data = captureJobData();
        
        // Salva os dados para o popup usar
        chrome.storage.local.set({ 
            capturedJob: data,
            capturedAt: Date.now()
        });

        // Mostra notificação
        showNotification('Dados capturados! Abra a extensão para continuar.');
    });

    document.body.appendChild(btn);
}

/**
 * Mostra notificação na página
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        background: #1e40af;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureJobData') {
        const data = captureJobData();
        sendResponse(data);
    }
    return true;
});

// Inicialização
const site = detectSite();
if (site) {
    console.log('[BryanAI] Site de vagas detectado:', site);
    
    // Espera a página carregar completamente
    if (document.readyState === 'complete') {
        addFloatingButton();
    } else {
        window.addEventListener('load', addFloatingButton);
    }
}
