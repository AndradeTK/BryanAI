/**
 * Configuração de Conexão com MySQL usando Connection Pooling
 * BryanAI - Sistema de Otimização de Currículos
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Criação do Pool de conexões para eficiência
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'infos_curriculo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Função auxiliar para executar queries
async function query(sql, params = []) {
    const [results] = await pool.execute(sql, params);
    return results;
}

// Função para testar a conexão
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexão com MySQL estabelecida com sucesso!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com MySQL:', error.message);
        return false;
    }
}

// Função para obter uma conexão do pool (para transações)
async function getConnection() {
    return await pool.getConnection();
}

module.exports = {
    pool,
    query,
    testConnection,
    getConnection
};
