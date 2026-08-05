# Extensão Chrome — BryanAI

Captura a vaga que está aberta no navegador e envia para o BryanAI: análise de
compatibilidade, geração de currículo e cover letter, sem sair da página.

## Instalação

1. `chrome://extensions/`
2. Ative o **Modo do desenvolvedor**
3. **Carregar sem compactação** → selecione esta pasta

Os ícones PNG já estão em `icons/`; não é preciso gerar nada.

## Configuração — obrigatória

A extensão fala com `https://app.bryanandrade.dev` por padrão. O servidor exige
autenticação em todas as rotas desde que passou a responder num domínio
público, e a extensão **não tem cookie de sessão** — ela roda no contexto do
site da vaga, não no do painel. Sem o token, toda chamada volta `401`.

1. Clique no ícone da extensão → aba **Config**
2. Cole o valor de `EXTENSION_API_TOKEN` no campo **Token de acesso**
3. **Salvar Configurações**

O token está no `.env` do servidor:

```bash
ssh SEU_SERVIDOR "grep '^EXTENSION_API_TOKEN=' /var/www/bryanai/shared/.env"
```

O indicador no topo do popup mostra **Online** quando o servidor responde e o
token é aceito.

> Rodando local? Troque a URL do servidor para `http://localhost:3000` na mesma
> aba. O token continua sendo o do seu `.env`.

## Como usar

**Na página de uma vaga**, a extensão injeta um painel flutuante:

| Ação | O que faz |
| --- | --- |
| Analisar compatibilidade | Score, gaps e veredictos canadenses |
| Salvar no kanban | Cria a candidatura em `/jobs` |
| Gerar CV | Currículo adaptado à vaga, em PDF |
| Cover letter | Carta de apresentação |
| Preparar aplicação | Casa os campos do formulário com suas respostas salvas |

**Pelo popup**, dá para colar título e descrição na mão — útil em site sem
suporte, ou quando a captura não pega a descrição inteira.

O painel pode ser desligado pelo popup (**Painel na página**).

### Como a captura funciona

Em cascata, parando no primeiro que der certo:

1. **JSON-LD** `schema.org/JobPosting` — quase todo ATS canadense emite, e é o
   caminho mais confiável
2. **Seletores CSS** por site — fallback para quem não emite JSON-LD
3. **Seleção manual** — você seleciona o texto da vaga e a extensão usa isso

O HTML da página vai inteiro para o servidor, que faz o parse. A lógica de
extração fica num lugar só (`src/server/jobs/ingest-parse.ts`), em vez de
duplicada entre extensão e backend.

## Sites suportados

`linkedin.com` · `indeed.ca` · `indeed.com` · `jobbank.gc.ca` ·
`greenhouse.io` · `lever.co` · `ashbyhq.com` · `myworkdayjobs.com` ·
`glassdoor.ca`

> Os sites brasileiros (Gupy, Catho, InfoJobs, Vagas.com.br) saíram quando o
> projeto passou a focar no mercado canadense.

## O que a extensão **não** faz

**Não captura listas de vagas em lote.** Existia uma função que varria a página
de resultados, abria cada vaga e importava todas para uma fila de triagem. A
extração das listagens não era confiável — os cards só trazem título e empresa,
e a navegação automática quebrava com a renderização assíncrona do LinkedIn e
do Indeed. Foi removida junto com a tela de triagem.

**Não envia formulário de candidatura.** O "Preparar aplicação" preenche os
campos e para aí — o clique em *Enviar* é sempre seu. É uma linha deliberada,
para não violar os termos de uso dos sites.

## Permissões

| Permissão | Para quê |
| --- | --- |
| `activeTab` | Ler a página da vaga que você está vendo |
| `storage` | Guardar a URL do servidor e o token, localmente |
| `downloads` | Baixar o PDF/DOCX gerado |
| `host_permissions` | Falar com o servidor BryanAI |

O token fica no `chrome.storage.local`: não sincroniza entre dispositivos e não
sai da máquina, além das chamadas ao seu próprio servidor.

## Problemas comuns

**"Offline" no indicador**
Servidor fora do ar, URL errada ou token ausente/incorreto — os três falham
igual. Confira a aba Config e teste a URL no navegador.

**Toda chamada volta 401**
Token não configurado ou desatualizado. Se você rotacionou o
`EXTENSION_API_TOKEN` no servidor, precisa colar o novo aqui.

**"Não consegui ler a vaga nesta página"**
O site não emitiu JSON-LD e os seletores não casaram. Selecione o texto da
descrição na página e tente de novo — a seleção é o terceiro fallback.

**Mudanças no código não aparecem**
A extensão é carregada sem compactação: não se atualiza sozinha. Recarregue em
`chrome://extensions/` depois de cada `git pull`.
