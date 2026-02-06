/**
 * Model: Educação e Cursos
 * Gerencia certificações e cursos complementares
 */

const { query } = require('../config/database');

const EducacaoCurso = {
    // Buscar todos
    async getAll() {
        return await query('SELECT * FROM educacao_e_cursos ORDER BY id DESC');
    },

    // Buscar por ID
    async getById(id) {
        const results = await query('SELECT * FROM educacao_e_cursos WHERE id = ?', [id]);
        return results[0] || null;
    },

    // Buscar apenas destaques
    async getDestaques() {
        return await query("SELECT * FROM educacao_e_cursos WHERE destaque = 'Sim' ORDER BY id DESC");
    },

    // Criar registro
    async create(data) {
        const sql = `
            INSERT INTO educacao_e_cursos 
            (emissor_instituicao, titulo_do_curso, descricao, destaque)
            VALUES (?, ?, ?, ?)
        `;
        const params = [
            data.emissor_instituicao,
            data.titulo_do_curso,
            data.descricao,
            data.destaque || 'Não'
        ];
        const result = await query(sql, params);
        return result.insertId;
    },

    // Atualizar registro
    async update(id, data) {
        const sql = `
            UPDATE educacao_e_cursos SET
                emissor_instituicao = ?,
                titulo_do_curso = ?,
                descricao = ?,
                destaque = ?
            WHERE id = ?
        `;
        const params = [
            data.emissor_instituicao,
            data.titulo_do_curso,
            data.descricao,
            data.destaque || 'Não',
            id
        ];
        const result = await query(sql, params);
        return result.affectedRows > 0;
    },

    // Deletar registro
    async delete(id) {
        const result = await query('DELETE FROM educacao_e_cursos WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = EducacaoCurso;
