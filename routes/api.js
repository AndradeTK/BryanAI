/**
 * Routes: API Routes
 * Rotas para endpoints REST da API
 */

const express = require('express');
const router = express.Router();
const {
    PerfilController,
    ExperienciaController,
    FormacaoProjetoController,
    EducacaoCursoController,
    IdiomaController,
    JobFitController,
    ConversaoController
} = require('../controllers');
const { curriculoService } = require('../services');
const { HistoricoGeracao } = require('../models');

// =====================================
// Currículo Completo
// =====================================
router.get('/curriculo', async (req, res) => {
    try {
        const curriculo = await curriculoService.getFullResume();
        res.json({ success: true, data: curriculo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/curriculo/validar', async (req, res) => {
    try {
        const validacao = await curriculoService.validateResume();
        res.json({ success: true, data: validacao });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// Perfil
// =====================================
router.get('/perfil', PerfilController.apiGet);
router.put('/perfil', PerfilController.apiUpdate);

// =====================================
// Experiências
// =====================================
router.get('/experiencias', ExperienciaController.apiList);
router.get('/experiencias/:id', ExperienciaController.apiGet);
router.post('/experiencias', ExperienciaController.apiCreate);
router.put('/experiencias/:id', ExperienciaController.apiUpdate);
router.delete('/experiencias/:id', ExperienciaController.apiDelete);

// =====================================
// Formação e Projetos
// =====================================
router.get('/formacao', FormacaoProjetoController.apiList);
router.get('/formacao/:id', FormacaoProjetoController.apiGet);
router.post('/formacao', FormacaoProjetoController.apiCreate);
router.put('/formacao/:id', FormacaoProjetoController.apiUpdate);
router.delete('/formacao/:id', FormacaoProjetoController.apiDelete);

// =====================================
// Cursos e Certificações
// =====================================
router.get('/cursos', EducacaoCursoController.apiList);
router.get('/cursos/:id', EducacaoCursoController.apiGet);
router.post('/cursos', EducacaoCursoController.apiCreate);
router.put('/cursos/:id', EducacaoCursoController.apiUpdate);
router.delete('/cursos/:id', EducacaoCursoController.apiDelete);

// =====================================
// Idiomas
// =====================================
router.get('/idiomas', IdiomaController.apiList);
router.get('/idiomas/:id', IdiomaController.apiGet);
router.post('/idiomas', IdiomaController.apiCreate);
router.put('/idiomas/:id', IdiomaController.apiUpdate);
router.delete('/idiomas/:id', IdiomaController.apiDelete);

// =====================================
// Job Fit e Geração
// =====================================
router.post('/jobfit/analyze', JobFitController.apiAnalyze);
router.post('/jobfit/generate', JobFitController.apiGenerate);
router.post('/jobfit/quick', JobFitController.apiQuickAnalysis);

// =====================================
// Histórico
// =====================================
router.get('/historico', async (req, res) => {
    try {
        const historico = await HistoricoGeracao.getAll();
        res.json({ success: true, data: historico });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/historico/stats', async (req, res) => {
    try {
        const stats = await HistoricoGeracao.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/historico/:id', async (req, res) => {
    try {
        const registro = await HistoricoGeracao.getById(req.params.id);
        if (!registro) {
            return res.status(404).json({ success: false, error: 'Não encontrado' });
        }
        res.json({ success: true, data: registro });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/historico/:id', async (req, res) => {
    try {
        const success = await HistoricoGeracao.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ success: false, error: 'Não encontrado' });
        }
        res.json({ success: true, message: 'Removido com sucesso' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// Arquivos Gerados
// =====================================
router.get('/arquivos', ConversaoController.listFiles);
router.get('/arquivos/:filename/view', ConversaoController.viewFile);
router.get('/arquivos/:filename', ConversaoController.downloadFile);
router.delete('/arquivos/:filename', ConversaoController.deleteFile);

module.exports = router;
