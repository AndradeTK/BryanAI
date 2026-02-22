# Templates de Currículo ATS-Friendly

Este módulo fornece 3 templates de currículo profissionalmente desenhados, 100% compatíveis com sistemas de rastreamento de candidatos (ATS).

## Templates Disponíveis

### 1. Minimalista Moderno (`curriculo-minimalista.ejs`)
- **Estilo**: Clean Tech
- **Características**:
  - Tipografia limpa (Inter sans-serif)
  - Espaçamento generoso
  - Linhas finas para separar seções
  - Cores neutras com acentos sutis
- **Ideal para**: Startups, empresas de tecnologia, posições criativas

### 2. Profissional Executivo (`curriculo-executivo.ejs`)
- **Estilo**: Corporate/Executive
- **Características**:
  - Uso sutil de azul escuro (#1e3a5f)
  - Layout mais denso para mais conteúdo
  - Resumo executivo destacado
  - Visual sofisticado
- **Ideal para**: Posições sênior, consultoria, grandes empresas

### 3. Focado em Tech (`curriculo-tech.ejs`)
- **Estilo**: Developer-focused
- **Características**:
  - Seção de Skills logo após o resumo
  - Skills organizados por categoria (Backend, Frontend, DevOps)
  - Fonte monospace para elementos técnicos
  - Destaque para stack tecnológico
- **Ideal para**: Desenvolvedores, engenheiros de software, DevOps

## Compatibilidade ATS

Todos os templates seguem as diretrizes obrigatórias:

✅ **Coluna Única**: Layout linear, sem colunas duplas ou barras laterais  
✅ **Sem Gráficos Complexos**: Apenas texto e bordas simples  
✅ **Hierarquia Semântica**: `<h1>` para nome, `<h2>` para seções  
✅ **Flexibilidade**: Ordem das seções configurável via `sectionsOrder`  
✅ **Print-ready**: Otimizado para impressão em PDF  

## Variáveis de Injeção de Dados

### Dados do Perfil
```javascript
{{name}}              // Nome completo
{{email}}             // Email
{{phone}}             // Telefone
{{location}}          // Localização
{{linkedin}}          // URL do LinkedIn
{{github}}            // URL do GitHub
{{portfolio}}         // URL do Portfolio
```

### Resumo Profissional
```javascript
{{professional_summary}}  // Resumo profissional personalizado
```

### Experiência
```javascript
{{experience_list}}       // Lista de experiências
{{job_title}}            // Cargo
{{company}}              // Empresa
{{period}}               // Período (ex: "Jan 2022 - Atual")
{{location}}             // Localização da empresa
{{responsibility_1}}     // Bullet point 1
{{responsibility_2}}     // Bullet point 2
{{tech_stack}}           // Tecnologias utilizadas
```

### Skills
```javascript
{{skills_list}}          // Lista simples de skills
{{skills_by_category}}   // Skills organizados por categoria
{{backend_skill_1}}      // Skill de backend
{{frontend_skill_1}}     // Skill de frontend
{{devops_skill_1}}       // Skill de DevOps
```

### Formação
```javascript
{{education_list}}       // Lista de formações
{{degree}}               // Título/Grau
{{institution}}          // Instituição
{{graduation_status}}    // Status (ex: "Concluído em 2020")
```

### Certificações
```javascript
{{certifications_list}}  // Lista de certificações
{{certification_name}}   // Nome da certificação
{{issuer}}               // Emissor
{{date}}                 // Data
```

### Idiomas
```javascript
{{languages_list}}       // Lista de idiomas
{{language}}             // Nome do idioma
{{level}}                // Nível (ex: "C1", "Fluente")
```

### Projetos
```javascript
{{projects_list}}        // Lista de projetos
{{project_name}}         // Nome do projeto
{{project_description}}  // Descrição
{{project_tech}}         // Tecnologias do projeto
```

## Configuração

### Definir Template Padrão

```javascript
// Via API
PUT /api/templates/default
{
    "templateId": "minimalista" | "executivo" | "tech"
}
```

### Configurar Ordem das Seções

```javascript
// Via API
PUT /api/settings/sections-order
{
    "order": ["summary", "experience", "skills", "education", "certifications", "languages", "projects"]
}
```

## Uso Programático

```javascript
const { userSettingsService } = require('./services');
const ejs = require('ejs');

// Obter caminho do template
const templatePath = await userSettingsService.getTemplatePath('tech');

// Renderizar currículo
const html = await ejs.renderFile(templatePath, {
    perfil: { /* dados do perfil */ },
    curriculo: { /* dados do currículo */ },
    formacao: [ /* lista de formação */ ],
    projetos: [ /* lista de projetos */ ],
    cursos: [ /* lista de certificações */ ],
    idiomas: [ /* lista de idiomas */ ],
    lang: 'pt-BR',
    sectionsOrder: ['summary', 'skills', 'experience', 'education']
});
```

## Preview de Templates

Acesse a prévia visual de cada template:

- Minimalista: `GET /preview/minimalista`
- Executivo: `GET /preview/executivo`
- Tech: `GET /preview/tech`

## Arquivos de Configuração

O arquivo `config/user-settings.json` armazena:

```json
{
    "templatePadrao": "minimalista",
    "idiomaDefault": "pt-BR",
    "sectionsOrder": ["summary", "experience", "skills", ...],
    "preferencias": {
        "incluirProjetos": true,
        "limiteCertificacoes": 6,
        "mostrarPortfolio": true,
        "mostrarGithub": true
    },
    "templatesDisponiveis": [...]
}
```

## Idiomas Suportados

- `pt-BR` - Português (Brasil)
- `en` - Inglês
- `es` - Espanhol

Os títulos das seções são automaticamente traduzidos baseado no idioma selecionado.
