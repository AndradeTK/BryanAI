/**
 * Model: Formacao e Projetos
 * Gerencia formação acadêmica e projetos pessoais
 */

const { query } = require('../config/database');

const FormacaoProjeto = {
    // Buscar todos
    async getAll() {
        return await query('SELECT * FROM formacao_e_projetos ORDER BY id DESC');
    },

    // Buscar por ID
    async getById(id) {
        const results = await query('SELECT * FROM formacao_e_projetos WHERE id = ?', [id]);
        return results[0] || null;
    },

    // Buscar por tipo (Educação ou Projeto)
    async getByTipo(tipo) {
        return await query('SELECT * FROM formacao_e_projetos WHERE tipo = ? ORDER BY id DESC', [tipo]);
    },

    // Buscar apenas educação
    async getEducacao() {
        return await query("SELECT * FROM formacao_e_projetos WHERE tipo = 'Educação' ORDER BY id DESC");
    },

    // Buscar apenas projetos
    async getProjetos() {
        return await query("SELECT * FROM formacao_e_projetos WHERE tipo LIKE '%Projeto%' ORDER BY id DESC");
    },

    // Criar registro
    async create(data) {
        const sql = `
            INSERT INTO formacao_e_projetos 
            (tipo, instituicao_projeto, titulo_curso, status, descricao_detalhada)
            VALUES (?, ?, ?, ?, ?)
        `;
        const params = [
            data.tipo,
            data.instituicao_projeto,
            data.titulo_curso,
            data.status,
            data.descricao_detalhada
        ];
        const result = await query(sql, params);
        return result.insertId;
    },

    // Atualizar registro
    async update(id, data) {
        const sql = `
            UPDATE formacao_e_projetos SET
                tipo = ?,
                instituicao_projeto = ?,
                titulo_curso = ?,
                status = ?,
                descricao_detalhada = ?
            WHERE id = ?
        `;
        const params = [
            data.tipo,
            data.instituicao_projeto,
            data.titulo_curso,
            data.status,
            data.descricao_detalhada,
            id
        ];
        const result = await query(sql, params);
        return result.affectedRows > 0;
    },

    // Deletar registro
    async delete(id) {
        const result = await query('DELETE FROM formacao_e_projetos WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = FormacaoProjeto;
