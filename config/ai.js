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
    parseAIJson
};
