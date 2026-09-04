# MCP com escrita mediada por proposta — plano de implementação

> Controlar os dados do BryanAI a partir de um chat de IA externo (Claude), com
> uma trava: **escrita não grava — vira proposta que você confirma no app**.
>
> Desenhado por Aria (arquitetura), Morgan (escopo) e Atlas (evidência), com as
> divergências entre eles resolvidas por verificação. Próxima migration livre:
> `0018`.

---

## Por que isso não é o que a análise anterior recusou

A avaliação de 2026-09-02 (llms.txt vs MCP vs API) recomendou **não construir
MCP** — e estava certa para a pergunta que respondia: *levar os dados para uma
IA ler*. Para leitura, colar 10 mil caracteres resolve, e o perfil inteiro são
~2.600 tokens num contexto de 200 mil.

A premissa mudou: o pedido é **controlar os dados pelo chat** — adicionar
experiência, corrigir data, mover candidatura. Para escrita, colar não resolve
nada. MCP passa a ser a ferramenta certa, e a recomendação anterior deixa de se
aplicar.

O que **não** muda da análise anterior:

- **Na prática isto é uma feature para o Claude.** O ChatGPT exige plano pago; o
  Gemini só libera conector customizado nos EUA, com conta pessoal e "Keep
  Activity" ligado. Se o uso principal for Gemini, o retorno é pequeno.
- Colar continua sendo a resposta certa para *ler*.

---

## A trava, e por que ela é o desenho inteiro

O assistente interno já não grava sozinho: propõe, a tela mostra o que mudaria,
você aprova. Um MCP com escrita direta contornaria essa proteção **exatamente
onde ela é mais necessária** — você cola descrição de vaga na conversa (texto de
terceiro, que pode carregar instrução injetada) e do outro lado há uma
ferramenta capaz de reescrever o perfil.

Não é risco teórico. O **CVE-2026-13341** (Kong Konnect MCP) é literalmente
isto: injeção indireta faz o servidor MCP executar chamadas não pretendidas em
nome do chamador.

E o desenho tem respaldo normativo:

- **Spec MCP:** *"there SHOULD always be a human in the loop with the ability to
  deny tool invocations."*
- **OWASP LLM06:** *"separate decision-making from execution so the agent can
  propose an action, but a policy service should independently validate scope,
  privilege, and approval state before execution."*

O invariante que sustenta tudo: **o handler MCP nunca chama `aplicarEscrita`.**
Ela continua alcançável por exatamente dois caminhos, ambos com sessão de
painel — `/api/chat/aplicar` e a action de confirmar proposta. Um invariante
binário é o único tipo que sobrevive a seis meses de manutenção.

---

## As divergências, resolvidas

Os três discordaram em pontos que decidem o trabalho. Resolvi cada um
verificando, não escolhendo lado.

### Biblioteca ou JSON-RPC à mão?

**Aria:** à mão, ~120 linhas, sem peso na VPS.
**Atlas:** `mcp-handler@2.1.1`, publicado um dia depois da spec.

**Verificado:**

| | |
|---|---|
| `mcp-handler` | 2.1.1, modificado 13/08/2026, 100 KB |
| Peer `@modelcontextprotocol/server` | **2.0.0, 6,3 MB** — primeira estável após 5 betas |
| VPS | 1.478 MB usados de 3.915 → **2,4 GB livres** |
| zod do projeto | 4.4.3 (exige `^4.2.0`) ✓ |
| Next / Node | 16.3.0 / v24 (exige ≥13 / ≥20) ✓ |

**Decisão: usar a biblioteca.** Aria acertou no peso (6,3 MB não é trivial), mas
errou na conclusão — a VPS tem folga, e implementar à mão significa reproduzir
`server/discover`, validação header↔body, erros `-32020`/`-32022`, `resultType`,
`ttlMs` e o fallback para clientes de 2025. Atlas mostrou que isso já está feito
e versionado.

O risco real é outro: `@modelcontextprotocol/server@2.0.0` é a primeira estável.
**Pinar versão exata** e medir memória do processo antes e depois.

### O servidor precisa ser Authorization Server?

**Aria:** sim, OAuth 2.1 mínimo embutido, 300-400 linhas.
**Atlas:** não — a doc da Anthropic confirma que pode ser **só Resource
Server**, delegando para um IdP.

**Atlas está certo, e é o achado que mais reduz escopo.** Citação da doc:
*"A cross-host authorization server doesn't need anything special on its own."*

Mas há um caminho ainda mais curto, e é o que muda o plano.

### O token que já existe serve?

Atlas encontrou `static_headers` — Bearer estático — mas **em beta, liberado a
um conjunto limitado de organizações**. A doc diz: *"If you don't see the
Request headers section in the Add custom connector dialog, your organization
doesn't have access yet."*

**Isto é um teste de dois minutos que pode eliminar um dia de trabalho.** Ver
"Verificar antes de começar", item 1.

E há um caminho que dispensa o teste: **o Claude Code aceita Bearer estático
hoje**, sem OAuth. É por isso que a Fase 2 abaixo entrega valor real sem uma
linha de OAuth.

### Existe tabela de propostas?

**Morgan** escreveu que a proposta usaria "a mesma tabela que já existe".
**Não existe.** Verifiquei: hoje a proposta é efêmera — vive na resposta do
turno e morre se você fechar a aba. A Fase 1 precisa **criar** a persistência.

---

## O recorte do v1 — 6 das 12 escritas

Regra de corte: **o v1 aceita escrita que adiciona ou reposiciona, nunca que
apaga ou toca PII.**

**Entram:** `salvarExperiencia`, `salvarFormacao`, `salvarCurso`,
`salvarIdioma`, `moverCandidatura`, `salvarResposta`.

**Ficam fora:**

| Fora | Motivo |
|---|---|
| As 4 remoções | Destrutivas. Uma remoção mal-entendida é silenciosa até você notar que a experiência sumiu |
| `salvarPerfil` | Mexe em PII — o dado que a Fase 4 decidiu redigir por padrão no link público |
| `salvarPerfilCanadense` | CLB, ECA e autorização são interdependentes; erro ali distorce o veredicto de toda vaga |

O argumento decisivo: no MCP **não há tela de revisão do pedido**, só da
proposta final. Se o modelo entendeu errado o que você quis, você aprova uma
proposta correta para um pedido que não era o seu.

Nada desaparece — remoção e PII continuam no assistente interno, onde você está
na tela do BryanAI.

---

## Migration `0018`

```sql
-- Propostas de escrita vindas de fora do painel (servidor MCP).
--
-- O assistente interno já não grava sozinho: propõe, a tela mostra o que
-- mudaria, o usuário aprova. Um MCP com escrita direta contornaria essa
-- proteção justamente onde ela é mais necessária — o dono cola descrição de
-- vaga na conversa, texto de terceiro que pode carregar instrução injetada, e
-- do outro lado está uma ferramenta capaz de reescrever o perfil inteiro.
--
-- A tabela existe porque a aprovação precisa sobreviver ao fim do turno: no
-- assistente interno a proposta vive na tela e morre com ela; aqui a conversa
-- acontece noutro app, e o dono só descobre depois.
--
-- Os argumentos ficam em jsonb sem CHECK de propósito: quem valida é o Zod de
-- ARGS_SCHEMAS, duas vezes — ao criar a proposta e de novo ao aplicar. Um
-- schema que mudar entre a criação e a confirmação deve fazer a proposta
-- antiga FALHAR na aplicação, não ser gravada por uma regra obsoleta.
CREATE TABLE IF NOT EXISTS "mcp_propostas" (
  "id" serial PRIMARY KEY,
  -- Nome INTERNO da escrita (chave de ARGS_SCHEMAS), não o nome MCP público.
  -- O público é rótulo de protocolo e pode ser renomeado sem migração; este é
  -- o que aplicarEscrita() despacha.
  "ferramenta" varchar(60) NOT NULL,
  "argumentos" jsonb NOT NULL,
  -- ON DELETE SET NULL: revogar o token não pode apagar o rastro do que ele
  -- pediu — é exatamente o que se quer ler depois de um vazamento.
  "token_id" integer REFERENCES "public_profile_tokens"("id") ON DELETE SET NULL,
  -- 'pendente' | 'aplicada' | 'rejeitada' | 'expirada'
  "estado" varchar(12) NOT NULL DEFAULT 'pendente',
  -- Mensagem de aplicarEscrita(), ou o erro de validação se falhou ao aplicar.
  "resultado" text,
  "criada_em" timestamptz NOT NULL DEFAULT now(),
  "resolvida_em" timestamptz,
  -- Sete dias. Uma proposta velha é pior que nenhuma: você não lembra do
  -- pedido, e o perfil pode ter mudado por outro caminho — aprovar às cegas
  -- reintroduziria dado obsoleto. Expiração lida na consulta, não por job:
  -- cron numa VPS de 3.8GB é infraestrutura que não se paga.
  "expira_em" timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
--> statement-breakpoint

-- A consulta quente é uma só: quantas pendentes válidas existem, para o badge
-- da navegação em cada render.
CREATE INDEX IF NOT EXISTS "mcp_propostas_pendentes_idx"
  ON "mcp_propostas" ("estado", "expira_em")
  WHERE "estado" = 'pendente';
--> statement-breakpoint

-- Um link que só lê não pode virar um que propõe escrita. DEFAULT false para
-- que TODO token existente continue sendo de leitura: propor é opt-in, nunca
-- herdado.
ALTER TABLE "public_profile_tokens"
  ADD COLUMN IF NOT EXISTS "pode_propor" boolean NOT NULL DEFAULT false;
```

---

## As fases

Cada uma deployável sozinha, no fluxo já estabelecido: pesquisa → plano → dev →
teste local → push → actions → VPS.

### Fase 1 — Propostas pendentes, sem MCP nenhum

Migration `0018`, `propostaRepo`, tela `/propostas`, `CardProposta` extraído do
`ChatClient.tsx`, badge no `AppShell`.

O card precisa fazer o que o do chat não faz: **mostrar o valor atual ao lado do
proposto**. No chat você acabou de conversar sobre aquilo; aqui você chega três
horas depois, vindo de outro app. `Empresa: Acme → Acme Corp` decide a
aprovação; `Empresa: Acme Corp` sozinho não decide nada.

Valor sozinha: marginal — melhora o assistente interno e faz o refactor. **Não
é aqui que se declara vitória.**

### Fase 2 — MCP com Bearer estático, para Claude Code

`contrato.ts` (nomes e descrições), `/api/mcp/route.ts`, bypass no middleware.
Auth: Bearer contra `public_profile_tokens`, **sem OAuth**.

**Esta é a primeira fase que entrega valor real**, e o motivo importa: o Claude
Code aceita Bearer estático hoje. Você ganha o ciclo completo — o Claude lê o
perfil, propõe alteração, você aprova no BryanAI — sem escrever uma linha de
OAuth. Todo o desenho fica exercitado no cliente fácil antes de pagar o custo do
difícil.

**Use por uma semana antes de começar a Fase 3.** Se o fluxo de propostas não
estiver bom, você descobre com um dia investido, não com três.

### Fase 3 — OAuth, para o Claude.ai no navegador

Só se o teste do item 1 mostrar que `static_headers` não está disponível.

Caminho preferido: **delegar para um IdP gerenciado** e ser só Resource Server —
`withMcpAuth` + `protectedResourceHandler` do `mcp-handler`. Caminho
alternativo: AS próprio mínimo, no molde verificado do Rezi (que Atlas sondou e
funciona no Claude).

### Fase 4 — Escopo e limites

`pode_propor` conferido no handler, checkbox no `LinksPerfil`, teto de 20
pendentes, 10 propostas/hora por token, "rejeitar todas".

Rate limit é **MUST da spec** e não há proteção do lado do Claude — Atlas
procurou e não encontrou.

---

### Fase 5 — Importar o perfil do LinkedIn

Três caminhos. O primeiro é o que você usa no dia a dia; os outros dois são
manuais, para quando não há navegador controlável:

- **Pedir ao Claude** (Claude for Chrome). Ele abre o seu perfil na sua sessão
  já logada, lê a página e chama `bryanai_profile_import` com o texto. Nenhum
  arquivo, nenhum copiar e colar. A URL do perfil ele tira de
  `bryanai_profile_read` — não está fixa no código, então muda com o cadastro.
- **Exportar perfil em PDF** (no seu perfil → More → Save to PDF). Sai na
  hora, e o sistema já sabe ler PDF: o importador de CV extrai texto e
  estrutura com IA. Traz o essencial — experiências, formação, certificações.
- **Arquivo de dados** (Settings → Data Privacy → Get a copy of your data).
  CSVs por categoria, chega em minutos se você escolher categorias
  específicas. Mais completo (50+ categorias, incluindo skills e
  recomendações), mas exige ler CSV.

**A API oficial não serve.** Verifiquei na doc: os escopos self-serve dão só
nome, headline, foto e e-mail. Experiências, formação e skills ficam em
programas de parceiro com aprovação comercial — inviável para um projeto
pessoal. E raspar o site viola os termos.

**Por que o caminho do navegador é diferente de raspar.** Quem lê é o seu
navegador, na sua sessão, sob um comando seu — a mesma leitura que você faria
com os olhos. Não há robô percorrendo perfis de terceiros nem coleta em escala.

**E por que ele passa pela fila de propostas.** A Anthropic mede 11,2% de
sucesso em ataques de prompt injection contra o Claude no navegador, *com* as
defesas ligadas. Uma página de perfil é conteúdo de terceiro que vira entrada
do modelo. Aqui isso não alcança o banco: o import cria proposta como qualquer
escrita, então o pior caso continua sendo lixo numa fila que você rejeita.

**Por que não reusar o importador de CV como está:** ele GRAVA direto. Você já
tem 4 experiências cadastradas, e o LinkedIn traz as mesmas com texto
diferente — importar assim duplicaria tudo e sobrescreveria o que você já
refinou. Cada item importado vira **proposta**, com o antes → depois que o
card já mostra.

O que vem do LinkedIn é o que você escreveu lá: enxuto, às vezes com o
vocabulário inflado da plataforma. Não é fonte melhor que o perfil atual — é
fonte diferente, útil pelo que você esqueceu de trazer. Onde ganha de
verdade: certificações e cursos, que costumam estar mais completos lá.

O teto de 40 propostas/hora da Fase 4 foi calibrado para isto: um import em
lote manda dezenas de uma vez.

---


## Detalhes que quebram se errados

Todos de fonte primária, via Atlas:

- **`destructiveHint: true` força prompt de confirmação no próprio Claude**, por
  chamada. É uma camada de aprovação a mais, de graça. E o default é traiçoeiro:
  omitir a anotação faz `destructiveHint` valer `true`.
- **Tool única que lê e escreve é rejeitada** na review da Anthropic. Separar.
- **Retornar "proposta criada" como sucesso**, não `isError: true`. Erro faz o
  modelo tentar de novo; sucesso com estado terminal faz ele parar.
- **O 401 precisa ser HTTP 401** com `WWW-Authenticate`. Um 200 com
  `isError: true` faz o Claude passar o texto ao modelo e seguir, sem card de
  conectar.
- **`resource` do PRM tem que bater exatamente** com a URL digitada, path
  incluso.
- **Rate limit responde 429 no nível HTTP**, não `isError`. Você quer que o
  modelo pare, não que se auto-corrija.
- **Autenticação do conector não pode ser trocada depois** — rotacionar token
  exige recriar o conector no Claude.

---

## Verificar antes de começar

Em ordem de quanto muda a arquitetura:

1. 🔴 **A seção "Request headers" aparece no diálogo de conector?**
   Claude.ai → Customize → Connectors → Add custom connector. **Se aparecer, a
   Fase 3 inteira desaparece.** Dois minutos contra um dia.
2. 🔴 **O Claude.ai declara capability de `elicitation`?** Logar
   `_meta["io.modelcontextprotocol/clientCapabilities"]` de cada request.
3. 🟠 **Qual `MCP-Protocol-Version` o Claude manda?** Se ainda for `2025-11-25`,
   é o caminho legado da biblioteca que está em uso.
4. 🟠 **`mcp-handler@2` expõe `annotations` em `registerTool`?** Se não, é
   bloqueador para o `destructiveHint`.
5. 🟡 **Testar com MCP Inspector antes do Claude** — isola bug de protocolo de
   bug de conector.
6. 🟡 **Túnel HTTPS** (`cloudflared`) para desenvolvimento: localhost não é
   alcançável pela infra da Anthropic (egress `160.79.104.0/21`).

---

## O que NÃO fazer

1. **Não chamar `aplicarEscrita` do handler MCP.** Nem "só para as operações
   inofensivas". O invariante é binário.
2. **Não construir "aprovar todas".** "Rejeitar todas" sim — a assimetria é o
   desenho.
3. **Não auto-aprovar por tipo de operação.** Mover candidatura para `rejected`
   apaga um estado que não se recupera.
4. **Não expor ferramenta de leitura sem autenticação.** O dado de leitura é o
   currículo inteiro.
5. **Não aceitar token na query string** em `/api/mcp`. O `?token=` de
   `/api/public/perfil` existe porque colar URL numa IA era a única forma; aqui
   não é.
6. **Não gerar descrição de ferramenta a partir de dado do banco.** Descrições
   são estáticas, no código — é o que mantém tool poisoning em zero.
7. **Não criar job de limpeza de propostas expiradas.** Filtro na query.
8. **Não fazer o MCP escrever em `chat_conversas`.** Duas conversas com
   semânticas diferentes na mesma tabela, e o histórico reenviado ao Gemini
   passaria a conter turnos que nunca existiram para ele.

---

## A fila

**Antes disto: o bug do orçamento de thinking do Gemini.**

Medido em produção: 7.863 tokens de raciocínio contra 315 de resposta, cortando
geração de currículo. É o núcleo do produto degradado em silêncio, na mesma
família do truncamento que a Fase 1 corrigiu para `generateText()`.

Uma feature nova não passa na frente de um bug ativo. Ordem:

```
1. thinking budget   ← bug, cortando geração hoje
2. MCP Fase 1        ← propostas persistidas
3. MCP Fase 2        ← o ciclo completo, via Claude Code
4. #26 / #27         ← P2 pequenos, cabem em qualquer intervalo
5. MCP Fase 3/4      ← só se o teste do item 1 exigir
```

## Como saber se funcionou

**Taxa de propostas do MCP aprovadas sem edição, contra a mesma taxa do
assistente interno.** Contar chamadas não distingue sucesso de ruído — você pode
chamar cinco vezes porque o modelo errou cinco vezes. Aprovar sem editar
significa que o modelo externo entendeu tão bem quanto o interno.

Secundária: **propostas que ficam mais de 48h sem decisão.** Se acumular, a
visibilidade da Fase 3 era necessária, não opcional.
