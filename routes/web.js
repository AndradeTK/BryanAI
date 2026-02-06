/**
 * Routes: Web Routes
 * Rotas para renderização de páginas EJS
 */

const express = require('express');
const router = express.Router();
const {
    DashboardController,
    PerfilController,
    ExperienciaController,
    FormacaoProjetoController,
    EducacaoCursoController,
    IdiomaController,
    JobFitController
} = require('../controllers');

// =====================================
// Dashboard
// =====================================
router.get('/', DashboardController.index);
router.get('/dashboard', DashboardController.index);

// =====================================
// Perfil
// =====================================
router.get('/perfil', PerfilController.index);
router.get('/perfil/form', PerfilController.form);
router.post('/perfil', PerfilController.save);

// =====================================
// Experiências
// =====================================
router.get('/experiencias', ExperienciaController.index);
router.get('/experiencias/new', ExperienciaController.create);
router.get('/experiencias/:id/edit', ExperienciaController.edit);
router.post('/experiencias', ExperienciaController.store);
router.post('/experiencias/:id', ExperienciaController.update);
router.post('/experiencias/:id/delete', ExperienciaController.destroy);

// =====================================
// Formação e Projetos
// =====================================
router.get('/formacao', FormacaoProjetoController.index);
router.get('/formacao/new', FormacaoProjetoController.create);
router.get('/formacao/:id/edit', FormacaoProjetoController.edit);
router.post('/formacao', FormacaoProjetoController.store);
router.post('/formacao/:id', FormacaoProjetoController.update);
router.post('/formacao/:id/delete', FormacaoProjetoController.destroy);

// =====================================
// Cursos e Certificações
// =====================================
router.get('/cursos', EducacaoCursoController.index);
router.get('/cursos/new', EducacaoCursoController.create);
router.get('/cursos/:id/edit', EducacaoCursoController.edit);
router.post('/cursos', EducacaoCursoController.store);
router.post('/cursos/:id', EducacaoCursoController.update);
router.post('/cursos/:id/delete', EducacaoCursoController.destroy);

// =====================================
// Idiomas
// =====================================
router.get('/idiomas', IdiomaController.index);
router.get('/idiomas/new', IdiomaController.create);
router.get('/idiomas/:id/edit', IdiomaController.edit);
router.post('/idiomas', IdiomaController.store);
router.post('/idiomas/:id', IdiomaController.update);
router.post('/idiomas/:id/delete', IdiomaController.destroy);

// =====================================
// Job Fit
// =====================================
router.get('/jobfit', JobFitController.index);
router.get('/jobfit/:id', JobFitController.result);

module.exports = router;
