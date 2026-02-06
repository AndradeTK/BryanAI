/**
 * Model: Histórico de Gerações
 * Gerencia o log de currículos gerados e scores de Job Fit
 */

const { query } = require('../config/database');

const HistoricoGeracao = {
    // Buscar todos (mais recentes primeiro)
    async getAll() {
        return await query('SELECT * FROM historico_geracoes ORDER BY created_at DESC');
    },

    // Buscar por ID
    async getById(id) {
        const results = await query('SELECT * FROM historico_geracoes WHERE id = ?', [id]);
        return results[0] || null;
    },

    // Buscar últimos N registros
    async getRecent(limit = 10) {
        const safeLimit = parseInt(limit, 10) || 10;
        return await query(`SELECT * FROM historico_geracoes ORDER BY created_at DESC LIMIT ${safeLimit}`);
    },

    // Buscar apenas concluídos
    async getConcluidos() {
        return await query("SELECT * FROM historico_geracoes WHERE status = 'concluido' ORDER BY created_at DESC");
    },

    // Buscar estatísticas
    async getStats() {
        const [stats] = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'concluido' THEN 1 END) as concluidos,
                COUNT(CASE WHEN status = 'falha' THEN 1 END) as falhas,
                AVG(CASE WHEN score IS NOT NULL THEN score END) as media_score,
                MAX(score) as melhor_score,
                MIN(CASE WHEN score IS NOT NULL THEN score END) as pior_score
            FROM historico_geracoes
        `);
        return stats;
    },

    // Criar registro
    async create(data) {
        const sql = `
            INSERT INTO historico_geracoes 
            (vaga_titulo, score, keywords_focadas, status, pdf_path, created_at, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `;
        const params = [
            data.vaga_titulo,
            data.score || null,
            data.keywords_focadas || null,
            data.status || 'processando'
        ,
            data.pdf_path || null
        ];
        const result = await query(sql, params);
        return result.insertId;
    },

    // Atualizar registro
    async update(id, data) {
        const fields = [];
        const params = [];

        if (data.vaga_titulo !== undefined) {
            fields.push('vaga_titulo = ?');
            params.push(data.vaga_titulo);
        }
        if (data.score !== undefined) {
            fields.push('score = ?');
            params.push(data.score);
        }
        if (data.keywords_focadas !== undefined) {
            fields.push('keywords_focadas = ?');
            params.push(data.keywords_focadas);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            params.push(data.status);
        }
        if (data.pdf_path !== undefined) {
            fields.push('pdf_path = ?');
            params.push(data.pdf_path);
        }

        fields.push('updatedAt = NOW()');
        params.push(id);

        const sql = `UPDATE historico_geracoes SET ${fields.join(', ')} WHERE id = ?`;
        const result = await query(sql, params);
        return result.affectedRows > 0;
    },

    // Deletar registro
    async delete(id) {
        const result = await query('DELETE FROM historico_geracoes WHERE id = ?', [id]);
        return result.affectedRows > 0;
    },

    // Marcar como concluído
    async markComplete(id, score, pdfPath, keywords = null) {
        return await this.update(id, {
            status: 'concluido',
            score,
            pdf_path: pdfPath,
            keywords_focadas: keywords
        });
    },

    // Marcar como falha
    async markFailed(id) {
        return await this.update(id, { status: 'falha' });
    }
};

module.exports = HistoricoGeracao;
