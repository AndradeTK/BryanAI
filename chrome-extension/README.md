# BryanAI Chrome Extension

Extensão para capturar vagas de sites como LinkedIn, Gupy, Indeed e outros, e analisar a compatibilidade com seu currículo.

## 📦 Instalação

### 1. Gerar ícones (obrigatório)

Antes de instalar, você precisa gerar os ícones PNG a partir do SVG. Você pode:

**Opção A: Usar conversor online**
1. Acesse [SVG to PNG Converter](https://svgtopng.com/)
2. Faça upload do arquivo `icons/icon128.svg`
3. Baixe versões em 16x16, 48x48 e 128x128 pixels
4. Salve como `icon16.png`, `icon48.png` e `icon128.png` na pasta `icons/`

**Opção B: Criar ícones simples**
Salve estas imagens na pasta `icons/`:

Você pode criar imagens PNG simples com qualquer editor de imagem com fundo azul (#3b82f6) e a letra "B" em branco.

### 2. Instalar no Chrome

1. Abra o Chrome e acesse `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `chrome-extension`

## 🚀 Como Usar

### Captura Automática
1. Navegue até uma página de vaga (LinkedIn, Gupy, etc.)
2. Um botão azul flutuante aparecerá no canto inferior direito
3. Clique no botão ou no ícone da extensão
4. Os dados da vaga serão capturados automaticamente

### Análise Manual
1. Clique no ícone da extensão na barra do Chrome
2. Cole o título e descrição da vaga manualmente
3. Clique em **Analisar Compatibilidade** ou **Gerar Currículo Otimizado**

## 🌐 Sites Suportados

- LinkedIn (linkedin.com)
- Gupy (gupy.io)
- Indeed (indeed.com)
- Glassdoor (glassdoor.com)
- Vagas.com.br
- Catho (catho.com.br)
- InfoJobs (infojobs.com.br)

## ⚙️ Configuração

Por padrão, a extensão conecta em `http://localhost:3000`. Para alterar:

1. Clique no ícone da extensão
2. Expanda **Configurações**
3. Altere a URL do servidor
4. Clique em **Salvar**

## 🔒 Permissões

- **activeTab**: Permite acessar a página atual para capturar dados
- **storage**: Salva suas configurações localmente
- **host_permissions**: Permite conectar ao servidor BryanAI

## 🐛 Troubleshooting

### "Servidor offline"
- Verifique se o servidor BryanAI está rodando
- Execute `npm start` na pasta do projeto

### "Não foi possível capturar os dados"
- Alguns sites podem ter estruturas diferentes
- Tente selecionar o texto da vaga manualmente antes de capturar
- Use a opção de colar manualmente

### Extensão não aparece
- Verifique se os ícones PNG estão na pasta `icons/`
- Recarregue a extensão em `chrome://extensions/`
