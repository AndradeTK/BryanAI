/**
 * Model: Idiomas
 * Gerencia os idiomas do usuário
 */

const { query } = require('../config/database');

const Idioma = {
    // Buscar todos
    async getAll() {
        return await query('SELECT * FROM idiomas ORDER BY id ASC');
    },

    // Buscar por ID
    async getById(id) {
        const results = await query('SELECT * FROM idiomas WHERE id = ?', [id]);
        return results[0] || null;
    },

    // Criar registro
    async create(data) {
        const sql = `
            INSERT INTO idiomas 
            (idioma, nivel_cefr, certificacao_exame, historico_de_escolas)
            VALUES (?, ?, ?, ?)
        `;
        const params = [
            data.idioma,
            data.nivel_cefr,
            data.certificacao_exame,
            data.historico_de_escolas
        ];
        const result = await query(sql, params);
        return result.insertId;
    },

    // Atualizar registro
    async update(id, data) {
        const sql = `
            UPDATE idiomas SET
                idioma = ?,
                nivel_cefr = ?,
                certificacao_exame = ?,
                historico_de_escolas = ?
            WHERE id = ?
        `;
        const params = [
            data.idioma,
            data.nivel_cefr,
            data.certificacao_exame,
            data.historico_de_escolas,
            id
        ];
        const result = await query(sql, params);
        return result.affectedRows > 0;
    },

    // Deletar registro
    async delete(id) {
        const result = await query('DELETE FROM idiomas WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Idioma;
