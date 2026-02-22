/**
 * Services Index
 * Exporta todos os serviços do sistema
 */

const aiAnalyzer = require('./aiAnalyzer');
const aiWriter = require('./aiWriter');
const aiCoverLetter = require('./aiCoverLetter');
const aiSkillsGap = require('./aiSkillsGap');
const documentConverter = require('./documentConverter');
const curriculoService = require('./curriculoService');
const userSettingsService = require('./userSettingsService');

module.exports = {
    aiAnalyzer,
    aiWriter,
    aiCoverLetter,
    aiSkillsGap,
    documentConverter,
    curriculoService,
    userSettingsService
};
