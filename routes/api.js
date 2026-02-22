/**
 * Routes: API Routes
 * Rotas para endpoints REST da API
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    PerfilController,
    ExperienciaController,
    FormacaoProjetoController,
    EducacaoCursoController,
    IdiomaController,
    JobFitController,
    ConversaoController
} = require('../controllers');
const { curriculoService, userSettingsService } = require('../services');
const { HistoricoGeracao } = require('../models');

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'generated', 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo não suportado. Use PDF ou DOCX.'));
        }
    }
});

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

// =====================================
// Configurações e Templates
// =====================================
router.get('/settings', async (req, res) => {
    try {
        const settings = await userSettingsService.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const settings = await userSettingsService.saveSettings(req.body);
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/templates', async (req, res) => {
    try {
        const templates = await userSettingsService.getTemplates();
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/templates/default', async (req, res) => {
    try {
        const template = await userSettingsService.getDefaultTemplate();
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/templates/default', async (req, res) => {
    try {
        const { templateId } = req.body;
        if (!templateId) {
            return res.status(400).json({ success: false, error: 'templateId é obrigatório' });
        }
        const settings = await userSettingsService.setDefaultTemplate(templateId);
        res.json({ success: true, data: settings, message: `Template "${templateId}" definido como padrão` });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/settings/sections-order', async (req, res) => {
    try {
        const { order } = req.body;
        if (!order || !Array.isArray(order)) {
            return res.status(400).json({ success: false, error: 'order deve ser um array de seções' });
        }
        const settings = await userSettingsService.setSectionsOrder(order);
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

router.put('/settings/preferences', async (req, res) => {
    try {
        const settings = await userSettingsService.updatePreferences(req.body);
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// =====================================
// Upload e Análise de Currículo Externo
// =====================================
router.post('/jobfit/upload', upload.single('arquivo'), JobFitController.apiAnalyzeUpload);

// =====================================
// Cover Letter
// =====================================
const aiCoverLetter = require('../services/aiCoverLetter');

router.post('/cover-letter/generate', async (req, res) => {
    try {
        const { titulo, empresa, descricao, tom, idioma } = req.body;
        
        if (!titulo || !descricao) {
            return res.status(400).json({ success: false, error: 'Título e descrição são obrigatórios' });
        }
        
        const curriculo = await curriculoService.getFullResume();
        const vaga = { titulo, empresa, descricao };
        
        const result = await aiCoverLetter.generate(curriculo, vaga, idioma || 'pt-BR', tom || 'formal');
        
        if (result.success) {
            res.json({
                success: true,
                coverLetter: result.coverLetter,
                metadata: result.metadata
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Erro na geração de Cover Letter:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/cover-letter/improve', async (req, res) => {
    try {
        const { coverLetter, titulo, descricao } = req.body;
        
        if (!coverLetter || !titulo) {
            return res.status(400).json({ success: false, error: 'Cover Letter e título da vaga são obrigatórios' });
        }
        
        const vaga = { titulo, descricao: descricao || '' };
        const result = await aiCoverLetter.improve(coverLetter, vaga);
        
        if (result.success) {
            res.json({ success: true, analysis: result.analysis });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Erro ao melhorar Cover Letter:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// Skills Gap Analysis
// =====================================
const aiSkillsGap = require('../services/aiSkillsGap');

router.post('/skills-gap/analyze', async (req, res) => {
    try {
        const { titulo, nivel, descricao } = req.body;
        
        if (!titulo) {
            return res.status(400).json({ success: false, error: 'Cargo/posição alvo é obrigatório' });
        }
        
        const curriculo = await curriculoService.getFullResume();
        const alvo = { titulo, nivel: nivel || '', descricao: descricao || '' };
        
        const result = await aiSkillsGap.analyze(curriculo, alvo);
        
        if (result.success) {
            res.json({
                success: true,
                analysis: result.analysis,
                metadata: result.metadata
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Erro na análise de Skills Gap:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/skills-gap/market', async (req, res) => {
    try {
        const { area } = req.body;
        
        if (!area) {
            return res.status(400).json({ success: false, error: 'Área é obrigatória' });
        }
        
        const curriculo = await curriculoService.getFullResume();
        const result = await aiSkillsGap.compareMarket(curriculo, area);
        
        if (result.success) {
            res.json({ success: true, marketAnalysis: result.marketAnalysis });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Erro na análise de mercado:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/skills-gap/study-plan', async (req, res) => {
    try {
        const { gaps, horasPorSemana } = req.body;
        
        if (!gaps || !Array.isArray(gaps)) {
            return res.status(400).json({ success: false, error: 'Lista de gaps é obrigatória' });
        }
        
        const result = await aiSkillsGap.generateStudyPlan(gaps, horasPorSemana || 10);
        
        if (result.success) {
            res.json({ success: true, studyPlan: result.studyPlan });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Erro ao gerar plano de estudos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
