/**
 * Controller: Educação e Cursos
 * CRUD para certificações e cursos complementares
 */

const { EducacaoCurso } = require('../models');

const EducacaoCursoController = {
    /**
     * Lista todos os cursos
     */
    async index(req, res) {
        try {
            const cursos = await EducacaoCurso.getAll();
            res.render('cursos/index', {
                title: 'Certificações e Cursos - BryanAI',
                cursos,
                page: 'cursos'
            });
        } catch (error) {
            console.error('Erro ao listar cursos:', error);
            res.render('cursos/index', {
                title: 'Certificações e Cursos - BryanAI',
                cursos: [],
                page: 'cursos',
                error: 'Erro ao carregar cursos'
            });
        }
    },

    /**
     * Formulário de criação
     */
    async create(req, res) {
        res.render('cursos/form', {
            title: 'Novo Curso/Certificação',
            curso: null,
            page: 'cursos'
        });
    },

    /**
     * Formulário de edição
     */
    async edit(req, res) {
        try {
            const curso = await EducacaoCurso.getById(req.params.id);
            if (!curso) {
                return res.redirect('/cursos?error=Curso não encontrado');
            }
            res.render('cursos/form', {
                title: 'Editar Curso/Certificação',
                curso,
                page: 'cursos'
            });
        } catch (error) {
            console.error('Erro ao carregar curso:', error);
            res.redirect('/cursos?error=Erro ao carregar curso');
        }
    },

    /**
     * Salvar curso
     */
    async store(req, res) {
        try {
            const data = {
                emissor_instituicao: req.body.emissor_instituicao,
                titulo_do_curso: req.body.titulo_do_curso,
                descricao: req.body.descricao,
                destaque: req.body.destaque || 'Não'
            };

            await EducacaoCurso.create(data);
            res.redirect('/cursos?success=Curso criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar curso:', error);
            res.redirect('/cursos/new?error=Erro ao criar curso');
        }
    },

    /**
     * Atualizar curso
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = {
                emissor_instituicao: req.body.emissor_instituicao,
                titulo_do_curso: req.body.titulo_do_curso,
                descricao: req.body.descricao,
                destaque: req.body.destaque || 'Não'
            };

            const success = await EducacaoCurso.update(id, data);
            if (!success) {
                return res.redirect('/cursos?error=Curso não encontrado');
            }
            res.redirect('/cursos?success=Curso atualizado com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar curso:', error);
            res.redirect(`/cursos/${req.params.id}/edit?error=Erro ao atualizar`);
        }
    },

    /**
     * Deletar curso
     */
    async destroy(req, res) {
        try {
            const success = await EducacaoCurso.delete(req.params.id);
            if (!success) {
                return res.redirect('/cursos?error=Curso não encontrado');
            }
            res.redirect('/cursos?success=Curso removido com sucesso');
        } catch (error) {
            console.error('Erro ao deletar curso:', error);
            res.redirect('/cursos?error=Erro ao remover curso');
        }
    },

    // === API Endpoints ===

    async apiList(req, res) {
        try {
            const cursos = await EducacaoCurso.getAll();
            res.json({ success: true, data: cursos });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiGet(req, res) {
        try {
            const curso = await EducacaoCurso.getById(req.params.id);
            if (!curso) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            res.json({ success: true, data: curso });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiCreate(req, res) {
        try {
            const id = await EducacaoCurso.create(req.body);
            const curso = await EducacaoCurso.getById(id);
            res.status(201).json({ success: true, data: curso });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiUpdate(req, res) {
        try {
            const success = await EducacaoCurso.update(req.params.id, req.body);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            const curso = await EducacaoCurso.getById(req.params.id);
            res.json({ success: true, data: curso });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async apiDelete(req, res) {
        try {
            const success = await EducacaoCurso.delete(req.params.id);
            if (!success) {
                return res.status(404).json({ success: false, error: 'Não encontrado' });
            }
            res.json({ success: true, message: 'Removido com sucesso' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = EducacaoCursoController;
