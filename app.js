/**
 * BryanAI - Sistema de Otimização de Currículos e Job Fit
 * Arquivo principal do servidor Express
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { testConnection } = require('./config/database');
const { webRoutes, apiRoutes } = require('./routes');
const { ConversaoController } = require('./controllers');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================
// Middlewares
// =====================================

// CORS - Permite requisições da Chrome Extension
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logger de requisições
app.use(morgan('dev'));

// Parser de JSON e formulários
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Arquivos gerados (PDFs, DOCXs)
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// =====================================
// View Engine (EJS)
// =====================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =====================================
// Rotas
// =====================================

// Rotas Web (páginas)
app.use('/', webRoutes);

// Rotas API (REST)
app.use('/api', apiRoutes);

// Rotas de Conversão (endpoints específicos conforme requisito)
app.post('/converterhtmltopdf', ConversaoController.htmlToPdf);
app.post('/converterhtmltodocx', ConversaoController.htmlToDocx);

// =====================================
// Error Handling
// =====================================

// 404 - Página não encontrada
app.use((req, res, next) => {
    res.status(404).render('layout', {
        title: '404 - Página não encontrada',
        page: 'error',
        body: `
            <div class="flex flex-col items-center justify-center py-20">
                <h1 class="text-6xl font-bold text-gray-300">404</h1>
                <p class="text-xl text-gray-500 mt-4">Página não encontrada</p>
                <a href="/" class="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    Voltar ao Dashboard
                </a>
            </div>
        `
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('Erro:', err);

    if (req.path.startsWith('/api')) {
        return res.status(500).json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
        });
    }

    res.status(500).render('layout', {
        title: 'Erro - BryanAI',
        page: 'error',
        body: `
            <div class="flex flex-col items-center justify-center py-20">
                <h1 class="text-4xl font-bold text-red-500">Erro</h1>
                <p class="text-gray-500 mt-4">${process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro interno'}</p>
                <a href="/" class="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
                    Voltar ao Dashboard
                </a>
            </div>
        `
    });
});

// =====================================
// Inicialização do Servidor
// =====================================

async function startServer() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║                                                      ║');
    console.log('║   🚀 BryanAI - Sistema de Otimização de Currículos   ║');
    console.log('║                                                      ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');

    // Testa conexão com o banco de dados
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('⚠️  Servidor iniciando sem conexão com o banco de dados');
        console.error('   Verifique as configurações no arquivo .env');
        console.log('');
    }

    // Inicia o servidor
    app.listen(PORT, () => {
        console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
        console.log('');
        console.log('📋 Endpoints disponíveis:');
        console.log(`   • Dashboard:     http://localhost:${PORT}/`);
        console.log(`   • API:           http://localhost:${PORT}/api`);
        console.log(`   • Job Fit:       http://localhost:${PORT}/jobfit`);
        console.log(`   • Converter PDF: http://localhost:${PORT}/converterhtmltopdf`);
        console.log(`   • Converter DOC: http://localhost:${PORT}/converterhtmltodocx`);
        console.log('');
        console.log('🔧 Para desenvolvimento, execute: npm run dev');
        console.log('');
    });
}

startServer();

module.exports = app;
