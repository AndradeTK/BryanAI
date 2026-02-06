/**
 * Model: Experiencias
 * Gerencia as experiências profissionais
 */

const { query } = require('../config/database');

const Experiencia = {
    // Buscar todas as experiências
    async getAll() {
        return await query('SELECT * FROM experiencias ORDER BY id DESC');
    },

    // Buscar por ID
    async getById(id) {
        const results = await query('SELECT * FROM experiencias WHERE id = ?', [id]);
        return results[0] || null;
    },

    // Buscar por categoria
    async getByCategoria(categoria) {
        return await query('SELECT * FROM experiencias WHERE categoria = ? ORDER BY id DESC', [categoria]);
    },

    // Criar experiência
    async create(data) {
        const sql = `
            INSERT INTO experiencias 
            (empresa, cargo, data_inicio, data_fim, descricao_atividades, principais_conquistas, categoria, tags_tecnicas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            data.empresa,
            data.cargo,
            data.data_inicio,
            data.data_fim,
            data.descricao_atividades,
            data.principais_conquistas,
            data.categoria,
            data.tags_tecnicas
        ];
        const result = await query(sql, params);
        return result.insertId;
    },

    // Atualizar experiência
    async update(id, data) {
        const sql = `
            UPDATE experiencias SET
                empresa = ?,
                cargo = ?,
                data_inicio = ?,
                data_fim = ?,
                descricao_atividades = ?,
                principais_conquistas = ?,
                categoria = ?,
                tags_tecnicas = ?
            WHERE id = ?
        `;
        const params = [
            data.empresa,
            data.cargo,
            data.data_inicio,
            data.data_fim,
            data.descricao_atividades,
            data.principais_conquistas,
            data.categoria,
            data.tags_tecnicas,
            id
        ];
        const result = await query(sql, params);
        return result.affectedRows > 0;
    },

    // Deletar experiência
    async delete(id) {
        const result = await query('DELETE FROM experiencias WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    // Buscar experiências formatadas para o currículo
    async getAllFormatted() {
        const experiencias = await this.getAll();
        return experiencias.map(exp => ({
            ...exp,
            atividades_lista: exp.descricao_atividades ? exp.descricao_atividades.split('\n').filter(a => a.trim()) : [],
            conquistas_lista: exp.principais_conquistas ? exp.principais_conquistas.split('\n').filter(c => c.trim()) : []
        }));
    }
};

module.exports = Experiencia;
