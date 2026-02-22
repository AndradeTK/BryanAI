/**
 * Routes: Web Routes
 * Rotas para renderização de páginas EJS
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const ejs = require('ejs');
const {
    DashboardController,
    PerfilController,
    ExperienciaController,
    FormacaoProjetoController,
    EducacaoCursoController,
    IdiomaController,
    JobFitController
} = require('../controllers');
const { curriculoService, userSettingsService } = require('../services');

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

// =====================================
// Cover Letter
// =====================================
router.get('/cover-letter', async (req, res) => {
    try {
        const curriculo = await curriculoService.getFullResume();
        res.render('cover-letter/index', {
            page: 'cover-letter',
            perfil: curriculo.perfil,
            experiencias: curriculo.experiencias,
            formacao: curriculo.formacao,
            cursos: curriculo.cursos_certificacoes,
            idiomas: curriculo.idiomas
        });
    } catch (error) {
        console.error('Erro ao carregar Cover Letter:', error);
        res.status(500).render('error', { page: 'error', error: error.message });
    }
});

// =====================================
// Skills Gap Analysis
// =====================================
router.get('/skills-gap', async (req, res) => {
    try {
        const curriculo = await curriculoService.getFullResume();
        res.render('skills-gap/index', {
            page: 'skills-gap',
            perfil: curriculo.perfil,
            experiencias: curriculo.experiencias,
            formacao: curriculo.formacao,
            cursos: curriculo.cursos_certificacoes,
            idiomas: curriculo.idiomas
        });
    } catch (error) {
        console.error('Erro ao carregar Skills Gap:', error);
        res.status(500).render('error', { page: 'error', error: error.message });
    }
});

// =====================================
// Preview de Templates
// =====================================
router.get('/preview/:templateId', async (req, res) => {
    try {
        const { templateId } = req.params;
        const curriculo = await curriculoService.getFullResume();
        const settings = await userSettingsService.getSettings();
        const templatePath = await userSettingsService.getTemplatePath(templateId);
        
        // Dados de exemplo para preview
        const dadosPreview = {
            perfil: curriculo.perfil || {
                nome_completo: 'João Silva',
                email: 'joao.silva@email.com',
                telefone: '(11) 99999-9999',
                localizacao: 'São Paulo, SP',
                linkedin: 'https://linkedin.com/in/joaosilva',
                github: 'https://github.com/joaosilva',
                resumo_base: 'Desenvolvedor Full Stack com 5 anos de experiência em Node.js, React e AWS. Especialista em criar soluções escaláveis e performáticas.'
            },
            resumo: curriculo.perfil?.resumo_base || 'Profissional experiente com sólida formação técnica e habilidades de liderança.',
            experiencias: curriculo.experiencias || [
                {
                    cargo: 'Desenvolvedor Full Stack',
                    empresa: 'Tech Company',
                    data_inicio: 'Jan 2022',
                    data_fim: null,
                    descricao_atividades: 'Desenvolvimento de APIs RESTful com Node.js. Criação de interfaces com React e TypeScript. Implementação de CI/CD com GitHub Actions.'
                }
            ],
            curriculo: {
                resumo_profissional: curriculo.perfil?.resumo_base || 'Profissional experiente com sólida formação técnica e habilidades de liderança.',
                experiencias: curriculo.experiencias?.map(e => ({
                    cargo: e.cargo,
                    empresa: e.empresa,
                    periodo: `${e.data_inicio} - ${e.data_fim || 'Atual'}`,
                    bullets: ['Desenvolvimento de features críticas', 'Otimização de performance', 'Mentoria de desenvolvedores júnior']
                })) || [
                    {
                        cargo: 'Desenvolvedor Full Stack',
                        empresa: 'Tech Company',
                        periodo: 'Jan 2022 - Atual',
                        bullets: ['Desenvolvimento de APIs RESTful com Node.js', 'Criação de interfaces com React e TypeScript', 'Implementação de CI/CD com GitHub Actions']
                    }
                ],
                habilidades_tecnicas: {
                    principais: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'AWS'],
                    secundarias: ['Docker', 'Redis', 'GraphQL', 'MongoDB']
                }
            },
            formacao: curriculo.formacao || [
                { titulo_curso: 'Bacharelado em Ciência da Computação', instituicao_projeto: 'Universidade de São Paulo', status: 'Concluído em 2020' }
            ],
            projetos: curriculo.projetos || [],
            cursos: curriculo.cursos_certificacoes || [
                { titulo_do_curso: 'AWS Certified Developer', emissor_instituicao: 'Amazon Web Services' }
            ],
            idiomas: curriculo.idiomas || [
                { idioma: 'Português', nivel_cefr: 'Nativo' },
                { idioma: 'Inglês', nivel_cefr: 'Avançado (C1)' }
            ],
            lang: 'pt-BR',
            sectionsOrder: settings.sectionsOrder
        };

        const html = await ejs.renderFile(templatePath, dadosPreview);
        res.send(html);
    } catch (error) {
        console.error('Erro no preview:', error);
        res.status(500).send('Erro ao renderizar preview: ' + error.message);
    }
});

module.exports = router;
