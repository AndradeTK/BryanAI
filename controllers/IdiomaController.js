/**
 * Controller: Idiomas
 * CRUD para idiomas do usuário
 */

const { Idioma } = require('../models');

const IdiomaController = {
    /**
     * Lista todos os idiomas
     */
    async index(req, res) {
        try {
            const idiomas = await Idioma.getAll();
            res.render('idiomas/index', {
                title: 'Idiomas - BryanAI',
                idiomas,
                page: 'idiomas'
            });
        } catch (error) {
            console.error('Erro ao listar idiomas:', error);
            res.render('idiomas/index', {
                title: 'Idiomas - BryanAI',
                idiomas: [],
                page: 'idiomas',
                error: 'Erro ao carregar idiomas'
            });
        }
    },

    /**
     * Formulário de criação
     */
    async create(req, res) {
        res.render('idiomas/form', {
            title: 'Novo Idioma',
            idioma: null,
            page: 'idiomas'
        });
    },

    /**
     * Formulário de edição
     */
    async edit(req, res) {
        try {
            const idioma = await Idioma.getById(req.params.id);
            if (!idioma) {
                return res.redirect('/idiomas?error=Idioma não encontrado');
            }
            res.render('idiomas/form', {
                title: 'Editar Idioma',
                idioma,
                page: 'idiomas'
            });
        } catch (error) {
            console.error('Erro ao carregar idioma:', error);
            res.redirect('/idiomas?error=Erro ao carregar idioma');
        }
    },

    /**
     * Salvar idioma
     */
    async store(req, res) {
        try {
            const data = {
                idioma: req.body.idioma,
                nivel_cefr: req.body.nivel_cefr,
                certificacao_exame: req.body.certificacao_exame,
                historico_de_escolas: req.body.historico_de_escolas
            };

            await Idioma.create(data);
            res.redirect('/idiomas?success=Idioma criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar idioma:', error);
            res.redirect('/idiomas/new?error=Erro ao criar idioma');
        }
    },

    /**
     * Atualizar idioma
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = {
                idioma: req.body.idioma,
                nivel_cefr: req.body.nivel_cefr,
                certificacao_exame: req.body.certificacao_exame,
                historico_de_escolas: req.body.historico_de_escolas
            };

            const success = await Idioma.update(id, data);
            if (!success) {
                return res.redirect('/idiomas?error=Idioma não encontrado');
            }
            res.redirect('/idiomas?success=Idioma atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar idioma:', error);
            res.redirect(`/idiomas/${req.params.id}/edit?error=Erro ao atualizar`);
        }
    },

    /**
     * Deletar idioma
     */
    async destroy(req, res) {
        try {
            const success = await Idioma.delete(req.params.id);
            if (!success) {
                return res.redirect('/idiomas?error=Idioma não encontrado');
            }
            res.redirect('/idiomas?success=Idioma removido com sucesso');
        } catch (error) {
            console.error('Erro ao deletar idioma:', error);
            res.redirect('/idiomas?error=Erro ao remover idioma');
        }
    },

    // === API Endpoints ===

    async apiList(req, res) {
        try {
            const idiomas = await Idioma.getAll();
            res.json({ success: true, data: idiomas });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiGet(req, res) {
        try {
            const idioma = await Idioma.getById(req.params.id);
            if (!idioma) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            res.json({ success: true, data: idioma });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiCreate(req, res) {
        try {
            const id = await Idioma.create(req.body);
            const idioma = await Idioma.getById(id);
            res.status(201).json({ success: true, data: idioma });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiUpdate(req, res) {
        try {
            const success = await Idioma.update(req.params.id, req.body);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            const idioma = await Idioma.getById(req.params.id);
            res.json({ success: true, data: idioma });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiDelete(req, res) {
        try {
            const success = await Idioma.delete(req.params.id);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            res.json({ success: true, message: 'Removido com sucesso' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = IdiomaController;
