/**
 * Service: AI Writer (Gemini 2.0 Flash)
 * Reescreve experiências do currículo otimizadas para ATS
 * Persona: Engenheiro de ATS + Copywriter de Carreira
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração do modelo
const modelConfig = {
    model: 'gemini-2.0-flash',
    generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
    }
};

/**
 * Prompt do Engenheiro de ATS
 */
const WRITER_SYSTEM_PROMPT = `Você é um especialista em otimização de currículos para sistemas ATS (Applicant Tracking Systems) e um copywriter de carreira premiado. Você domina a "Fórmula Mágica" para bullet points de currículo.

A FÓRMULA MÁGICA:
[Verbo de Ação no Passado] + [Tarefa/Responsabilidade] + [Resultado Quantificável ou Impacto]

EXEMPLOS:
❌ Ruim: "Responsável por vendas"
✅ Bom: "Impulsionei vendas em 40% implementando estratégia de upselling para 200+ clientes"

❌ Ruim: "Trabalhei com Node.js"
✅ Bom: "Desenvolvi 15 APIs RESTful em Node.js reduzindo tempo de resposta em 60%"

VERBOS DE AÇÃO PODEROSOS (use variados):
- Desenvolvimento: Arquitetei, Desenvolvi, Implementei, Projetei, Construí, Otimizei
- Liderança: Liderei, Coordenei, Gerenciei, Supervisionei, Mentoreei
- Melhoria: Aprimorei, Modernizei, Reestruturei, Automatizei, Escalei
- Resultados: Entreguei, Alcancei, Excedi, Impulsionei, Reduzi, Aumentei

REGRAS DE OURO:
1. Máximo 3-5 bullet points por experiência
2. Cada bullet deve ter entre 1-2 linhas
3. Incluir métricas sempre que possível (%, números, tempo)
4. Usar keywords da vaga naturalmente
5. Evitar jargões genéricos como "responsável por"
6. Priorizar conquistas sobre responsabilidades
7. Manter consistência no tempo verbal (passado para exp. anteriores, presente para atual)`;

/**
 * Reescreve as experiências do currículo
 * @param {Object} curriculo - Dados completos do currículo
 * @param {Object} vaga - Dados da vaga
 * @param {Object} analise - Resultado da análise de Job Fit
 * @param {string} idioma - Idioma do currículo (pt-BR, en, fr)
 * @returns {Object} Currículo reescrito
 */
async function rewriteResume(curriculo, vaga, analise = null, idioma = 'pt-BR') {
    const model = genAI.getGenerativeModel(modelConfig);

    const keywordsToFocus = analise?.keywords_match?.ausentes?.join(', ') || '';
    const experienciasDestacar = analise?.experiencias_destacar?.join(', ') || '';
    
    // Mapeia idioma para instruções
    const idiomaInstrucoes = {
        'pt-BR': {
            instrucao: 'Escreva TODO o conteúdo em Português do Brasil.',
            verbos: 'Use verbos de ação no passado: Desenvolvi, Implementei, Liderei, Otimizei, Entreguei, Alcancei, etc.',
            periodo: 'Use "Atual" para empregos atuais.',
            extra: ''
        },
        'en': {
            instrucao: 'Write ALL content in English. This is MANDATORY for EVERY field.',
            verbos: 'Use past tense action verbs: Developed, Implemented, Led, Optimized, Delivered, Achieved, Spearheaded, Architected, etc.',
            periodo: 'Use "Present" for current jobs, not "Atual".',
            extra: `CRITICAL TRANSLATION RULES:
- Job titles must be in English (e.g., "Desenvolvedor" → "Developer", "Analista" → "Analyst", "Estagiário" → "Intern")
- All bullet points and descriptions in English
- Professional summary in English
- Skill categories in English
- Date format: "Jan 2020 - Present" (not "Jan 2020 - Atual")
- Even if the original is in Portuguese, OUTPUT MUST BE 100% IN ENGLISH`
        },
        'fr': {
            instrucao: 'Rédigez TOUT le contenu en français. C\'est OBLIGATOIRE pour CHAQUE champ.',
            verbos: 'Utilisez des verbes d\'action au passé: Développé, Implémenté, Dirigé, Optimisé, Livré, Atteint, Piloté, Architecturé, etc.',
            periodo: 'Utilisez "Présent" pour les emplois actuels.',
            extra: `RÈGLES DE TRADUCTION CRITIQUES:
- Les titres de poste doivent être en français (ex: "Developer" → "Développeur", "Analyst" → "Analyste")
- Toutes les descriptions en français
- Résumé professionnel en français
- Format de date: "Jan 2020 - Présent"`
        }
    };
    const langConfig = idiomaInstrucoes[idioma] || idiomaInstrucoes['pt-BR'];

    const prompt = `${WRITER_SYSTEM_PROMPT}

IDIOMA OBRIGATÓRIO: ${langConfig.instrucao}
${langConfig.verbos}
${langConfig.periodo || ''}
${langConfig.extra || ''}

DADOS ORIGINAIS DO CANDIDATO:
${JSON.stringify(curriculo, null, 2)}

VAGA ALVO:
Título: ${vaga.titulo}
Descrição: ${vaga.descricao}

${keywordsToFocus ? `KEYWORDS IMPORTANTES PARA INCLUIR: ${keywordsToFocus}` : ''}
${experienciasDestacar ? `EXPERIÊNCIAS PARA DESTACAR: ${experienciasDestacar}` : ''}

TAREFA: Reescreva o currículo otimizado para esta vaga. 

IMPORTANTE - ORDENAÇÃO CRONOLÓGICA:
- As experiências devem estar em ordem CRONOLÓGICA REVERSA (mais recente primeiro)
- Use a data_fim ou "${langConfig.periodo?.includes('Present') ? 'Present' : langConfig.periodo?.includes('Présent') ? 'Présent' : 'Atual'}" para ordenar - experiências atuais sempre no topo
- Depois ordene por data_inicio, do mais recente para o mais antigo

IMPORTANTE - TRADUÇÕES:
- O campo "periodo" deve estar no idioma solicitado (ex: "Jan 2020 - Present" para inglês, "Jan 2020 - Atual" para português)
- O campo "cargo" deve estar no idioma solicitado (ex: "Software Developer" para inglês)
- O "titulo_profissional" deve refletir o cargo alvo da vaga no idioma solicitado

Retorne EXCLUSIVAMENTE um JSON:
{
    "titulo_profissional": "<título profissional otimizado para a vaga, no idioma solicitado>",
    "resumo_profissional": "<resumo de 3-4 linhas otimizado para a vaga, em primeira pessoa, no idioma solicitado>",
    "experiencias": [
        {
            "empresa": "<nome da empresa>",
            "cargo": "<cargo NO IDIOMA SOLICITADO>",
            "periodo": "<data_inicio - data_fim NO IDIOMA SOLICITADO, ex: Jan 2020 - Present>",
            "bullets": [
                "<bullet point 1 seguindo a fórmula mágica, NO IDIOMA SOLICITADO>",
                "<bullet point 2>",
                "<bullet point 3>"
            ]
        }
    ],
    "habilidades_tecnicas": {
        "principais": ["<tecnologias mais relevantes para a vaga>"],
        "secundarias": ["<outras tecnologias>"]
    },
    "diferenciais": [
        "<ponto diferencial 1, NO IDIOMA SOLICITADO>",
        "<ponto diferencial 2>"
    ],
    "keywords_otimizadas": ["<lista de keywords inseridas no currículo>"]
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Erro ao reescrever currículo:', error);
        throw new Error(`Falha na reescrita de IA: ${error.message}`);
    }
}

/**
 * Gera apenas o resumo profissional otimizado
 */
async function generateSummary(perfil, vaga) {
    const model = genAI.getGenerativeModel({
        ...modelConfig,
        generationConfig: {
            ...modelConfig.generationConfig,
            maxOutputTokens: 512
        }
    });

    const prompt = `Você é um copywriter de currículos especialista. 
    
PERFIL: ${perfil.resumo_base}
VAGA: ${vaga.titulo} - ${vaga.descricao?.substring(0, 300)}

Escreva um resumo profissional de 3-4 linhas otimizado para esta vaga. 
Use primeira pessoa implícita. Seja direto e impactante.
Retorne APENAS o texto do resumo, sem JSON ou formatação.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error('Erro ao gerar resumo:', error);
        throw error;
    }
}

/**
 * Reescreve um único bullet point
 */
async function rewriteBullet(originalBullet, vaga, context = '') {
    const model = genAI.getGenerativeModel({
        ...modelConfig,
        generationConfig: {
            ...modelConfig.generationConfig,
            maxOutputTokens: 256
        }
    });

    const prompt = `Reescreva este bullet point de currículo usando a fórmula: [Verbo de Ação] + [Tarefa] + [Resultado]

ORIGINAL: ${originalBullet}
CONTEXTO DA VAGA: ${vaga.titulo}
${context ? `CONTEXTO ADICIONAL: ${context}` : ''}

Retorne APENAS o bullet point reescrito, sem explicações.`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error('Erro ao reescrever bullet:', error);
        throw error;
    }
}

module.exports = {
    rewriteResume,
    generateSummary,
    rewriteBullet
};
