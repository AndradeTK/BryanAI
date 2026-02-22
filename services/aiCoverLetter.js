/**
 * Service: AI Cover Letter Generator
 * Gera cartas de apresentação personalizadas usando IA
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const aiCoverLetter = {
    /**
     * Gera uma cover letter personalizada
     * @param {Object} curriculo - Dados do currículo
     * @param {Object} vaga - Dados da vaga
     * @param {string} idioma - Idioma da carta (pt-BR, en, es)
     * @param {string} tom - Tom da carta (formal, entusiasmado, confiante)
     */
    async generate(curriculo, vaga, idioma = 'pt-BR', tom = 'formal') {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const idiomaMap = {
            'pt-BR': 'português brasileiro',
            'en': 'inglês',
            'fr': 'francês'
        };

        const tomDescricao = {
            'formal': 'profissional e formal, porém caloroso',
            'entusiasmado': 'entusiasmado e energético, mostrando paixão pela oportunidade',
            'confiante': 'confiante e direto, destacando conquistas mensuráveis'
        };

        const prompt = `
Você é um especialista em redação de Cover Letters (cartas de apresentação) para processos seletivos.

DADOS DO CANDIDATO:
Nome: ${curriculo.perfil?.nome_completo || 'Candidato'}
Email: ${curriculo.perfil?.email || ''}
Telefone: ${curriculo.perfil?.telefone || ''}
LinkedIn: ${curriculo.perfil?.linkedin || ''}

RESUMO PROFISSIONAL:
${curriculo.resumo || curriculo.perfil?.resumo_base || 'Não informado'}

EXPERIÊNCIAS:
${curriculo.experiencias?.map(e => `- ${e.cargo} na ${e.empresa} (${e.data_inicio} - ${e.data_fim || 'Atual'}): ${e.descricao_atividades || ''}`).join('\n') || 'Não informado'}

FORMAÇÃO:
${curriculo.formacao?.map(f => `- ${f.titulo_curso} - ${f.instituicao_projeto}`).join('\n') || 'Não informado'}

CERTIFICAÇÕES:
${curriculo.cursos?.map(c => `- ${c.titulo_do_curso} (${c.emissor_instituicao})`).join('\n') || 'Não informado'}

IDIOMAS:
${curriculo.idiomas?.map(i => `- ${i.idioma}: ${i.nivel_cefr}`).join('\n') || 'Não informado'}

---

VAGA ALVO:
Título: ${vaga.titulo}
Empresa: ${vaga.empresa || 'Não informada'}
Descrição:
${vaga.descricao}

---

INSTRUÇÕES:
1. Gere uma Cover Letter em ${idiomaMap[idioma]} com tom ${tomDescricao[tom]}
2. A carta deve ter no máximo 400 palavras
3. Estrutura obrigatória:
   - Saudação profissional
   - Abertura impactante (mencione a vaga e porque você é o candidato ideal)
   - 2-3 parágrafos conectando suas experiências aos requisitos da vaga
   - Fechamento com call-to-action
   - Despedida profissional

4. Use dados reais do candidato - seja específico com conquistas e resultados
5. Mencione keywords da descrição da vaga naturalmente
6. Evite clichês como "venho por meio desta" ou "desde já agradeço"

Responda APENAS com a Cover Letter, sem comentários adicionais.
`;

        try {
            const result = await model.generateContent(prompt);
            const coverLetter = result.response.text();

            return {
                success: true,
                coverLetter: coverLetter.trim(),
                metadata: {
                    idioma,
                    tom,
                    vaga_titulo: vaga.titulo,
                    empresa: vaga.empresa,
                    gerado_em: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Erro ao gerar Cover Letter:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Gera variações da cover letter
     */
    async generateVariations(curriculo, vaga, count = 3) {
        const tons = ['formal', 'entusiasmado', 'confiante'];
        const variations = [];

        for (let i = 0; i < Math.min(count, tons.length); i++) {
            const result = await this.generate(curriculo, vaga, 'pt-BR', tons[i]);
            if (result.success) {
                variations.push({
                    tom: tons[i],
                    texto: result.coverLetter
                });
            }
        }

        return {
            success: true,
            variations
        };
    },

    /**
     * Analisa e melhora uma cover letter existente
     */
    async improve(coverLetter, vaga) {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `
Analise e melhore esta Cover Letter para a vaga descrita.

COVER LETTER ATUAL:
${coverLetter}

VAGA:
Título: ${vaga.titulo}
Descrição: ${vaga.descricao}

Forneça:
1. Uma versão melhorada da Cover Letter (mais impactante e alinhada à vaga)
2. 3-5 pontos de melhoria específicos

Responda em JSON:
{
    "versao_melhorada": "texto da cover letter melhorada",
    "melhorias": [
        {"original": "trecho original", "sugestao": "como ficou melhor", "motivo": "porque a mudança"}
    ],
    "score_original": 0-100,
    "score_melhorado": 0-100
}
`;

        try {
            const result = await model.generateContent(prompt);
            let responseText = result.response.text();
            
            // Limpa markdown se presente
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            return {
                success: true,
                analysis: JSON.parse(responseText)
            };
        } catch (error) {
            console.error('Erro ao melhorar Cover Letter:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

module.exports = aiCoverLetter;
