/**
 * Models Index
 * Exporta todos os models do sistema
 */

const Perfil = require('./Perfil');
const Experiencia = require('./Experiencia');
const FormacaoProjeto = require('./FormacaoProjeto');
const EducacaoCurso = require('./EducacaoCurso');
const Idioma = require('./Idioma');
const HistoricoGeracao = require('./HistoricoGeracao');

module.exports = {
    Perfil,
    Experiencia,
    FormacaoProjeto,
    EducacaoCurso,
    Idioma,
    HistoricoGeracao
};
