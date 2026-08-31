# Plano de melhorias — auditoria de 2026-08-30

> Levantado a partir de 15 problemas relatados pelo dono do projeto, auditados
> por três agentes especializados (UX/UI, qualidade de IA, modelo de dados) e
> **verificados no código** antes de entrar aqui. Cada item cita arquivo:linha.
>
> Próxima migration livre: `0013`.

---

## O achado mais importante

**O prompt do writer ensina a IA a inventar métricas.**
[`prompts.ts:58-59`](../src/server/ai/prompts.ts#L58-L59) mostra como *exemplo bom*:

> ✅ Bom: "Impulsionei vendas em **40%** implementando estratégia de upselling para **200+** clientes"
> ✅ Bom: "Desenvolvi **15** APIs RESTful em Node.js reduzindo tempo de resposta em **60%**"

E 20 linhas depois, no mesmo prompt, a REGRA CRÍTICA DE MÉTRICAS diz "NUNCA
invente números". O few-shot ensina exatamente o que a regra proíbe — e few-shot
costuma pesar mais que instrução.

Isto é **a regressão do bug que a Fase 2 existiu para corrigir**:
[`docs/FASE-2-PLANO.md`](FASE-2-PLANO.md) identificou esse mesmo padrão no
`aiWriter.js` legado ("o modelo não *encontra* 40% no currículo — ele *inventa*")
e a migração para TypeScript trouxe o texto de volta. Correção de uma linha,
prioridade máxima.

---

## P0 — Quebrado, corrigir primeiro

| # | Problema | Arquivo | Esforço |
|---|---|---|---|
| 1 | Exemplo com métrica inventada no prompt do writer | [`prompts.ts:58-59`](../src/server/ai/prompts.ts#L58-L59) | P |
| 2 | `generateText()` não detecta truncamento | [`client.ts:181-205`](../src/server/ai/client.ts#L181-L205) | P |
| 3 | "Melhorar com IA" corta o texto | [`texto/melhorar/route.ts:75`](../src/app/api/texto/melhorar/route.ts#L75) | P |
| 4 | Reordenação desfaz sozinha (race condition) | [`CrudList.tsx:97`](../src/components/CrudList.tsx#L97) | P |
| 5 | Vaga arquivada some sem volta | [`JobsBoard.tsx:33-39`](../src/app/(app)/jobs/JobsBoard.tsx#L33-L39) | P |
| 6 | Não existe excluir candidatura | [`jobs/[id]/route.ts`](../src/app/api/jobs/[id]/route.ts) | P |
| 7 | PATCH apaga campo não enviado | [`jobs/[id]/route.ts:75-82`](../src/app/api/jobs/[id]/route.ts#L75-L82) | P |
| 8 | Notas perdidas ao clicar fora do modal | [`JobDetailModal.tsx:90-101,124`](../src/app/(app)/jobs/JobDetailModal.tsx#L90-L101) | P |
| 9 | CSS inválido no popup | [`popup.html:739`](../chrome-extension/popup.html#L739) | P |

### 1. Métrica inventada no prompt
Trocar os dois exemplos por versões sem número, ou anotar explicitamente
"número ilustrativo — só use se vier dos dados reais". A `REGRA CRÍTICA` que já
existe fica; o que sai é o few-shot que a contradiz.

### 2–3. Truncamento silencioso
`generateStructured()` verifica `finishReason === "MAX_TOKENS"` e avisa
([`client.ts:154-164`](../src/server/ai/client.ts#L154-L164)). `generateText()`
— usado por "Melhorar com IA", cover letter e otimizar-perfil — **não verifica
nada**: devolve o texto cortado como se fosse resposta completa.

Foi exatamente o que aconteceu no exemplo relatado: a saída parou em
"Implementou", sem erro, sem aviso.

Correção em duas partes: replicar a checagem em `generateText`, e subir
`maxOutputTokens` de 2048 → 4096 na rota de melhorar (a saída em bullets gasta
mais tokens que o parágrafo de entrada).

**Além do truncamento, o prompt degrada o texto.** A instrução manda "organizar
em bullets" sem exigir preservar o que estava lá, então a IA fragmenta e dilui:
"criando módulos de roteirização logística, contratos digitais com assinatura
eletrônica, faturamento automatizado e microserviços de comunicação em tempo
real via WhatsApp" virou "Desenvolveu módulos de roteirização logística" —
três entregas sumiram. A `INSTRUCAO.atividades` precisa exigir que cada
tecnologia, módulo e entrega citada apareça no resultado.

### 4. Reordenação que volta sozinha
```ts
// CrudList.tsx:96-97 — roda DURANTE o render
const idsChanged = rows.map(i => i.id).join(",") !== order.map(i => i.id).join(",");
if (idsChanged && editingId === null && !adding) setOrder(rows);
```
`reorderAction` é fire-and-forget dentro de `startTransition` (linha 105). Se
qualquer `revalidatePath` chegar antes da confirmação, o servidor devolve a
ordem **antiga** e essa linha sobrescreve a ordem local. A lista pisca de volta.

O `isPending` do `useTransition` é descartado na linha 93 (`const [, startTransition]`),
então não há spinner nem erro — falha totalmente silenciosa.

**Esta é a causa mais provável do "dava erro, não atualizava, depois de um tempo
atualizou"** que você relatou. Vale dizer que existe uma segunda hipótese: o
commit `c5df964` descreve o mesmo sintoma causado por deploy com aba aberta
(Server Action ID de outro build) — já corrigido via `deploymentId`. Se o
episódio foi antes de 04/08/2026, foi esse. Se foi depois, é o `CrudList`.

### 5–7. Kanban
Três bugs distintos:

- **`archived` existe no enum** ([`schema.ts:266`](../src/server/db/schema.ts#L266))
  **mas não em `COLUNAS`** — a vaga sai da tela e não há UI para trazer de volta.
- **Nenhum DELETE** em rota ou action. `applicationRepo` não tem `remove`.
- **PATCH destrutivo**: `SET notes = ..., follow_up_date = ${followUpDate || null}`.
  Mandar só `notes` zera a data. Hoje o único chamador manda os dois campos, então
  não dispara — é uma arma carregada esperando o segundo chamador.

O padrão **não está replicado**: é a única rota que escreve SQL bruto em vez de
usar `repositoryX.update(id, partial)` do Drizzle, que é seguro por construção.
Vale virar regra do projeto.

Proposta: soft-delete (`deleted_at`) em vez de hard-delete — preserva histórico,
é reversível, e o board filtra `WHERE deleted_at IS NULL`.

### 8. Perda de notas
`salvarNotas` ([linha 90](../src/app/(app)/jobs/JobDetailModal.tsx#L90)) não lê
`res.ok`: se o PATCH falhar, o botão volta ao normal como se tivesse salvo. E o
backdrop fecha o modal ([linha 124](../src/app/(app)/jobs/JobDetailModal.tsx#L124))
sem avisar sobre texto não salvo. Digitou a nota, clicou fora, perdeu.

### 9. CSS inválido
`var(--surface)-space: pre-wrap` deveria ser `white-space: pre-wrap` — um
find-replace de tokenização trocou a palavra errada. A cover letter não respeita
quebras de linha.

---

## P1 — Ausente e dói

| # | Feature | Esforço |
|---|---|---|
| 10 | Campo de observações na geração | M |
| 11 | Descrição capturada pela extensão vem suja | M |
| 12 | Configurações da extensão não persistem | P |
| 13 | Preview em "Meus anexos" | P |
| 14 | Link de visualização em "Gerações recentes" | P |
| 15 | Anexos/links em Experiências e Formação | G |
| 16 | Histórico do assistente no banco | G |
| 17 | API pública de leitura do perfil | M |
| 18 | Truncamento silencioso na análise | P |

### 10. Campo de observações — o ponto mais delicado
Você quer poder dizer "só 2 páginas", "tirar a experiência X", "focar em backend".
Isso é conteúdo de usuário entrando num prompt que tem regras críticas. Precisa
de contenção, mesmo vindo de você:

- Delimitar em `<observacao_usuario>` e declarar que é preferência de **forma**,
  nunca fonte de **fato**.
- Posicionar **depois** dos dados reais e **antes** da tarefa.
- Instruir a ignorar pedidos de fato novo ("diga que trabalhei na Google").
- Declarar que as regras de ouro têm prioridade absoluta sobre qualquer texto
  dentro do bloco, inclusive "ignore as regras acima".
- **Verificação pós-geração**: comparar as empresas do `Resume` gerado contra as
  do banco. Empresa fora do conjunto = sinal de injeção bem-sucedida.

A proteção do formato canadense continua estrutural — o schema Zod não tem campo
`photo`, então nenhum texto reintroduz.

### 11. Por que o currículo da extensão sai diferente
**Não são dois prompts.** Ambos chamam a mesma rota, mesma função, mesmo
`getFullResume()`. Verifiquei `idioma`, `templateId`/`template` e `applicationId`
— nenhum altera o prompt.

A diferença é a **descrição da vaga**. No site você cola o texto revisado. Na
extensão, [`content.js`](../chrome-extension/content.js) captura do DOM: tenta
JSON-LD, cai para seletor CSS com `innerText` (linha 107), e no pior caso usa
`window.getSelection()` (linha 157) — o que estiver selecionado na página.

O caminho JSON-LD limpa HTML (linha 135); o caminho CSS **não limpa nada**, e
`innerText` de um container do LinkedIn traz metadados, "Ver mais" truncado e
"Vagas similares" junto. Prompt igual, insumo diferente, resultado diferente.

Correção: aplicar a mesma limpeza ao caminho CSS, e mostrar a descrição
capturada no popup para revisão antes de gerar.

### 12. Configurações da extensão
Correção do meu diagnóstico anterior: `chrome.storage.local` **funciona** — mas
salva só `serverUrl`, `apiToken` e `stats`
([`popup.js:78,94`](../chrome-extension/popup.js#L78)). `template` e `idioma` são
lidos na hora de gerar (linhas 417-418) e nunca persistidos. Duas linhas em
`loadConfig`/`saveConfig`.

### 15. Anexos em Experiências e Formação
`experiencias` não tem nenhum campo de link. `formacaoEProjetos` tem **um**
`link` só, sem rótulo. Daí a comparação com o LinkedIn, que aceita várias mídias
por item.

Proposta: generalizar a tabela `documents` (já existe, migration `0009`) com
`entity_type`/`entity_id`, tornar `filename` opcional (para anexo que é só link)
e adicionar `url`. Mais um flag `exclude_from_resume` fixo em `true` para esses
anexos — deixa explícito no **schema**, não em convenção, que isso nunca entra no
currículo gerado, que é exatamente o que você pediu.

### 17. API pública do perfil — com uma ressalva
Você pediu `app.bryanandrade.dev/profile.md` para colar numa IA. Recomendo
**não** deixar público sem credencial: seu perfil tem telefone, e-mail e
localização ([`schema.ts:30-32`](../src/server/db/schema.ts#L30-L32)), e uma URL
fixa pública é indexável pelo Google e por qualquer scraper.

Proposta: mesma URL, mas com token dedicado (tabela com hash SHA-256, igual ao
padrão de `sessions` que já existe), revogável sem redeploy, e com contato
**redigido por padrão**. Markdown por padrão, `?format=json` opcional. Reusa a
agregação de `/api/dados/export`, que já existe.

Assim o caso de uso funciona (colar numa IA), e um link vazado não expõe seus
dados de contato para sempre.

### 18. Truncamento na análise
- `quickAnalysis` corta a vaga em **1000 caracteres**
  ([`analyzer.ts:166`](../src/server/ai/analyzer.ts#L166)) — os "must have"
  costumam vir no fim. O badge de score na página pode estar julgando um terço
  da vaga.
- `analyzeExternalResume` corta o CV em **10000**
  ([`analyzer.ts:194`](../src/server/ai/analyzer.ts#L194)) — um CV de 3 páginas
  passa disso e é avaliado pela metade.

Ambos silenciosos.

---

## P2 — Polish

| # | Item | Esforço |
|---|---|---|
| 19 | Remover botão "ver score na página" da extensão | P |
| 20 | Diminuir botões da extensão (`padding 12px 16px` → `8px 14px`) | P |
| 21 | Trocar emojis por ícones na extensão | M |
| 22 | CSS morto (`:hover {}` vazio, `#bryanai-float-btn` sem elemento) | P |
| 23 | `.header-icon` invisível (branco 20% sobre branco) | P |
| 24 | Cores hardcoded ignorando os tokens do próprio arquivo | P |
| 25 | Separar currículos gerados de documentos (mover para `/historico`) | M |
| 26 | Campo "descreva" quando tipo de documento = "Outro" | P |
| 27 | Prompts editáveis nas configurações | G |
| 28 | Acessibilidade: focus trap, Esc, `aria-live`, `aria-label` no ✕ | M |
| 29 | Baixar `temperature` do writer (0.7 → 0.5-0.6) | P |
| 30 | Health-check da extensão usa `guardPanel` e sempre dá "Offline" | P |

### 21. Sobre os ícones — por que não Font Awesome
Você citou Font Awesome, e a dor é real: a extensão usa dezenas de emojis
(🚀 🎯 📄 ✉️ ⚙️ 📋) como interface. Emoji renderiza diferente em cada SO e não
tem `aria-label`.

Mas carregar Font Awesome por CDN reintroduziria, de forma pior, o problema que
[`Icone.tsx`](../src/components/Icone.tsx) resolveu: a extensão roda em **toda
aba de vaga que você abre**, então um CDN externo veria não só as telas do seu
painel, mas todo site de vaga que você visita.

Alternativa: extrair 10-15 SVGs do `Icone.tsx` para um `chrome-extension/icons.js`
standalone. Mesma filosofia, zero requisição externa. Se quiser Font Awesome
mesmo assim, self-hosted resolve — só não por CDN.

### 27. Prompts editáveis — com proteção estrutural
Você quer editar todos os prompts com botão "restaurar padrão". O risco é óbvio:
apagar a regra anti-alucinação e o sistema volta a inventar métricas.

A proteção não pode ser "confiar que não vai apagar". O prompt final deve ser
**composto** de duas partes: a editável (estilo, tom, ênfase) e um bloco
imutável concatenado por último, que a tela de edição nem exibe. Mesmo princípio
da proteção canadense: estrutural, não por confiança.

---

## Ordem sugerida

```
1. P0 #1        métrica inventada          ← 1 linha, risco alto, faça já
2. P0 #2-3      truncamento + prompt       ← conserta "Melhorar com IA"
3. P0 #4        race condition             ← conserta "não atualizava"
4. P0 #5-8      kanban (4 bugs)            ← conserta "não exclui/não salva"
5. P0 #9        CSS inválido               ← trivial
                                           ← nada mais está quebrado
6. P1 #12,13,14,18   ganhos rápidos (P)
7. P1 #10-11    observações + captura      ← as duas maiores dores de uso
8. P1 #15,16,17 anexos, chat, API pública  ← precisam de migration
9. P2           polish e acessibilidade
```

Os P0 somados são um dia de trabalho. Os P1 com migration (#15, #16) são os
únicos itens grandes.

---

## O que NÃO fazer

- **Não trocar `Icone.tsx` por CDN externo** — ver #21.
- **Não remover o estado "arquivada"** do kanban. Arquivar ≠ excluir; o bug é a
  falta de UI para esse estado, não o estado.
- **Não reescrever a página de Documentos** — a separação anexos × currículos já
  existe; falta um componente de preview compartilhado.
- **Não resolver a reordenação com drag-and-drop.** O bug é a race condition;
  trocar a interação não conserta, só esconde.
- **Não deixar a API pública sem credencial** — ver #17.
- **Não escrever `UPDATE ... SET a=, b=` em SQL bruto.** Use
  `repositoryX.update(id, partial)` do Drizzle. Foi assim que #7 nasceu.
