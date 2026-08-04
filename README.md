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
| Estilo | Tailwind v4 |
| Testes | Vitest |

A versão anterior (Express + EJS + MySQL) está na história do repositório, na tag
`v2-legacy`.

---

## O que faz

- **Perfil** — experiências, formação, certificações, idiomas e o perfil canadense
  (autorização de trabalho, CLB/NCLC, ECA, profissão regulamentada).
- **Job Fit** — analisa uma vaga contra o perfil e devolve score, palavras-chave
  faltantes e os veredictos canadenses (autorização, idioma, NOC sugerido).
- **Geração de currículo** — 5 templates React. O mesmo componente alimenta a
  pré-visualização na tela e o PDF, então os dois não divergem.
- **Cover letter** e **Skills Gap** com plano de estudo.
- **Kanban de vagas** com matching semântico perfil × vaga via pgvector.
- **Extensão Chrome** — captura a vaga aberta em 10 job boards (LinkedIn,
  Indeed.ca, Job Bank, Greenhouse, Lever, Workday, Ashby, Glassdoor) via JSON-LD.

### Formato canadense
Um currículo canadense não leva foto, idade, estado civil ou nacionalidade —
exigência dos Human Rights Codes provinciais. Isso não é instrução de prompt: os
campos **não existem no schema Zod de saída**, então o modelo não consegue
emiti-los. A garantia é estrutural.

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

### Comandos

| Comando | O quê |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção (saída `standalone`) |
| `npm test` | Vitest |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | aplica migrations pendentes |
| `npm run db:seed-noc` | popula o catálogo NOC 2021 (516 grupos) |
| `npm run user:create` | cria conta ou troca a senha |

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

Rollback: apontar `current` para o release anterior e `pm2 reload bryanai`.

---

## Licença

CC BY-NC 4.0 — ver [LICENSE](LICENSE).
