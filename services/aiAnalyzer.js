/**
 * Service: AI Analyzer (Gemini 2.5 Flash)
 * Analisa compatibilidade entre currículo e vaga (Job Fit)
 * Persona: Recrutador Técnico Sênior
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração do modelo
const modelConfig = {
    model: 'gemini-2.5-flash',
    generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
    }
};

/**
 * Prompt do Recrutador Técnico Sênior
 */
const ANALYZER_SYSTEM_PROMPT = `Você é um Recrutador Técnico Sênior com mais de 15 anos de experiência em empresas de tecnologia de ponta (FAANG, startups unicórnio). Sua especialidade é avaliar a compatibilidade entre candidatos e vagas com precisão cirúrgica.

SUAS RESPONSABILIDADES:
1. Analisar o currículo do candidato contra os requisitos da vaga
2. Calcular um score de compatibilidade de 0 a 100
3. Identificar gaps técnicos e comportamentais
4. Sugerir pontos de melhoria específicos
5. Destacar os pontos fortes que devem ser enfatizados

CRITÉRIOS DE AVALIAÇÃO:
- Experiência técnica relevante (peso 35%)
- Tecnologias e ferramentas mencionadas (peso 25%)
- Nível de senioridade adequado (peso 15%)
- Soft skills e cultura fit (peso 15%)
- Formação e certificações (peso 10%)

REGRAS OBRIGATÓRIAS:
- Sempre retorne APENAS um JSON válido, sem markdown ou explicações adicionais
- Seja objetivo e direto na análise
- Considere experiências transferíveis
- Valorize projetos pessoais e contribuições open source
- Considere o potencial de crescimento do candidato`;

/**
 * Analisa a compatibilidade entre currículo e vaga
 * @param {Object} curriculo - Dados completos do currículo
 * @param {Object} vaga - Dados da vaga (titulo, descricao)
 * @returns {Object} Análise de compatibilidade
 */
async function analyzeJobFit(curriculo, vaga) {
    const model = genAI.getGenerativeModel(modelConfig);

    const prompt = `${ANALYZER_SYSTEM_PROMPT}

DADOS DO CANDIDATO:
${JSON.stringify(curriculo, null, 2)}

VAGA ALVO:
Título: ${vaga.titulo}
Descrição:
${vaga.descricao}

TAREFA: Analise a compatibilidade e retorne EXCLUSIVAMENTE um JSON no seguinte formato:
{
    "score": <número de 0 a 100>,
    "nivel_compatibilidade": "<Baixo|Médio|Alto|Excelente>",
    "resumo_executivo": "<análise em 2-3 frases>",
    "pontos_fortes": [
        {"ponto": "<descrição>", "relevancia": "<Alta|Média>"}
    ],
    "gaps_identificados": [
        {"gap": "<descrição>", "criticidade": "<Crítico|Importante|Menor>", "sugestao_acao": "<como resolver>"}
    ],
    "keywords_match": {
        "presentes": ["<keywords do candidato que batem com a vaga>"],
        "ausentes": ["<keywords importantes da vaga que faltam no currículo>"]
    },
    "recomendacoes_adaptacao": [
        "<sugestão específica para adaptar o currículo>"
    ],
    "experiencias_destacar": [
        "<nome da experiência que mais se relaciona com a vaga>"
    ],
    "probabilidade_entrevista": "<Baixa|Média|Alta|Muito Alta>"
}`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Limpa o texto de possíveis marcações markdown
        const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Erro na análise de Job Fit:', error);
        throw new Error(`Falha na análise de IA: ${error.message}`);
    }
}

/**
 * Análise rápida - retorna apenas score e resumo
 */
async function quickAnalysis(curriculo, vaga) {
    const model = genAI.getGenerativeModel({
        ...modelConfig,
        generationConfig: {
            ...modelConfig.generationConfig,
            maxOutputTokens: 1024
        }
    });

    const prompt = `Você é um recrutador técnico experiente. Analise rapidamente a compatibilidade:

CANDIDATO (resumo): ${curriculo.perfil?.resumo_base || 'Não informado'}
EXPERIÊNCIAS: ${curriculo.experiencias?.map(e => `${e.cargo} em ${e.empresa}`).join(', ') || 'Não informado'}
SKILLS: ${curriculo.experiencias?.map(e => e.tags_tecnicas).filter(Boolean).join(', ') || 'Não informado'}

VAGA: ${vaga.titulo}
${vaga.descricao?.substring(0, 500)}...

Retorne APENAS um JSON:
{"score": <0-100>, "resumo": "<1 frase>", "fit": "<Baixo|Médio|Alto>"}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Erro na análise rápida:', error);
        throw error;
    }
}

module.exports = {
    analyzeJobFit,
    quickAnalysis
};
