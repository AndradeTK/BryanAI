/**
 * Service: AI Analyzer (Gemini 2.0 Flash)
 * Analisa compatibilidade entre currículo e vaga (Job Fit)
 * Persona: Recrutador Técnico Sênior
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração do modelo
const modelConfig = {
    model: 'gemini-2.0-flash',
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
 * Usa dados mais completos para manter consistência com análise completa
 */
async function quickAnalysis(curriculo, vaga) {
    const model = genAI.getGenerativeModel({
        ...modelConfig,
        generationConfig: {
            ...modelConfig.generationConfig,
            maxOutputTokens: 1024
        }
    });

    // Prepara dados mais completos para análise consistente
    const experienciasDetalhadas = curriculo.experiencias?.map(e => ({
        cargo: e.cargo,
        empresa: e.empresa,
        periodo: `${e.data_inicio || ''} - ${e.data_fim || 'Atual'}`,
        descricao: e.descricao_atividades?.substring(0, 300) || e.descricao?.substring(0, 300) || '',
        conquistas: e.principais_conquistas?.substring(0, 200) || '',
        tecnologias: e.tags_tecnicas
    })) || [];

    const formacaoResumo = curriculo.formacao?.map(f => `${f.titulo_curso || f.titulo || ''} - ${f.instituicao_projeto || f.instituicao || ''}`).filter(x => x !== ' - ').join('; ') || '';
    const cursosResumo = curriculo.cursos_certificacoes?.map(c => c.titulo_do_curso || c.nome || c.titulo || '').filter(Boolean).join(', ') || '';
    const idiomasResumo = curriculo.idiomas?.map(i => `${i.idioma}: ${i.nivel || i.nivel_cefr || ''}`).filter(x => !x.endsWith(': ')).join(', ') || '';

    const prompt = `Você é um Recrutador Técnico Sênior muito experiente. Analise a compatibilidade entre o candidato e a vaga de forma JUSTA e EQUILIBRADA.

IMPORTANTE: Considere habilidades TRANSFERÍVEIS. Um desenvolvedor com experiência em uma stack pode facilmente aprender outra. Valorize:
- Anos de experiência relevante
- Projetos e conquistas demonstradas
- Capacidade de aprendizado (diversidade de tecnologias)
- Potencial de adaptação

CRITÉRIOS DE AVALIAÇÃO:
- Experiência técnica relevante e transferível (peso 35%)
- Tecnologias mencionadas OU similares/relacionadas (peso 25%)
- Nível de senioridade adequado (peso 15%)
- Soft skills e cultura fit (peso 15%)
- Formação e certificações (peso 10%)

ESCALA DE SCORE:
- 85-100: Match excelente - atende quase todos os requisitos
- 70-84: Bom match - atende requisitos principais, gaps menores
- 55-69: Match médio - experiência relevante mas gaps importantes
- 40-54: Match baixo - precisa desenvolver várias habilidades
- 0-39: Não recomendado - perfil muito diferente

CANDIDATO:
Resumo: ${curriculo.perfil?.resumo_base || 'Não informado'}

Experiências:
${JSON.stringify(experienciasDetalhadas, null, 1)}

Formação: ${formacaoResumo || 'Não informado'}
Cursos/Certificações: ${cursosResumo || 'Não informado'}
Idiomas: ${idiomasResumo || 'Não informado'}

VAGA: ${vaga.titulo}
${vaga.descricao?.substring(0, 1000)}

Retorne APENAS um JSON:
{"score": <0-100>, "resumo": "<análise em 1-2 frases destacando pontos positivos e gaps>", "fit": "<Baixo|Médio|Alto|Excelente>"}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        let cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Tenta extrair JSON válido mesmo se truncado
        try {
            return JSON.parse(cleanJson);
        } catch (parseError) {
            // Tenta corrigir JSON truncado
            console.log('JSON bruto recebido:', cleanJson);
            
            // Se termina com aspas abertas, tenta fechar
            if (cleanJson.includes('"resumo":') && !cleanJson.endsWith('}')) {
                // Extrai score e fit se possível
                const scoreMatch = cleanJson.match(/"score"\s*:\s*(\d+)/);
                const fitMatch = cleanJson.match(/"fit"\s*:\s*"([^"]+)"/);
                const resumoMatch = cleanJson.match(/"resumo"\s*:\s*"([^"]*)/); 
                
                return {
                    score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
                    fit: fitMatch ? fitMatch[1] : 'Médio',
                    resumo: resumoMatch ? resumoMatch[1] + '...' : 'Análise parcial - resposta truncada'
                };
            }
            throw parseError;
        }
    } catch (error) {
        console.error('Erro na análise rápida:', error);
        // Retorna um resultado padrão em caso de erro
        return {
            score: 50,
            fit: 'Médio',
            resumo: 'Não foi possível analisar completamente. Tente novamente.'
        };
    }
}

/**
 * Analisa currículo externo (texto extraído de PDF/DOCX) com vaga
 * @param {string} textoExtraido - Texto extraído do arquivo
 * @param {Object} vaga - Dados da vaga (titulo, descricao)
 * @returns {Object} Análise de compatibilidade
 */
async function analyzeExternalResume(textoExtraido, vaga) {
    const model = genAI.getGenerativeModel(modelConfig);

    const prompt = `${ANALYZER_SYSTEM_PROMPT}

CURRÍCULO DO CANDIDATO (texto extraído de arquivo):
---
${textoExtraido.substring(0, 10000)}
---

VAGA ALVO:
Título: ${vaga.titulo}
Descrição:
${vaga.descricao}

TAREFA: Analise a compatibilidade entre este currículo e a vaga. 
IMPORTANTE: O texto foi extraído automaticamente de um PDF/DOCX, ignore problemas de formatação.

Retorne EXCLUSIVAMENTE um JSON no seguinte formato:
{
    "score": <número de 0 a 100>,
    "nivel_compatibilidade": "<Baixo|Médio|Alto|Excelente>",
    "resumo_executivo": "<análise em 2-3 frases>",
    "candidato_identificado": {
        "nome": "<nome extraído ou 'Não identificado'>",
        "cargo_atual": "<cargo atual ou último>",
        "experiencia_anos": "<estimativa de anos de experiência>"
    },
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
        "<sugestão específica para adaptar o currículo para esta vaga>"
    ],
    "qualidade_curriculo": {
        "nota": <1-10>,
        "pontos_positivos": ["<o que está bom no formato/conteúdo>"],
        "melhorias_sugeridas": ["<sugestões de melhoria de formato/conteúdo>"]
    },
    "probabilidade_entrevista": "<Baixa|Média|Alta|Muito Alta>",
    "sugestao_proximos_passos": "<o que o candidato deve fazer para aumentar chances>"
}`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Limpa o texto de possíveis marcações markdown
        const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Erro na análise de currículo externo:', error);
        throw new Error(`Falha na análise de IA: ${error.message}`);
    }
}

module.exports = {
    analyzeJobFit,
    quickAnalysis,
    analyzeExternalResume
};
