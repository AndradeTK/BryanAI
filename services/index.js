/**
 * Services Index
 * Exporta todos os serviços do sistema
 */

const aiAnalyzer = require('./aiAnalyzer');
const aiWriter = require('./aiWriter');
const documentConverter = require('./documentConverter');
const curriculoService = require('./curriculoService');

module.exports = {
    aiAnalyzer,
    aiWriter,
    documentConverter,
    curriculoService
};
