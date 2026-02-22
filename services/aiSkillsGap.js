/**
 * Service: AI Skills Gap Analyzer
 * Analisa gaps de habilidades e gera roadmap de desenvolvimento
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const aiSkillsGap = {
    /**
     * Analisa gaps de habilidades baseado em uma vaga ou cargo alvo
     * @param {Object} curriculo - Dados do currículo
     * @param {Object} alvo - Vaga ou cargo alvo
     */
    async analyze(curriculo, alvo) {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
Você é um especialista em desenvolvimento de carreira e análise de competências.

PERFIL ATUAL DO CANDIDATO:
Nome: ${curriculo.perfil?.nome_completo || 'Candidato'}

EXPERIÊNCIAS:
${curriculo.experiencias?.map(e => `- ${e.cargo} na ${e.empresa}: ${e.descricao_atividades || ''} | Tags: ${e.tags_tecnicas || ''}`).join('\n') || 'Não informado'}

FORMAÇÃO:
${curriculo.formacao?.map(f => `- ${f.titulo_curso} - ${f.instituicao_projeto} (${f.status})`).join('\n') || 'Não informado'}

CERTIFICAÇÕES:
${curriculo.cursos?.map(c => `- ${c.titulo_do_curso} (${c.emissor_instituicao})`).join('\n') || 'Não informado'}

IDIOMAS:
${curriculo.idiomas?.map(i => `- ${i.idioma}: ${i.nivel_cefr}`).join('\n') || 'Não informado'}

---

CARGO/VAGA ALVO:
Título: ${alvo.titulo}
${alvo.descricao ? `Descrição: ${alvo.descricao}` : ''}
${alvo.nivel ? `Nível: ${alvo.nivel}` : ''}

---

Faça uma análise completa de Skills Gap e gere um roadmap de desenvolvimento.

Responda em JSON válido com a seguinte estrutura:
{
    "analise_geral": {
        "score_compatibilidade": 0-100,
        "nivel_atual": "string (Junior, Pleno, Sênior, etc)",
        "nivel_alvo": "string",
        "tempo_estimado_transicao": "string (ex: 6-12 meses)",
        "resumo": "string com 2-3 frases resumindo a situação"
    },
    "habilidades_atuais": {
        "tecnicas": ["skill1", "skill2"],
        "soft_skills": ["skill1", "skill2"],
        "nivel_proficiencia": {
            "skill1": "avançado",
            "skill2": "intermediário"
        }
    },
    "gaps_identificados": [
        {
            "categoria": "Técnica|Soft Skill|Certificação|Idioma",
            "habilidade": "nome da habilidade",
            "importancia": "Crítica|Alta|Média|Baixa",
            "descricao": "porque essa habilidade é necessária",
            "tempo_para_desenvolver": "string"
        }
    ],
    "roadmap": {
        "fase_1": {
            "titulo": "string",
            "duracao": "string",
            "objetivos": ["obj1", "obj2"],
            "recursos": [
                {"tipo": "Curso|Livro|Projeto|Certificação", "nome": "nome", "link": "url se aplicável", "tempo": "string"}
            ]
        },
        "fase_2": {
            "titulo": "string",
            "duracao": "string",
            "objetivos": ["obj1", "obj2"],
            "recursos": [
                {"tipo": "string", "nome": "nome", "link": "url", "tempo": "string"}
            ]
        },
        "fase_3": {
            "titulo": "string",
            "duracao": "string",
            "objetivos": ["obj1", "obj2"],
            "recursos": [
                {"tipo": "string", "nome": "nome", "link": "url", "tempo": "string"}
            ]
        }
    },
    "certificacoes_recomendadas": [
        {"nome": "string", "emissor": "string", "prioridade": "Alta|Média|Baixa", "link": "url", "custo_estimado": "string"}
    ],
    "projetos_sugeridos": [
        {"tipo": "Portfolio|Open Source|Side Project", "descricao": "string", "habilidades_desenvolvidas": ["skill1", "skill2"]}
    ],
    "mentoria_networking": {
        "comunidades": ["nome da comunidade"],
        "eventos": ["tipo de evento"],
        "perfis_para_seguir": ["área/tipo de profissional"]
    },
    "proximos_passos": [
        {"prazo": "Essa semana|Esse mês|3 meses", "acao": "string"}
    ]
}

Seja específico com links reais de cursos (Coursera, Udemy, LinkedIn Learning, YouTube), certificações (AWS, Google, Microsoft, etc) e recursos quando possível.
`;

        try {
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            
            // Limpa markdown se presente
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            const analysis = JSON.parse(responseText);

            return {
                success: true,
                analysis,
                metadata: {
                    cargo_alvo: alvo.titulo,
                    gerado_em: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Erro ao analisar Skills Gap:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Compara o perfil com múltiplas vagas do mercado
     */
    async compareMarket(curriculo, area) {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
Analise o perfil do candidato e compare com as demandas atuais do mercado na área de ${area}.

PERFIL DO CANDIDATO:
${JSON.stringify({
    experiencias: curriculo.experiencias?.map(e => ({ cargo: e.cargo, empresa: e.empresa, tags: e.tags_tecnicas })),
    formacao: curriculo.formacao?.map(f => f.titulo_curso),
    certificacoes: curriculo.cursos?.map(c => c.titulo_do_curso),
    idiomas: curriculo.idiomas?.map(i => `${i.idioma} ${i.nivel_cefr}`)
}, null, 2)}

Responda em JSON:
{
    "posicao_mercado": "string descrevendo onde o candidato se posiciona no mercado",
    "score_empregabilidade": 0-100,
    "tendencias": [
        {"tecnologia": "string", "status": "Em alta|Estável|Em queda", "candidato_tem": true/false}
    ],
    "diferenciais": ["o que destaca o candidato"],
    "pontos_atencao": ["o que pode prejudicar"],
    "salario_estimado": {
        "junior": "faixa",
        "pleno": "faixa",
        "senior": "faixa",
        "posicao_candidato": "nível estimado"
    },
    "empresas_match": ["tipos de empresas que combinam com o perfil"]
}
`;

        try {
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            return {
                success: true,
                marketAnalysis: JSON.parse(responseText)
            };
        } catch (error) {
            console.error('Erro na análise de mercado:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Gera um plano de estudos personalizado
     */
    async generateStudyPlan(gaps, horasPorSemana = 10) {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
Crie um plano de estudos detalhado para preencher os seguintes gaps de habilidades.

GAPS A PREENCHER:
${JSON.stringify(gaps, null, 2)}

DISPONIBILIDADE: ${horasPorSemana} horas por semana

Responda em JSON:
{
    "plano_semanal": [
        {
            "semana": 1,
            "foco": "tema principal",
            "atividades": [
                {"dia": "Segunda", "duracao": "2h", "atividade": "descrição", "recurso": "link/nome"}
            ],
            "meta": "o que deve conseguir fazer ao final da semana"
        }
    ],
    "marcos": [
        {"semana": 4, "conquista": "o que terá aprendido"}
    ],
    "kpis": ["como medir progresso"],
    "dicas_produtividade": ["dicas para manter consistência"]
}

Crie um plano de 12 semanas.
`;

        try {
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            return {
                success: true,
                studyPlan: JSON.parse(responseText)
            };
        } catch (error) {
            console.error('Erro ao gerar plano de estudos:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

module.exports = aiSkillsGap;
