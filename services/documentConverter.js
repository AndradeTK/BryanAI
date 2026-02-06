/**
 * Service: Conversor de Documentos
 * Converte HTML para PDF (Puppeteer) e DOCX (html-to-docx)
 */

const puppeteer = require('puppeteer');
const HTMLtoDOCX = require('html-to-docx');
const path = require('path');
const fs = require('fs').promises;

// Diretório para salvar arquivos gerados
const OUTPUT_DIR = path.join(__dirname, '..', 'generated');

/**
 * Garante que o diretório de output existe
 */
async function ensureOutputDir() {
    try {
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

/**
 * Converte HTML para PDF usando Puppeteer
 * @param {string} html - Conteúdo HTML
 * @param {Object} options - Opções de configuração
 * @returns {Object} { buffer, path }
 */
async function htmlToPdf(html, options = {}) {
    await ensureOutputDir();

    const defaultOptions = {
        format: 'A4',
        margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
        },
        printBackground: true,
        preferCSSPageSize: true
    };

    const pdfOptions = { ...defaultOptions, ...options };
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Define o conteúdo HTML
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Aguarda fontes carregarem
        await page.evaluateHandle('document.fonts.ready');

        // Gera o PDF
        const pdfBuffer = await page.pdf(pdfOptions);

        // Salva o arquivo se filename fornecido
        let filePath = null;
        if (options.filename) {
            filePath = path.join(OUTPUT_DIR, options.filename);
            await fs.writeFile(filePath, pdfBuffer);
        }

        return {
            buffer: pdfBuffer,
            path: filePath
        };

    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Converte HTML para DOCX
 * @param {string} html - Conteúdo HTML
 * @param {Object} options - Opções de configuração
 * @returns {Object} { buffer, path }
 */
async function htmlToDocx(html, options = {}) {
    await ensureOutputDir();

    const defaultOptions = {
        orientation: 'portrait',
        margins: {
            top: 720,      // ~0.5 inch em twips
            right: 720,
            bottom: 720,
            left: 720
        },
        title: 'Currículo',
        font: 'Arial',
        fontSize: 11
    };

    const docxOptions = { ...defaultOptions, ...options };

    try {
        // Prepara o HTML com estilos inline para melhor compatibilidade
        const styledHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
                    h1 { font-size: 18pt; margin-bottom: 5pt; }
                    h2 { font-size: 14pt; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #333; }
                    h3 { font-size: 12pt; margin-top: 8pt; margin-bottom: 4pt; }
                    p { margin: 4pt 0; }
                    ul { margin: 4pt 0; padding-left: 20pt; }
                    li { margin: 2pt 0; }
                    .header { text-align: center; margin-bottom: 15pt; }
                    .section { margin-bottom: 10pt; }
                    .job-title { font-weight: bold; }
                    .company { font-style: italic; }
                    .period { color: #666; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        const docxBuffer = await HTMLtoDOCX(styledHtml, null, {
            orientation: docxOptions.orientation,
            margins: docxOptions.margins,
            title: docxOptions.title
        });

        // Salva o arquivo se filename fornecido
        let filePath = null;
        if (options.filename) {
            filePath = path.join(OUTPUT_DIR, options.filename);
            await fs.writeFile(filePath, docxBuffer);
        }

        return {
            buffer: docxBuffer,
            path: filePath
        };

    } catch (error) {
        console.error('Erro ao converter para DOCX:', error);
        throw new Error(`Falha na conversão para DOCX: ${error.message}`);
    }
}

/**
 * Gera nome de arquivo único
 * @param {string} prefix - Prefixo do arquivo
 * @param {string} extension - Extensão do arquivo
 * @returns {string} Nome do arquivo
 */
function generateFilename(prefix = 'CV', extension = 'pdf') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Lista arquivos gerados
 * @returns {Array} Lista de arquivos
 */
async function listGeneratedFiles() {
    await ensureOutputDir();
    const files = await fs.readdir(OUTPUT_DIR);
    return files.map(file => ({
        name: file,
        path: path.join(OUTPUT_DIR, file)
    }));
}

/**
 * Remove arquivo gerado
 * @param {string} filename - Nome do arquivo
 */
async function deleteGeneratedFile(filename) {
    const filePath = path.join(OUTPUT_DIR, filename);
    await fs.unlink(filePath);
}

/**
 * Obtém o caminho do diretório de output
 */
function getOutputDir() {
    return OUTPUT_DIR;
}

module.exports = {
    htmlToPdf,
    htmlToDocx,
    generateFilename,
    listGeneratedFiles,
    deleteGeneratedFile,
    getOutputDir
};
