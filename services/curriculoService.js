/**
 * Service: Currículo
 * Agrega dados de todos os models para montar o currículo completo
 */

const { 
    Perfil, 
    Experiencia, 
    FormacaoProjeto, 
    EducacaoCurso, 
    Idioma 
} = require('../models');

/**
 * Monta o currículo completo do banco de dados
 * @returns {Object} Currículo completo
 */
async function getFullResume() {
    const [perfil, experiencias, formacao, cursos, idiomas] = await Promise.all([
        Perfil.get(),
        Experiencia.getAllFormatted(),
        FormacaoProjeto.getAll(),
        EducacaoCurso.getAll(),
        Idioma.getAll()
    ]);

    return {
        perfil,
        experiencias,
        formacao: formacao.filter(f => f.tipo === 'Educação'),
        projetos: formacao.filter(f => f.tipo !== 'Educação'),
        cursos_certificacoes: cursos,
        idiomas
    };
}

/**
 * Monta currículo resumido para análise rápida
 * @returns {Object} Currículo resumido
 */
async function getResumeSummary() {
    const curriculo = await getFullResume();
    
    return {
        perfil: {
            nome: curriculo.perfil?.nome_completo,
            resumo: curriculo.perfil?.resumo_base
        },
        experiencias: curriculo.experiencias.map(e => ({
            cargo: e.cargo,
            empresa: e.empresa,
            periodo: `${e.data_inicio} - ${e.data_fim}`,
            tags: e.tags_tecnicas
        })),
        skills: [...new Set(
            curriculo.experiencias
                .map(e => e.tags_tecnicas)
                .filter(Boolean)
                .join(', ')
                .split(', ')
                .map(s => s.trim())
        )],
        formacao: curriculo.formacao.map(f => f.titulo_curso),
        certificacoes: curriculo.cursos_certificacoes.map(c => c.titulo_do_curso),
        idiomas: curriculo.idiomas.map(i => `${i.idioma} (${i.nivel_cefr})`)
    };
}

/**
 * Valida se o currículo está completo
 * @returns {Object} Status de validação
 */
async function validateResume() {
    const curriculo = await getFullResume();
    const issues = [];

    if (!curriculo.perfil) {
        issues.push({ campo: 'Perfil', mensagem: 'Perfil não cadastrado', criticidade: 'alta' });
    } else {
        if (!curriculo.perfil.nome_completo) issues.push({ campo: 'Nome', mensagem: 'Nome não informado', criticidade: 'alta' });
        if (!curriculo.perfil.email) issues.push({ campo: 'Email', mensagem: 'Email não informado', criticidade: 'alta' });
        if (!curriculo.perfil.resumo_base) issues.push({ campo: 'Resumo', mensagem: 'Resumo profissional não informado', criticidade: 'media' });
    }

    if (!curriculo.experiencias || curriculo.experiencias.length === 0) {
        issues.push({ campo: 'Experiências', mensagem: 'Nenhuma experiência cadastrada', criticidade: 'media' });
    }

    if (!curriculo.formacao || curriculo.formacao.length === 0) {
        issues.push({ campo: 'Formação', mensagem: 'Nenhuma formação cadastrada', criticidade: 'baixa' });
    }

    return {
        valido: issues.filter(i => i.criticidade === 'alta').length === 0,
        completo: issues.length === 0,
        issues,
        completude: calculateCompletude(curriculo)
    };
}

/**
 * Calcula percentual de completude do currículo
 */
function calculateCompletude(curriculo) {
    let total = 0;
    let preenchido = 0;

    // Perfil (peso 30)
    total += 30;
    if (curriculo.perfil) {
        if (curriculo.perfil.nome_completo) preenchido += 5;
        if (curriculo.perfil.email) preenchido += 5;
        if (curriculo.perfil.telefone) preenchido += 3;
        if (curriculo.perfil.localizacao) preenchido += 2;
        if (curriculo.perfil.linkedin) preenchido += 3;
        if (curriculo.perfil.github) preenchido += 2;
        if (curriculo.perfil.resumo_base) preenchido += 10;
    }

    // Experiências (peso 35)
    total += 35;
    if (curriculo.experiencias && curriculo.experiencias.length > 0) {
        preenchido += Math.min(35, curriculo.experiencias.length * 15);
    }

    // Formação (peso 15)
    total += 15;
    if (curriculo.formacao && curriculo.formacao.length > 0) {
        preenchido += Math.min(15, curriculo.formacao.length * 7);
    }

    // Cursos (peso 10)
    total += 10;
    if (curriculo.cursos_certificacoes && curriculo.cursos_certificacoes.length > 0) {
        preenchido += Math.min(10, curriculo.cursos_certificacoes.length * 3);
    }

    // Idiomas (peso 10)
    total += 10;
    if (curriculo.idiomas && curriculo.idiomas.length > 0) {
        preenchido += Math.min(10, curriculo.idiomas.length * 5);
    }

    return Math.round((preenchido / total) * 100);
}

module.exports = {
    getFullResume,
    getResumeSummary,
    validateResume
};
