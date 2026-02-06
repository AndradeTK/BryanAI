# 🚀 BryanAI - Sistema de Otimização de Currículo e Job Fit

Sistema completo para análise de compatibilidade com vagas e geração de currículos otimizados para ATS, utilizando inteligência artificial.

## ✨ Funcionalidades

- **Dashboard** com estatísticas e visão geral do currículo
- **CRUD completo** para todas as seções do currículo (Perfil, Experiências, Formação, Cursos, Idiomas)
- **Análise de Job Fit** com score de 0-100 usando IA
- **Geração de currículo otimizado** para ATS com palavras-chave relevantes
- **Conversão para PDF e DOCX** com layout profissional
- **Chrome Extension** para capturar vagas diretamente do LinkedIn, Gupy e outros sites
- **Histórico de gerações** com rastreamento completo

## 🛠️ Tecnologias

- **Backend**: Node.js + Express.js
- **Banco de Dados**: MySQL com connection pooling (sem ORM)
- **Views**: EJS + Tailwind CSS
- **IA**: Google Gemini 2.5 Flash
- **PDF**: Puppeteer
- **DOCX**: html-to-docx

## 📁 Estrutura do Projeto

```
BryanAI/
├── app.js                 # Arquivo principal do servidor
├── package.json           # Dependências do projeto
├── .env                   # Variáveis de ambiente (criar a partir do .env.example)
├── config/
│   └── database.js        # Configuração do MySQL
├── controllers/           # Controladores
│   ├── DashboardController.js
│   ├── PerfilController.js
│   ├── ExperienciaController.js
│   ├── FormacaoProjetoController.js
│   ├── EducacaoCursoController.js
│   ├── IdiomaController.js
│   ├── JobFitController.js
│   └── ConversaoController.js
├── models/                # Modelos de dados
│   ├── Perfil.js
│   ├── Experiencia.js
│   ├── FormacaoProjeto.js
│   ├── EducacaoCurso.js
│   ├── Idioma.js
│   └── HistoricoGeracao.js
├── services/              # Serviços
│   ├── aiAnalyzer.js      # Análise de Job Fit com IA
│   ├── aiWriter.js        # Reescrita de currículo com IA
│   ├── curriculoService.js # Agregação de dados do currículo
│   └── documentConverter.js # Conversão PDF/DOCX
├── routes/
│   ├── web.js             # Rotas das páginas
│   └── api.js             # Rotas da API REST
├── views/
│   ├── layout.ejs
│   ├── partials/
│   ├── dashboard/
│   ├── perfil/
│   ├── experiencias/
│   ├── formacao/
│   ├── cursos/
│   ├── idiomas/
│   ├── jobfit/
│   └── templates/
├── public/
│   ├── css/
│   └── js/
├── generated/             # Arquivos gerados (PDF/DOCX)
└── chrome-extension/      # Extensão para Chrome
```

## 🚀 Instalação

### 1. Clone e instale as dependências

```bash
cd BryanAI
npm install
```

### 2. Configure o banco de dados

Crie um banco MySQL e execute o script SQL:

```bash
mysql -u root -p < infos_curriculo.sql
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e edite:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
# Servidor
PORT=3000
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=bryan_ai

# Google Gemini AI
GEMINI_API_KEY=sua_chave_api_aqui
```

### 4. Inicie o servidor

```bash
npm start
```

Ou em modo desenvolvimento com auto-reload:

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🔌 API Endpoints

### Currículo
- `GET /api/curriculo/completo` - Dados completos do currículo
- `GET /api/curriculo/validar` - Validação e completude

### Job Fit
- `POST /api/jobfit/quick` - Análise rápida de compatibilidade
- `POST /api/jobfit/analyze` - Análise completa
- `POST /api/jobfit/generate` - Gera currículo otimizado

### Conversão
- `POST /converterhtmltopdf` - Converte HTML para PDF
- `POST /converterhtmltodocx` - Converte HTML para DOCX

### CRUD (para cada entidade)
- `GET /api/{entidade}` - Listar
- `GET /api/{entidade}/:id` - Buscar por ID
- `POST /api/{entidade}` - Criar
- `PUT /api/{entidade}/:id` - Atualizar
- `DELETE /api/{entidade}/:id` - Deletar

## 🧩 Chrome Extension

Veja as instruções de instalação em [chrome-extension/README.md](chrome-extension/README.md)

## 📊 Fluxo de Uso

1. **Configure seu perfil** com dados pessoais
2. **Adicione experiências** profissionais
3. **Cadastre formação** e projetos relevantes
4. **Registre cursos** e certificações
5. **Informe idiomas** e níveis
6. **Use o Job Fit** para analisar vagas
7. **Gere currículos** otimizados para cada vaga

## 🤖 IA - Personas

O sistema utiliza duas personas de IA especializadas:

### Recrutador Técnico Sênior (Análise)
- 15+ anos de experiência em Tech Recruiting
- Especialista em triagem e entrevistas técnicas
- Analisa compatibilidade real vs. requisitos

### Engenheiro de ATS (Escrita)
- Especialista em otimização para ATS
- Usa a "Fórmula Mágica": [Verbo de Ação] + [Tarefa] + [Resultado Quantificável]
- Posiciona palavras-chave estrategicamente

## 📝 Licença

Este projeto é para uso pessoal.

---

Desenvolvido com ❤️ usando Node.js e Google Gemini AI
