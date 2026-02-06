/**
 * Controller: Perfil
 * CRUD para dados do perfil do usuário
 */

const { Perfil } = require('../models');

const PerfilController = {
    /**
     * Lista/Exibe o perfil (único)
     */
    async index(req, res) {
        try {
            const perfil = await Perfil.get();
            res.render('perfil/index', {
                title: 'Meu Perfil - BryanAI',
                perfil,
                page: 'perfil'
            });
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            res.render('perfil/index', {
                title: 'Meu Perfil - BryanAI',
                perfil: null,
                page: 'perfil',
                error: 'Erro ao carregar perfil'
            });
        }
    },

    /**
     * Formulário de criação/edição
     */
    async form(req, res) {
        try {
            const perfil = await Perfil.get();
            res.render('perfil/form', {
                title: perfil ? 'Editar Perfil' : 'Criar Perfil',
                perfil,
                page: 'perfil'
            });
        } catch (error) {
            console.error('Erro ao carregar formulário:', error);
            res.redirect('/perfil?error=Erro ao carregar formulário');
        }
    },

    /**
     * Salvar perfil (criar ou atualizar)
     */
    async save(req, res) {
        try {
            const data = {
                nome_completo: req.body.nome_completo,
                email: req.body.email,
                telefone: req.body.telefone,
                localizacao: req.body.localizacao,
                linkedin: req.body.linkedin,
                github: req.body.github,
                resumo_base: req.body.resumo_base,
                data_nascimento: req.body.data_nascimento || null
            };

            const perfilExistente = await Perfil.get();

            if (perfilExistente) {
                await Perfil.update(perfilExistente.id, data);
            } else {
                await Perfil.create(data);
            }

            res.redirect('/perfil?success=Perfil salvo com sucesso');
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            res.redirect('/perfil/form?error=Erro ao salvar perfil');
        }
    },

    /**
     * API: Retorna perfil em JSON
     */
    async apiGet(req, res) {
        try {
            const perfil = await Perfil.get();
            res.json({ success: true, data: perfil });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * API: Atualiza perfil
     */
    async apiUpdate(req, res) {
        try {
            const perfil = await Perfil.get();
            if (!perfil) {
                return res.status(404).json({ success: false, error: 'Perfil não encontrado' });
            }

            await Perfil.update(perfil.id, req.body);
            const atualizado = await Perfil.get();
            res.json({ success: true, data: atualizado });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = PerfilController;
