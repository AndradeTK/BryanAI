/**
 * Controller: Experiências
 * CRUD para experiências profissionais
 */

const { Experiencia } = require('../models');

const ExperienciaController = {
    /**
     * Lista todas as experiências
     */
    async index(req, res) {
        try {
            const experiencias = await Experiencia.getAll();
            res.render('experiencias/index', {
                title: 'Experiências - BryanAI',
                experiencias,
                page: 'experiencias'
            });
        } catch (error) {
            console.error('Erro ao listar experiências:', error);
            res.render('experiencias/index', {
                title: 'Experiências - BryanAI',
                experiencias: [],
                page: 'experiencias',
                error: 'Erro ao carregar experiências'
            });
        }
    },

    /**
     * Formulário de criação
     */
    async create(req, res) {
        res.render('experiencias/form', {
            title: 'Nova Experiência',
            experiencia: null,
            page: 'experiencias'
        });
    },

    /**
     * Formulário de edição
     */
    async edit(req, res) {
        try {
            const experiencia = await Experiencia.getById(req.params.id);
            if (!experiencia) {
                return res.redirect('/experiencias?error=Experiência não encontrada');
            }
            res.render('experiencias/form', {
                title: 'Editar Experiência',
                experiencia,
                page: 'experiencias'
            });
        } catch (error) {
            console.error('Erro ao carregar experiência:', error);
            res.redirect('/experiencias?error=Erro ao carregar experiência');
        }
    },

    /**
     * Salvar experiência (criar)
     */
    async store(req, res) {
        try {
            const data = {
                empresa: req.body.empresa,
                cargo: req.body.cargo,
                data_inicio: req.body.data_inicio,
                data_fim: req.body.data_fim || 'Atual',
                descricao_atividades: req.body.descricao_atividades,
                principais_conquistas: req.body.principais_conquistas,
                categoria: req.body.categoria,
                tags_tecnicas: req.body.tags_tecnicas
            };

            await Experiencia.create(data);
            res.redirect('/experiencias?success=Experiência criada com sucesso');
        } catch (error) {
            console.error('Erro ao criar experiência:', error);
            res.redirect('/experiencias/new?error=Erro ao criar experiência');
        }
    },

    /**
     * Atualizar experiência
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = {
                empresa: req.body.empresa,
                cargo: req.body.cargo,
                data_inicio: req.body.data_inicio,
                data_fim: req.body.data_fim || 'Atual',
                descricao_atividades: req.body.descricao_atividades,
                principais_conquistas: req.body.principais_conquistas,
                categoria: req.body.categoria,
                tags_tecnicas: req.body.tags_tecnicas
            };

            const success = await Experiencia.update(id, data);
            if (!success) {
                return res.redirect('/experiencias?error=Experiência não encontrada');
            }
            res.redirect('/experiencias?success=Experiência atualizada com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar experiência:', error);
            res.redirect(`/experiencias/${req.params.id}/edit?error=Erro ao atualizar`);
        }
    },

    /**
     * Deletar experiência
     */
    async destroy(req, res) {
        try {
            const success = await Experiencia.delete(req.params.id);
            if (!success) {
                return res.redirect('/experiencias?error=Experiência não encontrada');
            }
            res.redirect('/experiencias?success=Experiência removida com sucesso');
        } catch (error) {
            console.error('Erro ao deletar experiência:', error);
            res.redirect('/experiencias?error=Erro ao remover experiência');
        }
    },

    // === API Endpoints ===

    async apiList(req, res) {
        try {
            const experiencias = await Experiencia.getAll();
            res.json({ success: true, data: experiencias });
        } catch (error) {
            console.error('Erro ao listar experiências:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    },

    async apiGet(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
            const experiencia = await Experiencia.getById(id);
            if (!experiencia) {
                return res.status(404).json({ success: false, error: 'Não encontrada' });
            }
            res.json({ success: true, data: experiencia });
        } catch (error) {
            console.error('Erro ao buscar experiência:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    },

    async apiCreate(req, res) {
        try {
            const data = {
                empresa: req.body.empresa,
                cargo: req.body.cargo,
                data_inicio: req.body.data_inicio,
                data_fim: req.body.data_fim || null,
                descricao_atividades: req.body.descricao_atividades,
                principais_conquistas: req.body.principais_conquistas,
                categoria: req.body.categoria,
                tags_tecnicas: req.body.tags_tecnicas
            };
            const id = await Experiencia.create(data);
            const experiencia = await Experiencia.getById(id);
            res.status(201).json({ success: true, data: experiencia });
        } catch (error) {
            console.error('Erro ao criar experiência:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    },

    async apiUpdate(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
            const data = {
                empresa: req.body.empresa,
                cargo: req.body.cargo,
                data_inicio: req.body.data_inicio,
                data_fim: req.body.data_fim || null,
                descricao_atividades: req.body.descricao_atividades,
                principais_conquistas: req.body.principais_conquistas,
                categoria: req.body.categoria,
                tags_tecnicas: req.body.tags_tecnicas
            };
            const success = await Experiencia.update(id, data);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrada' });
            }
            const experiencia = await Experiencia.getById(id);
            res.json({ success: true, data: experiencia });
        } catch (error) {
            console.error('Erro ao atualizar experiência:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    },

    async apiDelete(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
            const success = await Experiencia.delete(id);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrada' });
            }
            res.json({ success: true, message: 'Removida com sucesso' });
        } catch (error) {
            console.error('Erro ao deletar experiência:', error);
            res.status(500).json({ success: false, error: 'Erro interno do servidor' });
        }
    }
};

module.exports = ExperienciaController;
