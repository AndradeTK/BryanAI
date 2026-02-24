/**
 * Configuração centralizada do Google Gemini AI
 * Singleton compartilhado entre todos os serviços de IA
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY não configurada. Configure no arquivo .env');
    console.error('   Obtenha sua chave em: https://aistudio.google.com/app/apikey');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Nome do modelo centralizado — altere aqui para trocar em todos os serviços
const AI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

/**
 * Executa chamada à IA com retry e exponential backoff para lidar com 429
 * @param {Function} fn - Função async que faz a chamada à IA
 * @param {number} maxRetries - Número máximo de tentativas (padrão: 3)
 * @param {number} baseDelay - Delay base em ms (padrão: 2000)
 * @returns {*} Resultado da chamada
 */
async function withRetry(fn, maxRetries = 1, baseDelay = 2000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Resource exhausted');
            
            if (is429 && attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
                console.warn(`[AI] Rate limit (429) na tentativa ${attempt + 1}/${maxRetries + 1}. Aguardando ${Math.round(delay)}ms antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            throw error;
        }
    }
}

/**
 * Delay helper para espaçar chamadas sequenciais à API
 * @param {number} ms - Milissegundos para aguardar
 */
async function delay(ms = 1500) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limpa resposta da IA removendo marcações markdown de code block
 * @param {string} text - Texto bruto da resposta da IA
 * @returns {string} JSON limpo
 */
function cleanAIResponse(text) {
    return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

/**
 * Faz parse seguro do JSON retornado pela IA
 * @param {string} text - Texto bruto da resposta
 * @param {string} context - Contexto para mensagem de erro
 * @returns {Object} Objeto parseado
 */
function parseAIJson(text, context = 'AI') {
    const clean = cleanAIResponse(text);
    try {
        return JSON.parse(clean);
    } catch (error) {
        console.error(`[${context}] JSON inválido recebido da IA:`, clean.substring(0, 500));
        throw new Error(`Resposta inválida da IA. Tente novamente.`);
    }
}

module.exports = {
    genAI,
    AI_MODEL,
    cleanAIResponse,
    parseAIJson,
    withRetry,
    delay
};
