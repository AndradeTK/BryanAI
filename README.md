# BryanAI

Ferramenta pessoal de candidatura a vagas com foco no mercado canadense: mantém o
perfil profissional, analisa a compatibilidade com uma vaga, gera currículos ATS
e cartas de apresentação, e acompanha as candidaturas num kanban.

Produção: **https://app.bryanandrade.dev** — instância de um usuário só, com login.

---

## Stack

| Camada | Escolha |
| --- | --- |
| Aplicação | Next.js 16 (App Router) · React 19 · TypeScript strict |
| Validação | Zod 4 — inclusive nos contratos de saída da IA |
| Banco | PostgreSQL 17 + pgvector (embeddings de 3072 dimensões) |
| ORM | Drizzle |
| IA | Google Gemini (`gemini-2.5-flash` / `-pro`) com structured output |
| Documentos | Puppeteer (PDF) · html-to-docx (DOCX) |
| Estilo | Tailwind v4 · DM Sans · Material Symbols (Iconify) |
| Testes | Vitest |

A versão anterior (Express + EJS + MySQL) está na história do repositório, na tag
`v2-legacy`. O registro de como se chegou aqui — e por que certas decisões são
como são — está em [`docs/`](docs/).

---

## O que faz

- **Perfil** — experiências, formação, certificações, idiomas e o perfil canadense
  (autorização de trabalho, CLB/NCLC, ECA, profissão regulamentada).
- **Job Fit** — analisa uma vaga contra o perfil e devolve score, palavras-chave
  faltantes e os veredictos canadenses (autorização, idioma, NOC sugerido).
- **Geração de currículo** — 5 templates React. O mesmo componente alimenta a
  pré-visualização na tela e o PDF, então os dois não divergem. O currículo
  gerado fica ligado à candidatura que o originou.
- **Assistente** — um agente conversacional que lê o perfil, as candidaturas e os
  documentos, e **propõe** alterações nos dados. Ver [Assistente](#assistente).
- **Preparação para entrevista** — a partir da vaga e do perfil, monta o roteiro
  de perguntas prováveis e os pontos a defender.
- **Documentos** — anexos (diplomas, cartas, certificados) com extração de texto.
  PDF escaneado, sem camada de texto, é transcrito por IA e marcado como tal.
- **Cover letter** e **Skills Gap** com plano de estudo.
- **Kanban de vagas** com matching semântico perfil × vaga via pgvector.
- **Extensão Chrome** — captura a vaga aberta em 10 job boards (LinkedIn,
  Indeed.ca, Job Bank, Greenhouse, Lever, Workday, Ashby, Glassdoor) via JSON-LD.

---

## Design

A interface segue a linguagem visual do **Google Antigravity**, extraída do CSS
da página original — não imitada de olho.

- Uma escala única de cinzas frios, do branco a `#121317`. Cor é escassa de
  propósito: `#1a73e8` aparece só como acento, e a hierarquia vem de
  tipografia, espaço e bordas hairline (12% e 6% de opacidade) em vez de
  sombras.
- **O botão primário é neutro**, não colorido. A escala Tailwind `primary`
  aponta para o quase-preto; `accent`/`on-accent` invertem com o tema, então no
  escuro o botão fica claro com texto escuro — como as *inverse surfaces* do
  sistema original.
- Botões, selos e o item ativo da navegação são pílulas completas.
- Tracking negativo progressivo: quanto maior o texto, mais apertado.

**Fontes.** O Antigravity usa Google Sans Flex e Google Sans Code, que são
proprietárias. DM Sans é o substituto livre mais próximo — mesma construção
geométrica, que é o que sustenta título grande com tracking negativo. Mono é
JetBrains Mono.

**Ícones.** Material Symbols Rounded, do set `material-symbols` do
[Iconify](https://icones.js.org). Não é escolha estética: o CSS do Antigravity
declara `font-family: Google Symbols`, o nome atual dessa mesma família.

Os 23 caminhos SVG estão embutidos em [`src/components/Icone.tsx`](src/components/Icone.tsx)
em vez de virem do `@iconify/react`. O `<Icon>` daquele pacote busca os dados na
API pública do Iconify em runtime — o navegador pediria a `api.iconify.design` a
cada tela, contando a um terceiro quais páginas de um painel autenticado são
usadas, e quebrando se a API cair. Para um conjunto fixo, embutir custa ~13KB,
não faz requisição externa e é tree-shakeable. O arquivo documenta como
acrescentar um ícone novo.

### Formato canadense
Um currículo canadense não leva foto, idade, estado civil ou nacionalidade —
exigência dos Human Rights Codes provinciais. Isso não é instrução de prompt: os
campos **não existem no schema Zod de saída**, então o modelo não consegue
emiti-los. A garantia é estrutural.

O papel é **Letter** (8.5×11 pol), não A4 — o padrão norte-americano. Um
currículo em A4 sai com margens erradas na impressora de um recrutador canadense.

---

## Assistente

Um agente com function calling que conversa sobre os seus dados e propõe
mudanças neles. As ferramentas são separadas em duas categorias, e a separação é
o mecanismo de segurança:

- **Leitura** (`lerPerfil`, `listarExperiencias`, `listarCandidaturas`,
  `listarDocumentos`, …) — o modelo chama sozinho, durante a conversa.
- **Escrita** (`salvarPerfil`, `salvarExperiencia`, `removerFormacao`, …) — o
  modelo **não executa**. Ele emite uma proposta, que aparece na tela para você
  aprovar ou descartar.

Uma proposta aprovada volta ao servidor por `POST /api/chat/aplicar`, que trata
o corpo como **entrada não confiável** mesmo numa instância de um usuário só: a
proposta faz um ida-e-volta pelo navegador entre ser gerada e ser aceita. O nome
da ferramenta é conferido contra a allowlist e os argumentos são revalidados por
Zod antes de qualquer gravação. Nada é escrito com base na palavra do cliente.

---

## Rodando local

Requisitos: Node ≥ 20.9, PostgreSQL 17 com a extensão `vector`.

```bash
npm install
cp .env.example .env      # preencha DATABASE_URL, GEMINI_API_KEY, AUTH_SECRET

npm run db:migrate        # aplica as migrations
npm run user:create -- --email voce@exemplo.com   # cria a conta de acesso
npm run dev
```

`AUTH_SECRET` e `EXTENSION_API_TOKEN` se geram com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Carregando seus dados

O `db:seed` insere dados **fictícios**, só para a tela não ficar vazia num
ambiente novo. Os dados reais nunca passam pelo código: use
**Configurações → Importar** com o JSON de `/api/dados/export`. Assim o
repositório não vira uma segunda cópia — desatualizada — do que está no banco.

### Comandos

| Comando | O quê |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (saída `standalone`) |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | gera migration a partir do schema Drizzle |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:seed` | dados de exemplo (fictícios) |
| `npm run db:seed-noc` | popula o catálogo NOC 2021 (516 grupos) |
| `npm run user:create` | cria conta ou troca a senha |
| `npm run gen:css` | reembute o CSS dos templates de currículo |

---

## Autenticação

Instância de um usuário só: **não há rota de cadastro**. A conta nasce do
`user:create` e o login é a única porta.

- Senha com **scrypt** (N=2¹⁶) do `node:crypto` — sem módulo nativo, o que evita
  o descasamento de glibc entre o runner do CI e a VPS.
- Sessões **opacas no banco**, não JWT: dá revogação imediata. O cookie leva o
  token; o banco guarda só o SHA-256 dele.
- Cookie `httpOnly`, `secure` em produção, `sameSite=lax`, 30 dias deslizantes.
- Login com **rate limit** de 5 tentativas / 15 min, por e-mail *e* por IP, com
  contagem persistida (reiniciar o processo não devolve tentativas).
- Resposta e tempo idênticos para e-mail inexistente e senha errada — não dá para
  enumerar contas.

O `middleware.ts` só checa se o cookie **existe**; ele roda no Edge, sem acesso ao
Postgres. A autorização de verdade é `requireUser()` no layout e em cada Server
Action, e `guardApi()`/`guardPanel()` nas rotas de API.

A extensão não tem cookie (roda no contexto do site da vaga) e autentica por
`Authorization: Bearer <EXTENSION_API_TOKEN>`. O CORS é uma allowlist dos 10 job
boards do manifest — nunca `*`.

---

## Deploy

`git push` na `main` dispara o GitHub Actions: typecheck → testes → build →
rsync do bundle `standalone` para a VPS → migrations → `pm2 reload`.

O build acontece no runner, nunca na VPS — ela tem 3.8 GB de RAM e divide o
espaço com outra aplicação.

```
/var/www/bryanai/
  releases/<sha>/     bundle do release
  current -> releases/<sha>
  shared/.env         segredos (fora do git)
/var/lib/bryanai/generated/   PDFs e anexos (sobrevivem ao deploy)
```

Depois do reload o workflow **verifica autorização em produção**, não só se a
página responde: `/login` tem que dar 200, uma rota protegida tem que
redirecionar sem sessão, e a API tem que devolver 401 sem credencial. Se
qualquer uma falhar, ele volta sozinho para o release anterior — as migrations
**não** são revertidas, então um problema de schema exige olhar o banco à mão.

Rollback manual: apontar `current` para o release anterior e
`pm2 reload bryanai`. Os três últimos releases ficam no disco.

Detalhes da VPS, do nginx e das decisões que não se explicam sozinhas estão em
[`deploy/`](deploy/). Dois pontos que já custaram tempo:

- **`HOSTNAME=127.0.0.1` precisa estar no ambiente do processo**, não só no
  `.env`. O `server.js` do build standalone lê a variável antes de o Next
  carregar os arquivos de ambiente; sem ela a aplicação escuta em `0.0.0.0` e
  responde direto pela porta, sem HTTPS e sem os cabeçalhos `X-Forwarded-*` de
  que o rate limit do login depende.
- **`deploymentId` é o SHA do commit.** O id de cada Server Action deriva do
  build. Sem essa marcação, uma aba aberta durante o deploy envia um id que o
  servidor novo não conhece e o Next responde com um erro opaco — na tela,
  *"this page couldn't load"*. Com ela, o router recarrega a página sozinho.

---

## Licença

CC BY-NC 4.0 — ver [LICENSE](LICENSE).
