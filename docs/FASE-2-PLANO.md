# Fase 2 — Domínio canadense (sobre a base TS/Zod)

> **Documento histórico.** Registra o planejamento de uma fase já concluída.
> Os caminhos citados (`../app.js`, `../services/*`) são da versão Express/EJS,
> que hoje vive só na tag `v2-legacy`. Mantido porque explica POR QUE várias
> decisões do código atual são como são — não como documentação de uso.

> **Escopo:** Ensinar o sistema o que é uma candidatura canadense — NOC, autorização de trabalho, CLB/NCLC, equivalência de diplomas (ECA), formato canadense de CV, e o anti-alucinação de métricas. Tudo em TypeScript/Zod, sobre a base da Fase 3.
> **Branch:** `fase-2-dominio-canadense` (a partir da `fase-3` já mergeada)
> **Ordem:** executada **depois** da Fase 3. Ver "Por que depois".

---

## Por que esta fase vem depois da Fase 3

Invertemos a ordem do plano macro de propósito. A razão está na natureza da proteção mais importante desta fase:

**Um CV canadense não pode ter foto, idade, estado civil ou nacionalidade.** Isso não é preferência estética — é exigência dos Human Rights Codes provinciais, e um recrutador canadense descarta (ou é obrigado a descartar) um CV que os inclua. A forma correta de garantir isso **não é uma instrução de prompt** (que o modelo pode ignorar), e sim a *ausência desses campos no schema de saída*. Se o `CanadianResumeSchema` não tem um campo `photo`, o Gemini com structured output não consegue emiti-lo. A proteção é estrutural.

Isso só existe se os schemas já forem Zod — o que a Fase 3 estabeleceu. Fazer esta fase em JS antes, como o plano macro colocava, seria construir a versão fraca (prompt) e depois refazer a versão forte (schema). Por isso a base veio primeiro.

**Esta é a fase que ataca a dor #1 do produto:** hoje o sistema gera um CV genérico e chama de "otimizado". Depois desta fase, ele sabe a diferença entre uma vaga que patrocina e uma que exige LMIA, entre um diploma brasileiro cru e um com ECA, entre "Objetivo" e "Professional Summary".

---

## O que a leitura do código revelou

1. **`idiomaInstrucoes` em `aiWriter.js` já tem a estrutura certa, só faltam as variantes canadenses.** Hoje é `pt-BR`/`en`/`fr` ([services/aiWriter.js:65-108](../services/aiWriter.js#L65-L108)), cada uma com `instrucao`/`verbos`/`periodo`/`extra`. Adicionar `en-CA` e `fr-CA` é estender esse mapa — na versão TS da Fase 3.

2. **O `WRITER_SYSTEM_PROMPT` induz alucinação de métricas.** [aiWriter.js:41-44](../services/aiWriter.js#L41-L44) diz *"Incluir métricas sempre que possível"* e mostra `"Impulsionei vendas em 40%"` como exemplo bom. O modelo não *encontra* 40% no currículo do usuário — ele *inventa*. Isso é uma bomba numa entrevista, onde o candidato terá que defender um número que nunca existiu.

3. **`curriculoService` já agrega o perfil todo** ([services/curriculoService.js](../services/curriculoService.js)). O `canada_profile` entra como mais uma fonte nessa agregação — o grounding canadense (work auth, CLB, ECA) é injetado no prompt a partir daí.

4. **A análise já produz `keywords_match` e `probabilidade_entrevista`.** O `JobFitAnalysisSchema` da Fase 3 só precisa ganhar os veredictos canadenses (`work_auth_verdict`, `language_verdict`, `noc_suggestion`).

---

## O modelo do domínio

### O perfil canadense — dados estruturados, não texto livre

Um novo registro único `canada_profile` (mesmo padrão do `perfil` atual). Na Fase 4 vira tabela Postgres; nesta fase, enquanto ainda é MySQL, uma tabela nova simples ou um JSON — o importante é o *shape*, capturado em Zod:

```ts
// src/server/ai/schemas.ts (estende o que a Fase 3 criou)
export const WorkAuthorization = z.enum([
  'citizen', 'pr', 'pgwp', 'owp', 'spouse_owp',
  'study_permit', 'needs_lmia', 'needs_sponsorship',
]);

export const CanadaProfileSchema = z.object({
  work_authorization: WorkAuthorization,
  authorized_provinces: z.array(z.string()),      // ['ON','BC',...]
  preferred_provinces: z.array(z.string()),
  clb_english: z.number().min(1).max(12).nullable(),
  nclc_french: z.number().min(1).max(12).nullable(),
  language_test: z.enum(['ielts','celpip','tef','tcf','none']),
  eca_status: z.enum(['none','in_progress','wes','ices','iqas','ces','icas']),
  regulated_profession: z.string().nullable(),     // 'P.Eng', 'CPA', null
  license_status: z.enum(['na','not_started','in_progress','licensed']),
  canadian_exp_months: z.number().min(0),
});
```

### As regras determinísticas — antes do LLM, não dentro dele

`src/server/domain/canada/rules.ts`. Estas rodam **antes** de gastar um token com o Gemini:

```ts
/** Vaga impossível → score 0, sem chamar a IA. */
export function workAuthVerdict(profile: CanadaProfile, jobText: string) {
  const requiresAuth = /must be (legally )?authorized to work|no sponsorship|not able to sponsor/i.test(jobText);
  const needsSponsor = ['needs_lmia','needs_sponsorship','study_permit'].includes(profile.work_authorization);
  if (requiresAuth && needsSponsor) return 'needs_sponsorship_blocker'; // score 0
  return 'ok';
}

/** Quebec + francês exigido + NCLC baixo → penalidade forte. */
export function languageVerdict(profile: CanadaProfile, job: { province?: string; text: string }) {
  const frenchRequired = job.province === 'QC' && /français|french required|bilingual/i.test(job.text);
  if (frenchRequired && (profile.nclc_french ?? 0) < 7) return 'below_requirement';
  return 'ok';
}
```

O `analyze/route.ts` chama `workAuthVerdict` primeiro; se for `needs_sponsorship_blocker`, retorna score 0 **sem chamar o Gemini**. Não se gasta token com vaga impossível.

Profissão regulada (P.Eng, CPA) exigida e não licenciado → gap crítico, mas **não** score zero — muitas vagas aceitam "eligible for licensure".

### CEFR → CLB: tabela de faixas, não função exata

`src/server/domain/canada/clb.ts`. O mapeamento CEFR→CLB é **aproximado por design** (B2 ≈ CLB 7-8, C1 ≈ CLB 9-10, C2 ≈ CLB 11-12) — os sistemas de teste são diferentes, então não existe conversão 1:1. A função retorna uma faixa e uma estimativa conservadora:

```ts
const CEFR_TO_CLB: Record<string, { min: number; max: number }> = {
  'C2': { min: 11, max: 12 }, 'C1': { min: 9, max: 10 },
  'B2': { min: 7, max: 8 },   'B1': { min: 5, max: 6 },
  'A2': { min: 3, max: 4 },   'A1': { min: 1, max: 2 },
};
// Usa o mínimo da faixa para não superestimar o candidato.
export const cefrToClb = (cefr: string) => CEFR_TO_CLB[cefr]?.min ?? null;
```

O schema `idiomas` atual guarda `nivel_cefr`; esta função deriva o CLB para exibir no CV canadense.

### O CV canadense — protegido por schema

O `CanadianResumeSchema` substitui o `ResumeSchema` genérico da Fase 3. A diferença que importa é o que **não** está lá:

```ts
const BulletSchema = z.object({
  text: z.string(),
  metric_grounded: z.boolean(),         // true só se a métrica veio do input
  metric_placeholder: z.string().nullable(), // '[valor a confirmar]' quando não veio
});

export const CanadianResumeSchema = z.object({
  professional_summary: z.string(),     // "Professional Summary", NÃO "Objetivo"
  experiences: z.array(z.object({
    company: z.string(), title: z.string(),
    period: z.string(),                 // formato MM/YYYY
    bullets: z.array(BulletSchema),
  })),
  skills: z.object({ primary: z.array(z.string()), secondary: z.array(z.string()) }),
  education: z.array(z.object({
    institution: z.string(), credential: z.string(), period: z.string(),
    canadian_equivalency: z.string().nullable(), // "WES-assessed equivalent to..."
  })),
  languages: z.array(z.object({
    language: z.string(),
    clb: z.number().nullable(),         // derivado de CEFR
  })),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string() })),
  keywords_optimized: z.array(z.string()),
  // AUSENTES POR DESIGN — proteção jurídica: photo, age, date_of_birth,
  // marital_status, nationality, gender, sin. O modelo não pode emitir o que
  // o schema não declara.
});
```

### O anti-alucinação de métricas

O prompt de escrita muda de *"inclua métricas sempre que possível"* para uma regra de grounding:

> Quantifique **apenas** com números presentes nos dados do candidato. Se um bullet não tem métrica no input, gere `metric_grounded: false` e coloque em `metric_placeholder` um marcador como `"[quantificar: ex. % de melhoria]"`. **Nunca invente números.**

A UI (React, da Fase 3) destaca os bullets com `metric_grounded: false` — um badge "confirme este número" — para o usuário preencher com dados reais antes de usar o CV. O que era um risco de entrevista vira um checklist de preenchimento.

---

## As tarefas

### 2.1 — Perfil canadense (dados + captura)

- `CanadaProfileSchema` em `schemas.ts`.
- Tabela/armazenamento para o `canada_profile` (registro único). Enquanto MySQL: tabela simples nova. A Fase 4 a normaliza no Postgres.
- Página `src/app/canada/page.tsx`: formulário para work auth, CLB/NCLC, ECA, província, profissão regulada. Server Action para salvar.
- `curriculoService` passa a incluir o `canada_profile` na agregação.

**Verificação:** preencher o perfil e confirmar que os dados chegam ao prompt (inspecionar o prompt montado, ou o `ai_call_log` quando existir).

### 2.2 — Regras determinísticas

- `src/server/domain/canada/rules.ts`: `workAuthVerdict`, `languageVerdict`, regra de profissão regulada.
- `src/server/domain/canada/clb.ts`: `cefrToClb`.
- `jobfit/analyze/route.ts`: chama `workAuthVerdict` **antes** do Gemini; short-circuit para score 0 se bloqueado.

**Verificação (a mais importante):** cadastrar `work_authorization = needs_lmia`, analisar uma vaga com "must be legally authorized to work in Canada" no texto → **score 0 e nenhuma chamada ao Gemini**. Provar que o LLM não foi chamado (log/mock).

### 2.3 — Schema de análise canadense

- Estender `JobFitAnalysisSchema` (da Fase 3) com `work_auth_verdict`, `language_verdict`, `noc_suggestion: { code, confidence } | null`.
- O prompt do analyzer recebe o bloco de grounding canadense (work auth, CLB, ECA) montado a partir do `canada_profile`.

**Verificação:** uma análise real traz os veredictos canadenses preenchidos e coerentes com o perfil.

### 2.4 — `CanadianResumeSchema` + `en-CA`/`fr-CA`

- Substituir `ResumeSchema` por `CanadianResumeSchema` em `writer.ts` e nos templates React (props re-derivados).
- Adicionar `en-CA` e `fr-CA` ao mapa de idiomas: grafia canadense (`colour`, `centre`), "Professional Summary", datas MM/YYYY, telefone `+1`.
- Renderizar `canadian_equivalency` na seção de formação quando existir: *"Bachelor of Computer Science (Brazilian equivalent to Canadian Bachelor's, WES-assessed)"*.
- Os templates React ganham a variante de formato canadense (sem foto, ordem canadense de seções).

**Verificação:** gerar um CV em `en-CA` e conferir: nenhum campo proibido presente, "Professional Summary" no lugar de "Objetivo", datas MM/YYYY, equivalência de diploma renderizada.

### 2.5 — Anti-alucinação de métricas

- Reescrever o `WRITER_SYSTEM_PROMPT` com a regra de grounding.
- `BulletSchema` com `metric_grounded`/`metric_placeholder` (já no `CanadianResumeSchema`).
- UI: badge nos bullets `metric_grounded: false`.

**Verificação:** gerar um CV a partir de um perfil **sem nenhuma métrica** cadastrada → nenhum bullet contém um número inventado; todos os bullets sem dado real vêm com `metric_grounded: false` e um placeholder. Este é o teste que prova que a bomba de entrevista foi desarmada.

### 2.6 — NOC (leve, como metadado)

O NOC 2021 (código de 5 dígitos + TEER 0-5) é usado por Express Entry e citado por muitos empregadores. Mapear vaga → NOC por IA **erra**, então tratamos como *insight*, não como filtro:

- Um seed mínimo de `noc_codes` (os mais comuns para a área do usuário), ou pedir ao Gemini a sugestão com `confidence`.
- `noc_suggestion` guarda `code` + `confidence`. A UI mostra como sugestão, permite override manual. **Nunca** usar o NOC como gate de score.

O matching semântico completo (embeddings, seed do NOC inteiro) é da Fase 5 — aqui é só o campo e a sugestão.

**Verificação:** uma análise sugere um NOC plausível com confidence; a UI permite corrigir; o score não muda por causa do NOC.

---

## Ordem de execução

```
2.1 perfil canadense (dados + página)      ← base do grounding
2.2 regras determinísticas (rules + clb)   ← rodam antes do LLM
2.3 schema de análise canadense            ← depende de 2.1
2.4 CanadianResumeSchema + en-CA/fr-CA     ← o coração da proteção
2.5 anti-alucinação de métricas            ← junto com 2.4 (mesmo schema)
2.6 NOC como metadado
                                           ← domínio canadense completo
```

---

## Verificação (o teste de aceitação da fase)

Três cenários que provam que o sistema virou canadense:

1. **Vaga impossível.** Perfil `needs_lmia` + vaga "no sponsorship" → score 0, zero tokens gastos.
2. **CV juridicamente seguro.** Gerar em `en-CA` → grep no output não encontra `photo`, `age`, `nationality`, `marital`; "Professional Summary" presente; datas MM/YYYY; diploma com equivalência WES.
3. **Sem métricas inventadas.** Perfil sem números → nenhum bullet com percentual fabricado; todos os bullets sem dado real marcados `metric_grounded: false`.

Se os três passam, a dor #1 do produto foi resolvida.

---

## Riscos e o que NÃO fazer

- **NÃO garantir a proteção jurídica só por prompt.** É o schema (ausência de campos) que garante. Um prompt "não inclua foto" é ignorável; um schema sem campo `photo` é impossível de violar. Se por algum motivo o structured output não puder ser usado num caminho, esse caminho **não** pode gerar CV canadense.
- **NÃO tratar CEFR→CLB como exato.** É aproximado; usar o mínimo da faixa para não superestimar o candidato (superestimar num CV que vai a um recrutador é pior que subestimar).
- **NÃO usar o NOC como filtro de score.** O mapeamento por IA erra. Metadado com confidence e override manual, nunca gate.
- **NÃO deixar o veredicto de work auth ser um "talvez" caro.** A regra é determinística e roda antes do LLM justamente para não gastar token com vaga impossível. Se virar mais uma coisa que o Gemini decide, perde-se o ponto.
- **Risco de falso-bloqueio:** o regex de "must be authorized" pode pegar uma vaga que na verdade patrocina mas menciona a frase em outro contexto. Manter o veredicto explicável (mostrar ao usuário *por que* deu score 0) e permitir override.

---

## Definição de pronto

- [ ] `canada_profile` capturado e injetado no grounding dos prompts
- [ ] `workAuthVerdict` roda antes do Gemini; vaga impossível = score 0 sem chamar o LLM
- [ ] `languageVerdict` penaliza Quebec+francês+NCLC baixo
- [ ] `cefrToClb` deriva CLB por faixa (mínimo conservador)
- [ ] `CanadianResumeSchema` sem os campos proibidos (foto/idade/nacionalidade/estado civil)
- [ ] `en-CA` e `fr-CA` no mapa de idiomas; "Professional Summary", MM/YYYY, +1
- [ ] Equivalência de diploma (ECA) renderizada quando presente
- [ ] Nenhum bullet com métrica inventada; `metric_grounded` marca os não-fundamentados; UI destaca
- [ ] `noc_suggestion` com confidence, override manual, sem afetar score
- [ ] Os três cenários de aceitação passam
```
