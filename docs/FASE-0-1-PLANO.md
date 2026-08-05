# Fase 0 + 1 — Plano de Implementação

> **Documento histórico.** Registra o planejamento de uma fase já concluída.
> Os caminhos citados (`../app.js`, `../services/*`) são da versão Express/EJS,
> que hoje vive só na tag `v2-legacy`. Mantido porque explica POR QUE várias
> decisões do código atual são como são — não como documentação de uso.

> **Escopo:** Segurança e higiene do código. Nada muda de stack.
> **Branch:** `fase-0-1-seguranca-higiene` (a partir de `main`)

---

## Por que estas duas fases juntas

Fase 0 é segredo vazado. Fase 1 é código perigoso ou quebrado. Nenhuma das duas toca em Express, EJS ou MySQL — elas existem para que a migração da Fase 3 não carregue bug junto. E as duas cabem num dia.

O critério de "pronto" das duas é o mesmo: **o sistema continua funcionando exatamente como antes, mas sem as três superfícies de ataque e sem os quatro bugs.**

---

## O que a leitura do código mudou em relação ao plano macro

Cinco coisas que só apareceram lendo os arquivos. Duas aumentam o escopo:

1. **Ninguém chama `/converterhtmltopdf` nem `/converterhtmltodocx`.** Grep encontra a definição em [app.js:76-77](../app.js#L76-L77), os logs de boot, e o README. Zero código cliente, zero uso na extensão. **Remover é seguro, sem regressão.**

2. **`validateFilePath` está duplicado e usa a checagem errada.** [ConversaoController.js:14-20](../controllers/ConversaoController.js#L14-L20) e [documentConverter.js:201-207](../services/documentConverter.js#L201-L207) fazem `resolve(dir, f).startsWith(resolve(dir))`. Isso aceita um diretório irmão de prefixo comum (`generated-evil/x.pdf` passa a checagem de `generated/`). Não é explorável hoje porque `OUTPUT_DIR` é constante — mas é a função errada, escrita duas vezes.

3. **Trocar Multer para `memoryStorage` não é uma linha.** [JobFitController.js:269-273](../controllers/JobFitController.js#L269-L273) passa `file.path` para `extractTextFromPdf(filePath)` e `extractTextFromDocx(filePath)`, que assinam por caminho e fazem `fs.readFile` internamente. **As funções de extração precisam aceitar buffer antes.** Isso inverte a ordem das tarefas.

4. **Existe uma SEGUNDA superfície Puppeteer que eu não tinha contado.** O fallback de [`extractTextFromPdf`](../services/documentConverter.js#L231) lança Puppeteer com `--no-sandbox` e faz `page.goto(dataUrl)` num **PDF enviado pelo usuário**. Não basta remover `/converterhtmltopdf`.

5. **`textract` não está no `package.json`** mas é o fallback de DOCX em [documentConverter.js:277](../services/documentConverter.js#L277). Ele *sempre* lança `Cannot find module`. Código morto que finge ser resiliência.

---

## Fase 0 — Segurança

Três das cinco tarefas são suas. A ordem importa: **rotacionar antes de purgar.** Purgar o histórico não desfaz um vazamento que já é público — só impede novos clones de o verem.

### 0.1 — Você: rotacionar a `GEMINI_API_KEY`

A chave do Gemini que estava versionada foi para um repositório público.
Considere-a comprometida. (Valor redigido deste documento.)

1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Delete a chave antiga. Crie uma nova.
3. Não cole a nova chave neste chat.

**Verificação:** uma chamada com a chave antiga retorna `403 API_KEY_INVALID`.

### 0.2 — Você: rotacionar a senha do MySQL

A senha do MySQL que estava versionada também foi para o histórico público.
(Valor redigido deste documento — um plano que cita a credencial em claro vira
ele próprio o vazamento que descreve.)

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'nova-senha-forte';
```

### 0.3 — Eu: criar `.env` e reescrever `.env.example`

`.env` já está no `.gitignore` (verificado). Escrevo com placeholders; você preenche.

```bash
# .env
PORT=3000
NODE_ENV=development

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=COLE_SUA_NOVA_SENHA_AQUI
DB_NAME=infos_curriculo

GEMINI_API_KEY=COLE_SUA_NOVA_CHAVE_AQUI
GEMINI_MODEL=gemini-2.0-flash

# CORS: origin da extensão Chrome, não '*'
CORS_ORIGIN=chrome-extension://SEU_EXTENSION_ID
```

`.env.example` recebe os mesmos campos com valores obviamente falsos (`your-key-here`), e um comentário no topo dizendo que **nunca** deve conter valor real.

> Sobre `CORS_ORIGIN`: o ID da extensão aparece em `chrome://extensions` com modo desenvolvedor ligado. Se não quiser mexer nisso agora, deixe `http://localhost:3000` — o importante é sair do `*`.

### 0.4 — Você: purgar `.env.example` do histórico

Force-push é irreversível e é operação sua. Preparo o comando; você executa.

```bash
# Backup primeiro. Sério.
git clone --mirror . ../BryanAI-backup.git

pip install git-filter-repo
git filter-repo --path .env.example --invert-paths --force

git remote add origin https://github.com/AndradeTK/BryanAI.git
git push origin --force --all
git push origin --force --tags
```

**Verificação:** `git log --all --oneline -- .env.example` não retorna nada.

> `git filter-repo` remove o remote por segurança — daí o `git remote add` antes do push. Se o repo tiver forks ou clones, eles ainda têm a chave; por isso 0.1 vem primeiro.

### 0.5 — Eu: `gitleaks` (adiado para a Fase 6)

O CI não existe ainda. Anotado, não esquecido.

---

## Fase 1 — Higiene

**A ordem é dependência real, não preferência.** 1.1 precisa vir antes de 1.2.

### 1.1 — Extração de texto passa a aceitar buffer

*Arquivo:* [services/documentConverter.js](../services/documentConverter.js)

Hoje as duas funções assinam por caminho e leem o disco por dentro:

```js
async function extractTextFromPdf(filePath) {
    const dataBuffer = await fs.readFile(filePath);   // ← o disco vive aqui
    const data = await pdfParse(dataBuffer);
```

Passam a receber o buffer diretamente. Quem tem o arquivo é o chamador.

```js
async function extractTextFromPdf(buffer) {
    const data = await pdfParse(buffer);
    return data.text || '';
}

async function extractTextFromDocx(buffer) {
    const result = await mammoth.extractRawText({ buffer });   // mammoth aceita { buffer }
    return result.value || '';
}
```

Ao mesmo tempo, **os dois fallbacks morrem**:

- O fallback do PDF (linhas ~231-258) lança Puppeteer com `--no-sandbox` num PDF do usuário. É a superfície de ataque nº 2. Some.
- O fallback do DOCX (linhas ~275-288) chama `textract`, que não está instalado. Sempre lançou `Cannot find module`. Some.

Se `pdf-parse` ou `mammoth` falharem, a função lança um erro claro. É o comportamento correto: um PDF que o `pdf-parse` não lê é um PDF corrompido, não um convite para abrir um browser.

### 1.2 — Multer para `memoryStorage`

*Arquivo:* [routes/api.js:23-31](../routes/api.js#L23-L31)

```js
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: /* inalterado */
});
```

*Arquivo:* [controllers/JobFitController.js](../controllers/JobFitController.js) — `apiAnalyzeUpload`

O arquivo agora é `file.buffer`. Isso apaga os **três** `fs.unlink` (linhas 258, 276, 288) e o `catch` vazio de cada um — não existe mais arquivo para deletar. O `require('fs').promises` no topo do controller provavelmente fica órfão; conferir.

```js
const textoExtraido = file.mimetype === 'application/pdf'
    ? await documentConverter.extractTextFromPdf(file.buffer)
    : await documentConverter.extractTextFromDocx(file.buffer);
```

O currículo enviado deixa de tocar o disco. O bug de exposição não é corrigido — ele deixa de existir.

### 1.3 — Remover os endpoints de conversão

*Arquivo:* [app.js](../app.js)

Deletar as linhas 76-77 (as rotas) e 156-157 (os logs de boot que as anunciam). Em [ConversaoController.js](../controllers/ConversaoController.js), deletar `htmlToPdf` e `htmlToDocx`. `listFiles`, `downloadFile`, `viewFile` e `deleteFile` ficam — são usados por `/api/arquivos/*`.

O README ([linhas 217-218](../README.md#L217-L218)) documenta os endpoints. Atualizar.

`documentConverter.htmlToPdf` e `.htmlToDocx` **continuam existindo** — `JobFitController.apiGenerate` os chama com HTML gerado pelo próprio servidor a partir de um template EJS. Esse caminho é seguro e é o único que precisa existir.

### 1.4 — Parar de servir `/generated` estaticamente

*Arquivo:* [app.js:43](../app.js#L43)

Deletar a linha. O download já passa por `ConversaoController.downloadFile`, que valida o path (e vai validar direito depois de 1.5).

Antes de deletar, uma checagem: `views/dashboard/index.ejs` abre PDFs num `<iframe>` apontando para `/api/arquivos/:filename/view`, não para `/generated/...`. Confirmar com grep que nada no front usa `/generated` como URL.

### 1.5 — Consertar `validateFilePath`, uma vez só

O `startsWith` aceita `generated-evil/` como se fosse `generated/`. A correção é `path.relative`:

```js
// services/documentConverter.js — fonte única
function resolveInsideOutputDir(filename) {
    const base = path.resolve(OUTPUT_DIR);
    const target = path.resolve(base, filename);
    const rel = path.relative(base, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error('Nome de arquivo inválido');
    }
    return target;
}
```

Exportar. `ConversaoController` deleta sua cópia e importa esta. `deleteGeneratedFile` também passa a usá-la em vez da cópia dele.

Três chamadores, uma função.

### 1.6 — `withRetry`: o default mente

*Arquivo:* [config/ai.js:18-42](../config/ai.js#L18-L42)

O JSDoc diz `padrão: 3`. O código diz `maxRetries = 1`. E só 429 é tratado — timeout e 5xx passam direto e viram erro do usuário.

```js
function isRetryable(error) {
    const status = error?.status ?? error?.response?.status;
    if (status === 429 || status === 500 || status === 503) return true;
    const msg = String(error?.message ?? '');
    return /429|Resource exhausted|ETIMEDOUT|ECONNRESET|fetch failed/i.test(msg);
}

async function withRetry(fn, maxRetries = 3, baseDelay = 2000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (!isRetryable(error) || attempt === maxRetries) throw error;
            const wait = baseDelay * 2 ** attempt + Math.random() * 1000;
            console.warn(`[AI] Retry ${attempt + 1}/${maxRetries} em ${Math.round(wait)}ms — ${error.message}`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
}
```

> **Atenção ao efeito colateral.** `apiGenerate` faz duas chamadas ao Gemini com `delay(2000)` entre elas. Com 3 retries e backoff exponencial, o pior caso vira ~30s de espera antes de falhar. O front (`views/jobfit/index.ejs`) precisa de um `AbortController` ou timeout — ou o usuário vai achar que travou. **Isso é escopo, não sugestão:** verificar o timeout do fetch no front e ajustar.

### 1.7 — `status='processando'` fora do ENUM

*Arquivos:* [infos_curriculo.sql:65](../infos_curriculo.sql#L65), [models/HistoricoGeracao.js:56](../models/HistoricoGeracao.js#L56)

O ENUM é `('concluido','falha')`. O código insere `'processando'`. Em `sql_mode=STRICT_TRANS_TABLES` (o default do MySQL 8) isso é um erro; em modo permissivo vira string vazia silenciosamente.

Migration mínima, porque `historico_geracoes` morre na Fase 4 e não vale investir nela:

```sql
ALTER TABLE historico_geracoes
  MODIFY status ENUM('processando','concluido','falha') DEFAULT 'processando';
```

Como você roda MySQL local, o arquivo `infos_curriculo.sql` é o schema de referência — atualizar lá também.

### 1.8 — `views/jobfit/result.ejs` não existe

[JobFitController.result](../controllers/JobFitController.js#L48) faz `res.render('jobfit/result', ...)` para uma view que não está no disco. `GET /jobfit/:id` lança.

O `result` mostra um registro de `historico_geracoes` — tabela que desaparece na Fase 4. Criar a view é trabalho jogado fora. **Remover a rota `GET /jobfit/:id` de [routes/web.js:78](../routes/web.js#L78) e o método `result`.** Se nada linka para ela (verificar), ninguém sente falta.

Se algo linkar, aí sim criar uma view mínima.

---

## Ordem de execução

```
0.1 rotacionar Gemini      [você]
0.2 rotacionar MySQL       [você]
0.3 .env + .env.example    [eu]
                                     ← app volta a subir, com chave nova
1.1 extração por buffer    [eu]  ← mata Puppeteer #2 e textract
1.2 memoryStorage          [eu]  ← depende de 1.1
1.3 remover /converterhtml [eu]  ← mata Puppeteer #1
1.4 remover static         [eu]
1.5 validateFilePath       [eu]
1.6 withRetry + timeout    [eu]
1.7 ENUM                   [eu]
1.8 rota morta             [eu]
                                     ← smoke test completo
0.4 purgar histórico       [você]  ← por último: reescreve tudo
```

`0.4` fica no fim de propósito. Um `filter-repo` no meio de trabalho não-commitado é como trocar o pneu com o carro andando.

---

## Verificação

Roda tudo depois de 1.8, antes de 0.4.

**Os endpoints sumiram:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/converterhtmltopdf \
  -H 'Content-Type: application/json' -d '{"html":"<h1>x</h1>"}'
# esperado: 404
```

**O static sumiu:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/generated/
# esperado: 404
```

**Upload não toca o disco.** Enviar um PDF em `/api/jobfit/upload` e, durante a request, verificar que `generated/uploads/` continua vazio. Depois, que a resposta traz a análise.

**Path traversal.** `GET /api/arquivos/..%2F..%2Fpackage.json` → 500 com "Nome de arquivo inválido", nunca o conteúdo do arquivo.

**O caminho bom do PDF não quebrou.** Este é o teste que importa: gerar um currículo pela UI (`/jobfit`, colar uma vaga, clicar em gerar PDF), baixar, abrir. Se o PDF sai correto, `documentConverter.htmlToPdf` sobreviveu à remoção do endpoint público.

**Retry.** Setar `GEMINI_API_KEY` para um valor inválido, chamar `/api/jobfit/analyze`, e confirmar no console: 3 tentativas com backoff crescente, depois erro. E que o front mostra o erro em vez de girar para sempre.

**ENUM.** `SET SESSION sql_mode='STRICT_TRANS_TABLES';` e então chamar `/api/jobfit/analyze`. Não deve haver warning nem erro no insert.

---

## Riscos

**`mammoth.extractRawText({ buffer })`** — a API aceita `{ path }` ou `{ buffer }`. Confirmar contra a versão instalada (`^1.11.0`) antes de assumir. Se a assinatura for outra, 1.1 muda.

**O timeout do front (1.6)** é o item mais fácil de esquecer e o mais visível para você. Um retry de 30s sem feedback na UI é indistinguível de um sistema travado.

**`0.4` é irreversível.** O `git clone --mirror` de backup não é opcional.

**Nada aqui tem teste automatizado**, porque não existe suíte. A verificação é manual e o smoke test do PDF é o que realmente prova que não quebrou. Testes chegam na Fase 3, com Vitest.

---

## Definição de pronto

- [ ] Chave Gemini e senha MySQL rotacionadas
- [ ] `.env` preenchido, `.env.example` só com placeholders
- [ ] `.env.example` fora do histórico do git
- [ ] `CORS_ORIGIN` não é mais `*`
- [ ] Zero superfícies Puppeteer aceitando input do usuário (as duas, não uma)
- [ ] Uploads nunca tocam o disco
- [ ] `validateFilePath` existe uma vez, usa `path.relative`
- [ ] `withRetry` tenta 3 vezes, trata 429/5xx/timeout, e o front tem timeout
- [ ] `status='processando'` insere sem warning em strict mode
- [ ] Nenhuma rota renderiza view inexistente
- [ ] **Gerar um currículo em PDF pela UI ainda funciona**
