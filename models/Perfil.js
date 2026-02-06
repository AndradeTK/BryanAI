/**
 * Model: Perfil
 * Gerencia os dados mestres do usuário
 */

const { query } = require('../config/database');

const Perfil = {
    // Buscar perfil (único registro)
    async get() {
        const results = await query('SELECT * FROM perfil LIMIT 1');
        return results[0] || null;
    },

    // Buscar por ID
    async getById(id) {
        const results = await query('SELECT * FROM perfil WHERE id = ?', [id]);
        return results[0] || null;
    },

    // Criar perfil
    async create(data) {
        const sql = `
            INSERT INTO perfil 
            (nome_completo, email, telefone, localizacao, linkedin, github, resumo_base, data_nascimento)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.nome_completo,
            data.email,
            data.telefone,
            data.localizacao,
            data.linkedin,
            data.github,
            data.resumo_base,
            data.data_nascimento
        ];
        const result = await query(sql, params);
        return result.insertId;
    },

    // Atualizar perfil
    async update(id, data) {
        const sql = `
            UPDATE perfil SET
                nome_completo = ?,
                email = ?,
                telefone = ?,
                localizacao = ?,
                linkedin = ?,
                github = ?,
                resumo_base = ?,
                data_nascimento = ?
            WHERE id = ?
        `;
        const params = [
            data.nome_completo,
            data.email,
            data.telefone,
            data.localizacao,
            data.linkedin,
            data.github,
            data.resumo_base,
            data.data_nascimento,
            id
        ];
        const result = await query(sql, params);
        return result.affectedRows > 0;
    },

    // Deletar perfil
    async delete(id) {
        const result = await query('DELETE FROM perfil WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
};

module.exports = Perfil;
