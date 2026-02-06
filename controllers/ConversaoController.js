/**
 * Controller: Conversão de Documentos
 * Endpoints para converter HTML em PDF/DOCX
 */

const { documentConverter } = require('../services');

const ConversaoController = {
    /**
     * Converte HTML para PDF
     * POST /converterhtmltopdf
     */
    async htmlToPdf(req, res) {
        try {
            const { html, filename } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML é obrigatório'
                });
            }

            const options = {};
            if (filename) {
                options.filename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
            } else {
                options.filename = documentConverter.generateFilename('documento', 'pdf');
            }

            // Opções de margem customizadas
            if (req.body.margin) {
                options.margin = req.body.margin;
            }

            const result = await documentConverter.htmlToPdf(html, options);

            // Se solicitado download direto
            if (req.query.download === 'true') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${options.filename}"`);
                return res.send(result.buffer);
            }

            res.json({
                success: true,
                data: {
                    filename: options.filename,
                    path: result.path,
                    size: result.buffer.length
                }
            });

        } catch (error) {
            console.error('Erro ao converter para PDF:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Converte HTML para DOCX
     * POST /converterhtmltodocx
     */
    async htmlToDocx(req, res) {
        try {
            const { html, filename } = req.body;

            if (!html) {
                return res.status(400).json({
                    success: false,
                    error: 'HTML é obrigatório'
                });
            }

            const options = {};
            if (filename) {
                options.filename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
            } else {
                options.filename = documentConverter.generateFilename('documento', 'docx');
            }

            const result = await documentConverter.htmlToDocx(html, options);

            // Se solicitado download direto
            if (req.query.download === 'true') {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename="${options.filename}"`);
                return res.send(result.buffer);
            }

            res.json({
                success: true,
                data: {
                    filename: options.filename,
                    path: result.path,
                    size: result.buffer.length
                }
            });

        } catch (error) {
            console.error('Erro ao converter para DOCX:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Lista arquivos gerados
     * GET /api/arquivos
     */
    async listFiles(req, res) {
        try {
            const files = await documentConverter.listGeneratedFiles();
            res.json({
                success: true,
                data: files
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Download de arquivo gerado
     * GET /api/arquivos/:filename
     */
    async downloadFile(req, res) {
        try {
            const { filename } = req.params;
            const outputDir = documentConverter.getOutputDir();
            const filePath = require('path').join(outputDir, filename);
            
            res.download(filePath, filename, (err) => {
                if (err) {
                    res.status(404).json({
                        success: false,
                        error: 'Arquivo não encontrado'
                    });
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Visualizar arquivo inline (sem download)
     * GET /api/arquivos/:filename/view
     */
    async viewFile(req, res) {
        try {
            const { filename } = req.params;
            const outputDir = documentConverter.getOutputDir();
            const filePath = require('path').join(outputDir, filename);
            const fs = require('fs');
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Arquivo não encontrado'
                });
            }
            
            // Determina o content-type baseado na extensão
            const ext = require('path').extname(filename).toLowerCase();
            const contentTypes = {
                '.pdf': 'application/pdf',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            
            const contentType = contentTypes[ext] || 'application/octet-stream';
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Deleta arquivo gerado
     * DELETE /api/arquivos/:filename
     */
    async deleteFile(req, res) {
        try {
            const { filename } = req.params;
            await documentConverter.deleteGeneratedFile(filename);
            res.json({
                success: true,
                message: 'Arquivo removido com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = ConversaoController;
