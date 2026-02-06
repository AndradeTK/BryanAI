/**
 * Controllers Index
 * Exporta todos os controllers do sistema
 */

const DashboardController = require('./DashboardController');
const PerfilController = require('./PerfilController');
const ExperienciaController = require('./ExperienciaController');
const FormacaoProjetoController = require('./FormacaoProjetoController');
const EducacaoCursoController = require('./EducacaoCursoController');
const IdiomaController = require('./IdiomaController');
const JobFitController = require('./JobFitController');
const ConversaoController = require('./ConversaoController');

module.exports = {
    DashboardController,
    PerfilController,
    ExperienciaController,
    FormacaoProjetoController,
    EducacaoCursoController,
    IdiomaController,
    JobFitController,
    ConversaoController
};
