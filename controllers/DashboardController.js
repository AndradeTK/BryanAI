/**
 * Controller: Dashboard
 * Página principal com visão geral do sistema
 */

const { HistoricoGeracao } = require('../models');
const { curriculoService } = require('../services');

const DashboardController = {
    /**
     * Página principal do dashboard
     */
    async index(req, res) {
        try {
            const [historico, stats, validacao, arquivos] = await Promise.all([
                HistoricoGeracao.getRecent(10),
                HistoricoGeracao.getStats(),
                curriculoService.validateResume(),
                HistoricoGeracao.getConcluidos()
            ]);
            
            // Filtra apenas os que têm arquivo
            const curriculos = arquivos.filter(a => a.pdf_path).map(a => ({
                ...a,
                filename: a.pdf_path ? require('path').basename(a.pdf_path) : null
            }));

            res.render('dashboard/index', {
                title: 'Dashboard - BryanAI',
                historico,
                stats,
                validacao,
                curriculos,
                page: 'dashboard'
            });
        } catch (error) {
            console.error('Erro no dashboard:', error);
            res.render('dashboard/index', {
                title: 'Dashboard - BryanAI',
                historico: [],
                stats: {},
                validacao: { completude: 0, issues: [] },
                curriculos: [],
                page: 'dashboard',
                error: 'Erro ao carregar dados do dashboard'
            });
        }
    }
};

module.exports = DashboardController;
