/**
 * Service: User Settings
 * Gerencia configurações do usuário e templates
 */

const fs = require('fs').promises;
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '..', 'config', 'user-settings.json');

/**
 * Carrega as configurações do usuário
 * @returns {Object} Configurações
 */
async function getSettings() {
    try {
        const data = await fs.readFile(SETTINGS_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        // Retorna configurações padrão se arquivo não existir
        return getDefaultSettings();
    }
}

/**
 * Salva configurações do usuário
 * @param {Object} settings - Configurações a salvar
 * @returns {Object} Configurações salvas
 */
async function saveSettings(settings) {
    try {
        const current = await getSettings();
        const updated = { ...current, ...settings };
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(updated, null, 4), 'utf8');
        return updated;
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        throw error;
    }
}

/**
 * Define o template padrão
 * @param {string} templateId - ID do template (minimalista, executivo, tech, harvard)
 * @returns {Object} Configurações atualizadas
 */
async function setDefaultTemplate(templateId) {
    const validTemplates = ['minimalista', 'executivo', 'tech', 'harvard'];
    if (!validTemplates.includes(templateId)) {
        throw new Error(`Template inválido. Opções: ${validTemplates.join(', ')}`);
    }
    return saveSettings({ templatePadrao: templateId });
}

/**
 * Retorna o template padrão atual
 * @returns {Object} Info do template padrão
 */
async function getDefaultTemplate() {
    const settings = await getSettings();
    const template = settings.templatesDisponiveis.find(t => t.id === settings.templatePadrao);
    return {
        templateId: settings.templatePadrao,
        ...template
    };
}

/**
 * Lista todos os templates disponíveis
 * @returns {Array} Lista de templates
 */
async function getTemplates() {
    const settings = await getSettings();
    return settings.templatesDisponiveis.map(t => ({
        ...t,
        isDefault: t.id === settings.templatePadrao
    }));
}

/**
 * Atualiza a ordem das seções
 * @param {Array} order - Nova ordem das seções
 * @returns {Object} Configurações atualizadas
 */
async function setSectionsOrder(order) {
    const validSections = ['summary', 'experience', 'skills', 'education', 'certifications', 'languages', 'projects'];
    const isValid = order.every(s => validSections.includes(s));
    if (!isValid) {
        throw new Error(`Seções inválidas. Opções: ${validSections.join(', ')}`);
    }
    return saveSettings({ sectionsOrder: order });
}

/**
 * Atualiza preferências gerais
 * @param {Object} prefs - Preferências a atualizar
 * @returns {Object} Configurações atualizadas
 */
async function updatePreferences(prefs) {
    const settings = await getSettings();
    const updated = {
        ...settings,
        preferencias: { ...settings.preferencias, ...prefs }
    };
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(updated, null, 4), 'utf8');
    return updated;
}

/**
 * Retorna configurações padrão
 * @returns {Object} Configurações default
 */
function getDefaultSettings() {
    return {
        templatePadrao: 'minimalista',
        idiomaDefault: 'pt-BR',
        sectionsOrder: ['summary', 'experience', 'skills', 'education', 'certifications', 'languages', 'projects'],
        preferencias: {
            incluirProjetos: true,
            limiteCertificacoes: 6,
            formatoDataExperiencia: 'MMM YYYY',
            mostrarPortfolio: true,
            mostrarGithub: true
        },
        templatesDisponiveis: [
            {
                id: 'minimalista',
                nome: 'Minimalista Moderno',
                descricao: 'Design clean com tipografia limpa, espaçamento generoso e linhas finas.',
                arquivo: 'curriculo-minimalista.ejs',
                previewColor: '#2d3748'
            },
            {
                id: 'executivo',
                nome: 'Profissional Executivo',
                descricao: 'Layout denso com cores sutis. Ideal para perfis sênior.',
                arquivo: 'curriculo-executivo.ejs',
                previewColor: '#1e3a5f'
            },
            {
                id: 'tech',
                nome: 'Focado em Tech',
                descricao: 'Skills no topo por categoria. Ideal para desenvolvedores.',
                arquivo: 'curriculo-tech.ejs',
                previewColor: '#0f172a'
            }
        ]
    };
}

/**
 * Obtém o caminho do arquivo de template pelo ID
 * @param {string} templateId - ID do template
 * @returns {string} Caminho do arquivo
 */
async function getTemplatePath(templateId) {
    const settings = await getSettings();
    const template = settings.templatesDisponiveis.find(t => t.id === templateId);
    
    if (!template) {
        // Fallback para template padrão
        const defaultTemplate = settings.templatesDisponiveis.find(t => t.id === settings.templatePadrao);
        return path.join(__dirname, '..', 'views', 'templates', defaultTemplate?.arquivo || 'curriculo-minimalista.ejs');
    }
    
    return path.join(__dirname, '..', 'views', 'templates', template.arquivo);
}

module.exports = {
    getSettings,
    saveSettings,
    setDefaultTemplate,
    getDefaultTemplate,
    getTemplates,
    setSectionsOrder,
    updatePreferences,
    getDefaultSettings,
    getTemplatePath
};
