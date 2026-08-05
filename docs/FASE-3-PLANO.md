# Fase 3 — Migração para Next.js + TypeScript + Zod (a base)

> **Documento histórico.** Registra o planejamento de uma fase já concluída.
> Os caminhos citados (`../app.js`, `../services/*`) são da versão Express/EJS,
> que hoje vive só na tag `v2-legacy`. Mantido porque explica POR QUE várias
> decisões do código atual são como são — não como documentação de uso.

> **Escopo:** Reescrever a aplicação de Express/EJS/JS para Next.js 16 / React 19 / TypeScript / Zod. **Sem tocar no banco** — MySQL e a camada `mysql2` continuam intactos; a troca para Postgres é a Fase 4.
> **Branch:** `fase-3-nextjs-ts` (a partir de `main`, após merge da `fase-0-1`)
> **Ordem:** esta fase vem **antes** da Fase 2. Ver "Por que a base vem primeiro".

---

## Por que a base vem primeiro (inversão da ordem do plano macro)

O plano macro colocava o domínio canadense (Fase 2) em JavaScript, sobre o código atual, e a migração para TS/Zod (Fase 3) depois. Invertemos.

O motivo é concreto: **a parte mais importante do domínio canadense só existe de verdade como schema Zod.** A regra "um CV canadense não tem foto, idade, estado civil ou nacionalidade" (exigência jurídica dos Human Rights Codes provinciais) não é uma instrução de prompt — é a *ausência desses campos no schema*, que torna impossível o modelo emiti-los. O mesmo vale para o anti-alucinação de métricas (`BulletSchema` com `metric_grounded`). Fazer isso em JS agora e reescrever em TS depois é construir a mesma coisa duas vezes, e a versão JS é a mais fraca das duas.

Então: **primeiro a base (esta fase), depois o domínio canadense em cima dela, direto em TS/Zod** (Fase 2, que passa a ser executada por último).

Esta fase **não muda comportamento** de forma visível ao usuário. É uma troca de fundação: o que a tela faz hoje continua fazendo, mas em React em vez de EJS, com os contratos de IA validados por Zod em vez de `JSON.parse` na fé.

---

## O que morre, o que sobrevive

Sendo explícito, porque é a maior mudança estrutural do projeto:

**Morre (Express/EJS):**
- `app.js` — o bootstrap do Express vira o runtime do Next.
- `routes/web.js` e `routes/api.js` — 40+ endpoints viram Route Handlers e Server Actions.
- Todos os `controllers/*.js` — a lógica de request/response migra para route handlers finos.
- `views/**` (EJS) — páginas viram Server/Client Components; os 5 templates de currículo viram componentes React.
- Tailwind CLI standalone (`tailwind.config.js`, script `tailwind:build`) — Tailwind v4 integra no Next.
- `config/database.js` (`mysql2`) **permanece nesta fase** — só é substituído na Fase 4.

**Sobrevive quase intacto (a lógica de negócio):**
- `services/aiAnalyzer.js`, `aiWriter.js`, `aiCoverLetter.js`, `aiSkillsGap.js` — a lógica de IA não muda; muda o *chamador* e o *contrato de saída* (passa a ser validado por Zod). Portados para `src/server/ai/`.
- `services/curriculoService.js` — agregação de dados, portada quase 1:1.
- `services/documentConverter.js` — `htmlToPdf`/`htmlToDocx` continuam; ganham pool de browser (Fase 6) e passam a receber HTML de `renderToStaticMarkup`.
- `services/userSettingsService.js` — settings em JSON, portado.
- `models/*.js` — viram funções de acesso a dados em `src/server/db/`, ainda usando `mysql2` nesta fase (repositórios Drizzle é Fase 4).

**Ganho concreto — o motivo real de trocar o EJS:** hoje o preview de currículo (`/preview/:templateId`, EJS) e a geração de PDF (`apiGenerate` → `ejs.renderFile`) são dois caminhos de renderização que podem divergir silenciosamente. Com React, o template é **um** componente. O mesmo `<Harvard resume={...}/>` que a tela mostra é passado por `renderToStaticMarkup()` no route handler que alimenta o Puppeteer. Um código, dois destinos.

---

## O que a leitura do código revelou

Coisas do código atual que moldam a migração:

1. **Os prompts de IA já produzem JSON estruturado, mas sem validação.** `aiWriter.rewriteResume` ([services/aiWriter.js](../services/aiWriter.js)) monta um prompt gigante que pede um JSON com `titulo_profissional`, `experiencias[{bullets[]}]`, `habilidades_tecnicas`, etc., e faz `parseAIJson` no fim. Não há garantia de shape. O `CanadianResumeSchema` (Fase 2) vai formalizar exatamente esse contrato — então a migração já deve deixar o *ponto de validação* pronto, mesmo que o schema comece genérico.

2. **`idiomaInstrucoes` em `aiWriter.js` é o lugar do `en-CA`/`fr-CA`.** Hoje tem `pt-BR`/`en`/`fr` ([aiWriter.js:65-108](../services/aiWriter.js#L65-L108)). A Fase 2 adiciona as variantes canadenses aqui. A migração deve portar essa estrutura de forma que estender seja trivial.

3. **Cover/SkillsGap engolem erros** retornando `{success:false}`, enquanto Analyzer/Writer lançam. Inconsistência que força o chamador a checar duas coisas. A migração padroniza: todos lançam; o route handler traduz para HTTP.

4. **O front já é quase uma SPA em pontos.** `views/jobfit/index.ejs` tem ~480 linhas de `<script>` gerenciando tabs, drag-drop, e as chamadas de IA. Isso vira componentes React com estado real, não `document.getElementById`.

5. **`userSettingsService` lê um JSON de disco a cada request** (via middleware em `app.js`). No Next, isso vira uma leitura cacheável ou um Server Component que lê uma vez. Não replicar o I/O-por-request.

---

## Stack alvo

- **Next.js 16** (App Router, Turbopack) — 16.2.x é o stable atual.
- **React 19** — vem com o Next 16.
- **TypeScript** strict.
- **Zod** — validação de runtime + derivação de tipos. `zod-to-json-schema` para alimentar o `responseSchema` do Gemini.
- **Tailwind v4** — integrado ao Next, sem CLI standalone.
- **`@google/generative-ai`** — já é dependência; ganha structured output.
- **`mysql2`** — mantido nesta fase.
- **Vitest** — testes.

---

## Estrutura alvo

```
src/
  app/
    layout.tsx                      shell (dark mode, sidebar)
    (dashboard)/page.tsx            dashboard
    perfil/page.tsx                 CRUD via Server Actions
    experiencias/page.tsx
    formacao/page.tsx
    cursos/page.tsx
    idiomas/page.tsx
    jobfit/page.tsx                 análise + geração
    cover-letter/page.tsx
    skills-gap/page.tsx
    preview/[templateId]/page.tsx   preview do currículo (mesmo componente do PDF)
    api/
      jobfit/analyze/route.ts
      jobfit/generate/route.ts      → renderToStaticMarkup → Puppeteer
      jobfit/quick/route.ts         (usado pela extensão)
      jobfit/upload/route.ts
      cover-letter/route.ts
      skills-gap/route.ts
      arquivos/[filename]/route.ts  download/view
      settings/route.ts
  components/
    resume-templates/
      Minimalista.tsx  Executivo.tsx  Tech.tsx  Harvard.tsx  Classico.tsx
      types.ts                      props derivados do CanadianResumeSchema
    ui/                             botões, cards, modais reusados
  server/
    ai/
      client.ts                     genAI singleton + structured output
      retry.ts                      withRetry (portado da Fase 1)
      schemas.ts                    contratos Zod (base aqui; canadense na Fase 2)
      analyzer.ts  writer.ts  coverLetter.ts  skillsGap.ts
      prompts/                      os prompts, extraídos como constantes
    db/
      client.ts                     pool mysql2 (Fase 4 troca por Drizzle)
      perfil.ts  experiencias.ts  formacao.ts  cursos.ts  idiomas.ts  historico.ts
    resume/
      curriculoService.ts           agregação
      settings.ts
    pdf/
      render.ts                     renderToStaticMarkup + htmlToPdf/Docx
  lib/
    env.ts                          validação de process.env com Zod no boot
tests/
next.config.ts  tsconfig.json  vitest.config.ts  eslint.config.js
```

---

## As tarefas

A ordem importa: o scaffold e a camada de IA vêm antes das páginas, porque as páginas consomem os dois.

### 3.1 — Scaffold do Next.js + TypeScript + Tailwind

Criar o projeto Next 16 dentro do repo (não um `create-next-app` que sobrescreve tudo — configuração manual para preservar `chrome-extension/`, `services/`, `models/` durante a transição).

- `package.json`: adicionar `next`, `react`, `react-dom`, `typescript`, `@types/*`, `zod`, `zod-to-json-schema`, `tailwindcss@4`. Scripts `dev`/`build`/`start` do Next.
- `tsconfig.json` strict, com `paths` para `@/server`, `@/components`.
- `next.config.ts`: `output: 'standalone'` (para a imagem Docker enxuta da Fase 6), e marcar `puppeteer` como external no server.
- `src/lib/env.ts`: um schema Zod que valida `process.env` no boot — `GEMINI_API_KEY`, `DB_*`, `CORS_ORIGIN`. Falha cedo e com mensagem clara se faltar algo (hoje o erro só aparece quando a IA é chamada).
- **Transição com `allowJs: true`**: durante a migração, TS e JS coexistem. Portar arquivo a arquivo, não big-bang.

**Verificação:** `npm run dev` sobe o Next em `localhost:3000` com uma página vazia. `npm run build` passa.

### 3.2 — Camada de IA em TS com structured output

Este é o coração da fase. Portar `config/ai.js` + os quatro services de IA para `src/server/ai/`.

**`src/server/ai/client.ts`** — o singleton, com o retry da Fase 1 já portado, e um helper de structured output:

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Chama o Gemini forçando saída JSON que casa com o schema Zod,
 * e revalida a resposta com o mesmo schema (defesa em profundidade).
 * Elimina cleanAIResponse, parseAIJson e o regex-recovery de JSON truncado.
 */
export async function generateStructured<T>(opts: {
  model: string;
  schema: z.ZodType<T>;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: opts.model,
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      responseMimeType: 'application/json',
      responseSchema: zodToJsonSchema(opts.schema, { target: 'openApi3' }) as object,
    },
  });
  const result = await withRetry(() => model.generateContent(opts.prompt));
  const raw = result.response.text();
  return opts.schema.parse(JSON.parse(raw)); // lança ZodError com shape claro se divergir
}
```

Com isso, `cleanAIResponse`, `parseAIJson` e o regex-recovery de [aiAnalyzer.js:179-190](../services/aiAnalyzer.js#L179-L190) **deixam de existir**.

**`src/server/ai/schemas.ts`** — os contratos base. Aqui começam genéricos (espelhando o JSON que os prompts atuais já pedem); a Fase 2 os endurece com os campos canadenses e remove os campos proibidos.

```ts
import { z } from 'zod';

export const JobFitAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  nivel_compatibilidade: z.string(),
  resumo_executivo: z.string(),
  pontos_fortes: z.array(z.string()),
  gaps_identificados: z.array(z.string()),
  keywords_match: z.object({
    presentes: z.array(z.string()),
    ausentes: z.array(z.string()),
  }),
  recomendacoes_adaptacao: z.array(z.string()),
  experiencias_destacar: z.array(z.string()),
  probabilidade_entrevista: z.string(),
});
export type JobFitAnalysis = z.infer<typeof JobFitAnalysisSchema>;

// BulletSchema e ResumeSchema começam aqui de forma genérica;
// a Fase 2 introduz metric_grounded e o CanadianResumeSchema.
export const ResumeSchema = z.object({
  titulo_profissional: z.string(),
  resumo_profissional: z.string(),
  experiencias: z.array(z.object({
    empresa: z.string(), cargo: z.string(), periodo: z.string(),
    bullets: z.array(z.string()),
  })),
  habilidades_tecnicas: z.object({
    principais: z.array(z.string()), secundarias: z.array(z.string()),
  }),
  formacao: z.array(z.any()),
  cursos_certificacoes: z.array(z.any()),
  idiomas: z.array(z.any()),
  projetos: z.array(z.any()),
  keywords_otimizadas: z.array(z.string()),
});
export type Resume = z.infer<typeof ResumeSchema>;
```

**`analyzer.ts` / `writer.ts` / `coverLetter.ts` / `skillsGap.ts`** — portados, cada um chamando `generateStructured` com seu schema. Os prompts saem para `prompts/*.ts` como constantes (mais fácil de versionar e, na Fase 2, de estender). Padronizar: **todos lançam** em erro (Cover/SkillsGap param de retornar `{success:false}`).

**Modelo por tarefa:** `gemini-2.5-flash` para analyze/quick/upload; `gemini-2.5-pro` para `rewriteResume` e cover letter final. Centralizar os nomes em `client.ts`.

**Verificação:** teste Vitest com o Gemini mockado retornando JSON incompleto → `generateStructured` lança `ZodError` com o campo faltante nomeado, em vez de vazar para a renderização.

### 3.3 — Templates de currículo como componentes React

Portar os 5 EJS de `views/templates/` para `src/components/resume-templates/*.tsx`. Cada um recebe `props` tipados derivados do `ResumeSchema` (na Fase 2, `CanadianResumeSchema`).

O CSS inline dos templates EJS vira CSS-in-JS ou classes Tailwind, **preservando o layout de impressão** (A4, margens) — o Puppeteer depende disso.

**Verificação:** renderizar cada template com dados de exemplo e comparar visualmente com o EJS atual. O layout de impressão tem que bater.

### 3.4 — O caminho do PDF (renderToStaticMarkup → Puppeteer)

**`src/server/pdf/render.ts`:**

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import { Harvard } from '@/components/resume-templates/Harvard';
// ...seleção de template por id

export async function renderResumePdf(templateId: string, resume: Resume, lang: string) {
  const Template = pickTemplate(templateId);
  const html = renderToStaticMarkup(<Template resume={resume} lang={lang} />);
  const fullHtml = wrapWithDocument(html); // <!doctype>, <style> de impressão
  return htmlToPdf(fullHtml); // documentConverter portado
}
```

`renderToStaticMarkup` (não `renderToString`) porque é HTML morto indo para o Chrome — sem hidratação. O `preview/[templateId]/page.tsx` usa o **mesmo** componente. Nunca divergem.

**Verificação:** gerar um PDF pela rota e abrir; renderizar o preview e comparar. Bytes do HTML devem ser idênticos entre os dois caminhos.

### 3.5 — Route handlers e Server Actions

Portar os endpoints de `routes/api.js` para `src/app/api/**/route.ts`, e os CRUDs de `routes/web.js` para Server Actions.

- Cada route handler valida o **input** com Zod na borda (hoje a validação é `if (!titulo)`), chama o service, e traduz erros para HTTP.
- `jobfit/upload/route.ts`: recebe o arquivo via `formData()`, lê como buffer (o `memoryStorage` da Fase 1 já estabeleceu esse padrão), chama a extração.
- `jobfit/generate/route.ts`: o fluxo de duas chamadas de IA (`analyze` → `delay` → `rewrite`) portado, terminando em `renderResumePdf`.
- A extensão Chrome continua postando em `/api/jobfit/quick`, `/api/jobfit/generate`, `/api/cover-letter` — **manter esses paths** para não quebrar a extensão. CORS configurado para a origin dela.

**Verificação:** cada endpoint responde igual ao Express atual (mesmo shape de `{success, data|error}` onde a extensão depende disso).

### 3.6 — Páginas React

Portar as views EJS para páginas. Dashboard, os 5 CRUDs (Server Actions + forms), jobfit (a página com mais estado), cover-letter, skills-gap.

O JS inline do `jobfit/index.ejs` e do `header.ejs` (incluindo o `fetchWithTimeout` que a Fase 1 adicionou) vira lógica de componente com `useState`/`useTransition`. O timeout do `fetchWithTimeout` continua importante — chamadas de IA ainda podem levar ~30s.

**Verificação:** navegar por todas as páginas, exercer cada CRUD, rodar uma análise e uma geração ponta a ponta.

### 3.7 — Testes e lint

- **Vitest**: validação Zod (schemas rejeitam shape errado), os services de IA com Gemini mockado, o mapeamento de template.
- **ESLint flat config** + `typescript-eslint` + Prettier.
- Scripts `typecheck`, `lint`, `test` no `package.json`.

**Verificação:** `npm run typecheck && npm run lint && npm test` passam.

---

## Ordem de execução

```
3.1 scaffold Next+TS+Tailwind    ← fundação
3.2 camada de IA (TS + Zod)      ← o coração; páginas dependem disso
3.3 templates React
3.4 caminho do PDF               ← depende de 3.3
3.5 route handlers + actions     ← depende de 3.2
3.6 páginas React                ← depende de 3.3, 3.5
3.7 testes + lint
                                 ← app roda 100% em Next, MySQL intacto
```

Cada tarefa é commitável sozinha. Durante a transição (`allowJs: true`), o app pode rodar meio-Express meio-Next em pontos, mas o alvo é o Express sumir por completo ao fim de 3.6.

---

## Verificação (o teste de aceitação da fase)

Depois de 3.7, com o MySQL rodando (se você quiser testar o fluxo com banco) ou sem (para o que não depende de banco):

1. `npm run build` — a app Next compila em modo standalone.
2. `npm run typecheck && npm run lint && npm test` — verde.
3. Subir, navegar por todas as páginas — nenhuma regressão visual vs. o EJS.
4. **O teste que importa:** gerar um currículo em PDF pela UI. Como o preview e o PDF usam o mesmo componente React, ambos têm que sair idênticos. Se o PDF sai correto, o `renderToStaticMarkup → Puppeteer` funcionou.
5. Forçar o Gemini a devolver JSON malformado (mock ou chave inválida) → o erro é um `ZodError` claro no log, não uma tela quebrada.
6. A extensão Chrome ainda consegue chamar `/api/jobfit/quick` e receber a resposta no shape esperado.

---

## Riscos e o que NÃO fazer

- **NÃO migrar o banco aqui.** `mysql2` fica. Misturar a troca de framework com a troca de banco dobra a superfície de erro. Postgres é a Fase 4.
- **NÃO deixar o Puppeteer imprimir a página React viva** (`page.goto('/preview/x')`). Depende do servidor de pé, do JS hidratar, e do timing. `renderToStaticMarkup → setContent` é determinístico.
- **NÃO quebrar os paths que a extensão usa** (`/api/jobfit/quick|generate`, `/api/cover-letter`). A extensão é código separado que não migra nesta fase.
- **NÃO reescrever tudo de uma vez.** `allowJs: true` permite portar incrementalmente. Um big-bang de 40 endpoints + 12 views + 4 services numa tacada é irreparável se quebrar.
- **Risco do structured output:** o `responseSchema` do Gemini tem limitações de JSON Schema (sem alguns constraints). Se `zodToJsonSchema` gerar algo que o Gemini rejeita, simplificar o schema enviado (manter a validação Zod completa do lado de cá como a real garantia).
- **Risco do layout de impressão:** o CSS dos templates EJS foi ajustado para o Puppeteer. Ao portar para React, um pixel de margem errado quebra a paginação A4. Comparar lado a lado.

---

## Definição de pronto

- [ ] `npm run dev` e `npm run build` funcionam (Next 16 standalone)
- [ ] `npm run typecheck && npm run lint && npm test` passam
- [ ] Express, EJS e os `controllers/` foram removidos
- [ ] Todos os outputs de IA passam por `generateStructured` + validação Zod
- [ ] Cover/SkillsGap lançam em erro, como Analyzer/Writer
- [ ] Os 5 templates são componentes React; preview e PDF usam o mesmo componente
- [ ] Gerar um currículo em PDF pela UI funciona e sai idêntico ao preview
- [ ] A extensão Chrome ainda consegue chamar a API
- [ ] `mysql2` intacto — nenhuma mudança de banco
- [ ] Ponto de validação de IA pronto para a Fase 2 endurecer (schemas centralizados em `schemas.ts`)
```
