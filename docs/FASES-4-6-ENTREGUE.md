# Fases 4–6 — o que foi entregue

> **Registro do que existe**, não plano do que fazer. As fases 0–3 têm planos
> escritos antes da execução ([FASE-0-1](FASE-0-1-PLANO.md),
> [FASE-2](FASE-2-PLANO.md), [FASE-3](FASE-3-PLANO.md)); as fases seguintes foram
> executadas sem plano versionado. Este documento fecha essa lacuna descrevendo o
> estado real — conferido contra o repositório e a VPS em **2026-08-30**.
>
> Para *usar* o sistema, o [README](../README.md) é a referência. Este documento
> é para entender **por que** as coisas são como são.

---

## Por que este documento existe

Os planos das fases 0–3 descrevem a Fase 4 (Postgres/Drizzle) como trabalho
futuro. Ela foi feita — e mais três coisas depois dela. Quem lesse só `docs/`
concluiria que o sistema ainda roda em MySQL, o que não é verdade desde agosto
de 2026.

---

## Fase 4 — Postgres + Drizzle

O que a Fase 3 deixou de propósito para depois: ela migrou o framework
(Express/EJS → Next.js) mantendo `mysql2` intacto, para não dobrar a superfície
de erro numa tacada só.

**Entregue:**

- **PostgreSQL 17** no lugar do MySQL 8, com **Drizzle** como ORM.
- Schema em `src/server/db/schema.ts`, migrations versionadas em
  `src/server/db/migrations/` (hoje `0000`–`0012`).
- O runner de migrations é um script próprio (`scripts/migrate.mjs`), não o
  `drizzle-kit push`: o deploy precisa de algo idempotente e auditável, que
  registre o que aplicou. O controle fica em `public._migrations`.
- `historico_geracoes` sobreviveu à migração — o ENUM `status` que a Fase 1
  consertou no MySQL virou o tipo equivalente no Postgres.

**Por que Drizzle e não Prisma:** o bundle `standalone` do Next vai inteiro para
a VPS. Prisma carrega um engine binário que precisa casar com a glibc do
servidor; Drizzle é só TypeScript. A mesma preocupação aparece na escolha do
scrypt do `node:crypto` em vez do bcrypt nativo.

---

## Fase 5 — Matching semântico (pgvector)

**Entregue:**

- Extensão **pgvector 0.8.6** no Postgres.
- Embeddings de **3072 dimensões** (`gemini-embedding-001`), guardados em
  `profile_embedding` e nas vagas.
- Catálogo **NOC 2021** completo: 516 *unit groups* em `noc_codes`. O CSV de
  origem (`src/server/db/noc-2021.csv`) traz a hierarquia inteira com 823 linhas;
  o `db:seed-noc` filtra os de nível 5 (código de 5 dígitos), que são os que
  interessam para Express Entry.
- Kanban de vagas com score de compatibilidade perfil × vaga.

**O limite que continua valendo:** o NOC segue sendo *metadado com confidence*,
nunca um gate de score — a regra que a [Fase 2](FASE-2-PLANO.md) estabeleceu.
Mapear vaga → NOC por IA erra, e um erro desses viraria uma vaga boa descartada
em silêncio.

---

## Fase 6 — Autenticação, deploy e observabilidade

A fase que transformou um projeto local numa aplicação exposta à internet.

### Autenticação

Instância de um usuário só, **sem rota de cadastro**. Os detalhes estão no
[README](../README.md#autenticação); o que importa registrar aqui é o *porquê*
de duas escolhas:

- **scrypt do `node:crypto`** (N=2¹⁶) em vez de bcrypt/argon2: módulos nativos
  descasam entre a glibc do runner do GitHub Actions e a da VPS. O build acontece
  no runner; um binário compilado lá pode não carregar aqui.
- **Sessões opacas no banco**, não JWT: dá revogação imediata. O cookie leva o
  token, o banco guarda só o SHA-256 dele.

O `middleware.ts` roda no Edge, sem acesso ao Postgres — ele só checa se o
cookie **existe**. A autorização real é `requireUser()` no layout e em cada
Server Action, e `guardApi()`/`guardPanel()` nas rotas de API. Confundir os dois
é o erro clássico: o middleware não é a barreira.

### Deploy

`git push` na `main` → GitHub Actions: typecheck → testes → build → rsync do
bundle `standalone` → migrations → `pm2 reload`. **O build nunca acontece na
VPS** (3.8 GB de RAM, dividida com outra aplicação).

Layout em `/var/www/bryanai/` (`releases/<sha>`, `current`, `shared/.env`), com
os anexos fora do release em `/var/lib/bryanai/generated/` — o deploy substitui o
release inteiro, e guardar anexos ali dentro apagaria as cartas de recomendação a
cada publicação.

A verificação pós-deploy testa **autorização**, não só se a página responde:
`/login` → 200, rota protegida → redirect sem sessão, API → 401 sem credencial.
Falhou, volta sozinho para o release anterior. As migrations **não** são
revertidas — problema de schema exige olhar o banco à mão.

Detalhes de nginx e as armadilhas (`HOSTNAME=127.0.0.1`, `deploymentId`) estão em
[`deploy/`](../deploy/).

### Observabilidade

`src/server/log.ts` — log estruturado das chamadas de IA (modelo, tokens,
latência, erro). Sem isso, "a análise está lenta" é uma reclamação sem dado; o
orçamento de tokens que quebrou a análise de vaga com perfil cheio (`985a9b6`) só
foi diagnosticável por causa dele.

---

## Depois das fases: o que veio por último

Trabalho que não se encaixa na numeração, entregue entre agosto de 2026 e hoje:

| Entrega | O que mudou |
| --- | --- |
| **Redesign Antigravity** | Linguagem visual extraída do CSS original, não imitada de olho. Ícones Material Symbols embutidos em `Icone.tsx` — o `@iconify/react` buscaria os dados na API pública a cada tela, contando a um terceiro quais páginas de um painel autenticado são usadas. |
| **Assistente conversacional** | Agente com function calling, leitura automática e escrita só com aprovação na tela. Ver [README](../README.md#assistente). |
| **Preparação para entrevista** | Roteiro de perguntas prováveis a partir da vaga e do perfil. |
| **Documentos + OCR por IA** | PDF escaneado sem camada de texto é transcrito por IA e **marcado como tal** (migration `0011`) — transcrição é reprodução, e o usuário precisa poder conferir antes que ela alimente o currículo. |
| **Currículo por vaga** | O currículo gerado fica ligado à candidatura que o originou (migration `0012`). Antes, cada geração era um arquivo solto. |
| **Papel Letter** | O currículo saía em A4; o padrão canadense é Letter (8.5×11 pol). |

---

## Estado verificado em 2026-08-30

| Item | Valor |
| --- | --- |
| Release em produção | `59a778c` — idêntico ao `main` |
| VPS | Ubuntu 22.04.5 LTS, 3.8 GB RAM |
| Processo | PM2, `bryanai` em cluster (2 instâncias), porta 3100 |
| Banco | PostgreSQL 17.10, 19 tabelas, 13 migrations aplicadas |
| pgvector | 0.8.6, embeddings de 3072 dimensões |
| NOC | 516 unit groups |
| Testes | 89 passando (13 arquivos), typecheck limpo |
| Autorização em produção | `/login` 200 · `/` 307 · API sem credencial 401 |

O que **não** foi verificado: o fluxo ponta a ponta com IA real (geração de
currículo, análise de vaga) — exigiria consumir cota do Gemini e escrever no
banco de produção.
