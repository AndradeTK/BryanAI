/**
 * Controller: Formação e Projetos
 * CRUD para formação acadêmica e projetos pessoais
 */

const { FormacaoProjeto } = require('../models');

const FormacaoProjetoController = {
    /**
     * Lista todos os registros
     */
    async index(req, res) {
        try {
            const registros = await FormacaoProjeto.getAll();
            const formacoes = registros.filter(r => r.tipo === 'Educação');
            const projetos = registros.filter(r => r.tipo !== 'Educação');

            res.render('formacao/index', {
                title: 'Formação e Projetos - BryanAI',
                formacoes,
                projetos,
                page: 'formacao'
            });
        } catch (error) {
            console.error('Erro ao listar formação:', error);
            res.render('formacao/index', {
                title: 'Formação e Projetos - BryanAI',
                formacoes: [],
                projetos: [],
                page: 'formacao',
                error: 'Erro ao carregar dados'
            });
        }
    },

    /**
     * Formulário de criação
     */
    async create(req, res) {
        res.render('formacao/form', {
            title: 'Nova Formação/Projeto',
            registro: null,
            page: 'formacao'
        });
    },

    /**
     * Formulário de edição
     */
    async edit(req, res) {
        try {
            const registro = await FormacaoProjeto.getById(req.params.id);
            if (!registro) {
                return res.redirect('/formacao?error=Registro não encontrado');
            }
            res.render('formacao/form', {
                title: 'Editar Formação/Projeto',
                registro,
                page: 'formacao'
            });
        } catch (error) {
            console.error('Erro ao carregar registro:', error);
            res.redirect('/formacao?error=Erro ao carregar dados');
        }
    },

    /**
     * Salvar registro
     */
    async store(req, res) {
        try {
            const data = {
                tipo: req.body.tipo,
                instituicao_projeto: req.body.instituicao_projeto,
                titulo_curso: req.body.titulo_curso,
                status: req.body.status,
                descricao_detalhada: req.body.descricao_detalhada
            };

            await FormacaoProjeto.create(data);
            res.redirect('/formacao?success=Registro criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar registro:', error);
            res.redirect('/formacao/new?error=Erro ao criar registro');
        }
    },

    /**
     * Atualizar registro
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = {
                tipo: req.body.tipo,
                instituicao_projeto: req.body.instituicao_projeto,
                titulo_curso: req.body.titulo_curso,
                status: req.body.status,
                descricao_detalhada: req.body.descricao_detalhada
            };

            const success = await FormacaoProjeto.update(id, data);
            if (!success) {
                return res.redirect('/formacao?error=Registro não encontrado');
            }
            res.redirect('/formacao?success=Registro atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar registro:', error);
            res.redirect(`/formacao/${req.params.id}/edit?error=Erro ao atualizar`);
        }
    },

    /**
     * Deletar registro
     */
    async destroy(req, res) {
        try {
            const success = await FormacaoProjeto.delete(req.params.id);
            if (!success) {
                return res.redirect('/formacao?error=Registro não encontrado');
            }
            res.redirect('/formacao?success=Registro removido com sucesso');
        } catch (error) {
            console.error('Erro ao deletar registro:', error);
            res.redirect('/formacao?error=Erro ao remover registro');
        }
    },

    // === API Endpoints ===

    async apiList(req, res) {
        try {
            const registros = await FormacaoProjeto.getAll();
            res.json({ success: true, data: registros });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiGet(req, res) {
        try {
            const registro = await FormacaoProjeto.getById(req.params.id);
            if (!registro) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            res.json({ success: true, data: registro });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiCreate(req, res) {
        try {
            const id = await FormacaoProjeto.create(req.body);
            const registro = await FormacaoProjeto.getById(id);
            res.status(201).json({ success: true, data: registro });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiUpdate(req, res) {
        try {
            const success = await FormacaoProjeto.update(req.params.id, req.body);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            const registro = await FormacaoProjeto.getById(req.params.id);
            res.json({ success: true, data: registro });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiDelete(req, res) {
        try {
            const success = await FormacaoProjeto.delete(req.params.id);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            res.json({ success: true, message: 'Removido com sucesso' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = FormacaoProjetoController;
