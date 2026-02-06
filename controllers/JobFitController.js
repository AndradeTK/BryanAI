/**
 * Controller: Job Fit
 * Análise de compatibilidade e geração de currículo otimizado
 */

const { HistoricoGeracao } = require('../models');
const { aiAnalyzer, aiWriter, documentConverter, curriculoService } = require('../services');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs').promises;

const JobFitController = {
    /**
     * Página de análise de Job Fit
     */
    async index(req, res) {
        try {
            const validacao = await curriculoService.validateResume();
            res.render('jobfit/index', {
                title: 'Análise de Job Fit - BryanAI',
                validacao,
                page: 'jobfit'
            });
        } catch (error) {
            console.error('Erro na página de Job Fit:', error);
            res.render('jobfit/index', {
                title: 'Análise de Job Fit - BryanAI',
                validacao: { completude: 0 },
                page: 'jobfit',
                error: 'Erro ao carregar página'
            });
        }
    },

    /**
     * Resultado da análise
     */
    async result(req, res) {
        try {
            const { id } = req.params;
            const historico = await HistoricoGeracao.getById(id);
            
            if (!historico) {
                return res.redirect('/jobfit?error=Análise não encontrada');
            }

            res.render('jobfit/result', {
                title: 'Resultado da Análise - BryanAI',
                historico,
                page: 'jobfit'
            });
        } catch (error) {
            console.error('Erro ao carregar resultado:', error);
            res.redirect('/jobfit?error=Erro ao carregar resultado');
        }
    },

    /**
     * API: Analisa compatibilidade com vaga
     */
    async apiAnalyze(req, res) {
        const { titulo, descricao } = req.body;

        if (!titulo || !descricao) {
            return res.status(400).json({
                success: false,
                error: 'Título e descrição da vaga são obrigatórios'
            });
        }

        // Cria registro no histórico
        const historicoId = await HistoricoGeracao.create({
            vaga_titulo: titulo,
            status: 'processando'
        });

        try {
            // Busca currículo completo
            const curriculo = await curriculoService.getFullResume();

            // Executa análise de Job Fit
            const analise = await aiAnalyzer.analyzeJobFit(curriculo, { titulo, descricao });

            // Atualiza histórico com sucesso
            await HistoricoGeracao.update(historicoId, {
                score: analise.score,
                keywords_focadas: JSON.stringify(analise.keywords_match),
                status: 'concluido'
            });

            res.json({
                success: true,
                data: {
                    historicoId,
                    analise
                }
            });

        } catch (error) {
            console.error('Erro na análise:', error);
            await HistoricoGeracao.markFailed(historicoId);
            res.status(500).json({
                success: false,
                error: error.message,
                historicoId
            });
        }
    },

    /**
     * API: Gera currículo otimizado
     */
    async apiGenerate(req, res) {
        const { titulo, descricao, formato = 'pdf', idioma = 'pt-BR' } = req.body;

        if (!titulo || !descricao) {
            return res.status(400).json({
                success: false,
                error: 'Título e descrição da vaga são obrigatórios'
            });
        }

        // Cria registro no histórico
        const historicoId = await HistoricoGeracao.create({
            vaga_titulo: titulo,
            status: 'processando'
        });

        try {
            // Busca currículo completo
            const curriculo = await curriculoService.getFullResume();

            // Análise de Job Fit
            const analise = await aiAnalyzer.analyzeJobFit(curriculo, { titulo, descricao });

            // Reescreve currículo otimizado
            const curriculoOtimizado = await aiWriter.rewriteResume(curriculo, { titulo, descricao }, analise, idioma);

            // Renderiza template HTML
            const templatePath = path.join(__dirname, '..', 'views', 'templates', 'curriculo.ejs');
            const html = await ejs.renderFile(templatePath, {
                perfil: curriculo.perfil,
                curriculo: curriculoOtimizado,
                formacao: curriculo.formacao,
                cursos: curriculo.cursos_certificacoes,
                idiomas: curriculo.idiomas,
                vaga: { titulo, descricao }
            });

            // Converte para o formato solicitado
            const filename = documentConverter.generateFilename(`CV_${curriculo.perfil?.nome_completo?.split(' ')[0] || 'Bryan'}`, formato);
            
            let result;
            if (formato === 'docx') {
                result = await documentConverter.htmlToDocx(html, { filename });
            } else {
                result = await documentConverter.htmlToPdf(html, { filename });
            }

            // Atualiza histórico
            await HistoricoGeracao.markComplete(
                historicoId,
                analise.score,
                result.path,
                JSON.stringify(curriculoOtimizado.keywords_otimizadas)
            );

            res.json({
                success: true,
                data: {
                    historicoId,
                    score: analise.score,
                    analise,
                    curriculo: curriculoOtimizado,
                    arquivo: {
                        nome: filename,
                        path: result.path,
                        formato
                    }
                }
            });

        } catch (error) {
            console.error('Erro ao gerar currículo:', error);
            await HistoricoGeracao.markFailed(historicoId);
            res.status(500).json({
                success: false,
                error: error.message,
                historicoId
            });
        }
    },

    /**
     * API: Análise rápida (apenas score)
     */
    async apiQuickAnalysis(req, res) {
        const { titulo, descricao } = req.body;

        if (!titulo || !descricao) {
            return res.status(400).json({
                success: false,
                error: 'Título e descrição da vaga são obrigatórios'
            });
        }

        try {
            const curriculo = await curriculoService.getFullResume();
            const analise = await aiAnalyzer.quickAnalysis(curriculo, { titulo, descricao });

            res.json({
                success: true,
                data: analise
            });

        } catch (error) {
            console.error('Erro na análise rápida:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = JobFitController;
