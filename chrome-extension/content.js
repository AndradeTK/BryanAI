/**
 * BryanAI Chrome Extension — Content Script (Fase 5)
 *
 * Estratégia de captura em cascata:
 *   1. JSON-LD schema.org/JobPosting (robusto; quase todo ATS canadense emite)
 *   2. Seletores CSS por site (fallback para os que não têm JSON-LD)
 *   3. window.getSelection() (o usuário seleciona o texto na mão)
 *
 * O envio ao backend manda o HTML inteiro — o parser JSON-LD roda no servidor
 * (src/server/jobs/ingest-parse.ts), então a lógica de parsing fica num lugar só.
 */

// Produção. Quem instala a extensão sem configurar nada já aponta para o
// servidor certo; localhost só serve para desenvolvimento e é ajustado na aba
// Config.
const DEFAULT_SERVER = "https://app.bryanandrade.dev";

/**
 * Paleta do painel injetado — os mesmos tokens do app (globals.css).
 * Repetidos aqui porque o content script roda no contexto do site da vaga e
 * não tem acesso ao CSS da aplicação.
 */
const UI = {
  superficie: "#ffffff",
  superficie2: "#f8f9fc",
  conteudo: "#121317",
  conteudoSuave: "#45474d",
  conteudoSutil: "#6a6a71",
  linha: "rgba(33,34,38,.12)",
  linhaSuave: "rgba(33,34,38,.06)",
  acento: "#212226",
  sobreAcento: "#ffffff",
  ok: "#16a34a",
  atencao: "#b45309",
  erro: "#dc2626",
  fonte:
    "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
};



/**
 * Cabeçalhos das chamadas ao backend.
 *
 * O servidor exige autenticação em todas as rotas desde que passou a responder
 * num domínio público. A extensão não tem cookie de sessão (roda no contexto do
 * site da vaga), então usa o token de EXTENSION_API_TOKEN, colado na aba
 * Configurações do popup.
 */
async function authHeaders() {
  const { apiToken } = await chrome.storage.local.get(["apiToken"]);
  const headers = { "Content-Type": "application/json" };
  if (apiToken) headers["Authorization"] = `Bearer ${apiToken}`;
  return headers;
}

// Seletores CSS por site — só para o fallback quando não há JSON-LD.
// Alvos canadenses (BR removidos na Fase 5).
const SITE_SELECTORS = {
  "linkedin.com": {
    titulo: [".job-details-jobs-unified-top-card__job-title h1", "h1.t-24"],
    descricao: ["#job-details", ".jobs-description__content"],
  },
  "indeed.ca": {
    titulo: [".jobsearch-JobInfoHeader-title", 'h1[data-testid="jobsearch-JobInfoHeader-title"]'],
    descricao: ["#jobDescriptionText"],
  },
  "indeed.com": {
    titulo: [".jobsearch-JobInfoHeader-title"],
    descricao: ["#jobDescriptionText"],
  },
  "jobbank.gc.ca": {
    titulo: ["h1.title", "span[property='title']"],
    descricao: [".job-posting-detail-requirements", "#job-notice", "main"],
  },
  "greenhouse.io": {
    titulo: ["h1.app-title", "h1"],
    descricao: ["#content", ".job__description"],
  },
  "lever.co": {
    titulo: [".posting-headline h2", "h2"],
    descricao: [".posting-page .section-wrapper", ".content"],
  },
  "ashbyhq.com": {
    titulo: ["h1"],
    descricao: ['[class*="_description"]', "main"],
  },
  "myworkdayjobs.com": {
    titulo: ['h1[data-automation-id="jobPostingHeader"]', "h1"],
    descricao: ['[data-automation-id="jobPostingDescription"]'],
  },
  "glassdoor.ca": {
    titulo: ['[data-test="jobTitle"]'],
    descricao: ['[data-test="description"]', ".jobDescriptionContent"],
  },
};

function detectSite() {
  const h = window.location.hostname;
  return Object.keys(SITE_SELECTORS).find((s) => h.includes(s)) ?? null;
}

function findText(selectors) {
  for (const sel of selectors ?? []) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) return el.innerText.trim();
    } catch (_) {
      /* seletor inválido — ignora */
    }
  }
  return "";
}

/**
 * Marcadores de onde a descrição da vaga acaba e começa o resto da página.
 * O innerText de um container do LinkedIn/Indeed costuma emendar a descrição
 * com vagas parecidas, rodapé institucional e blocos de recomendação.
 */
const FIM_DA_VAGA = [
  /vagas? (similares|parecidas|recomendadas)/i,
  /similar jobs/i,
  /more jobs (at|from)/i,
  /people also viewed/i,
  /pessoas também viram/i,
  /set alert for similar/i,
  /report this job/i,
  /denunciar (esta )?vaga/i,
];

/**
 * Limpa o texto raspado do DOM.
 *
 * O caminho JSON-LD já normalizava (tira HTML, colapsa espaço); o caminho por
 * seletor CSS devolvia innerText cru. Como esse texto vai direto para o prompt,
 * a mesma vaga capturada pela extensão e colada à mão no site produzia
 * currículos diferentes — não por prompts diferentes, mas por insumos
 * diferentes.
 */
function limparDescricao(texto) {
  if (!texto) return "";

  let t = texto.replace(/\r/g, "");

  // Corta a partir do primeiro marcador de fim de conteúdo relevante.
  // O marcador também pode aparecer num menu no topo da página, então só
  // corta se o que sobra ainda for a maior parte do texto — cortar nos
  // primeiros 30% quase certamente descartaria a vaga em vez do rodapé.
  for (const marcador of FIM_DA_VAGA) {
    const m = t.match(marcador);
    if (m && m.index > t.length * 0.3) t = t.slice(0, m.index);
  }

  return t
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    // "Ver mais"/"Show more" são botões que o innerText captura como texto.
    .filter((l) => !/^(ver mais|mostrar mais|show more|see more|voir plus)$/i.test(l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extrai título/descrição via JSON-LD JobPosting (se houver). */
function fromJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent);
      const nodes = Array.isArray(data)
        ? data
        : data["@graph"]
          ? data["@graph"]
          : [data];
      const job = nodes.find((n) => {
        const t = n && n["@type"];
        return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
      });
      if (job) {
        const org = job.hiringOrganization;
        return {
          titulo: job.title || "",
          empresa: typeof org === "string" ? org : org?.name || "",
          descricao: (job.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        };
      }
    } catch (_) {
      /* bloco malformado — ignora */
    }
  }
  return null;
}

/** Captura da página: JSON-LD → CSS → seleção. */
function captureJobData() {
  const jsonld = fromJsonLd();
  if (jsonld && jsonld.titulo && jsonld.descricao) {
    return { success: true, source: "jsonld", ...jsonld };
  }

  const site = detectSite();
  const sel = site ? SITE_SELECTORS[site] : null;
  const titulo = findText(sel?.titulo) || document.title;
  let descricao = limparDescricao(findText(sel?.descricao));
  let source = site ? "css" : "selection";
  if (!descricao) {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 100) {
      descricao = limparDescricao(selection);
      source = "selection";
    }
  }

  return {
    success: !!(titulo && descricao),
    source,
    titulo,
    empresa: (jsonld && jsonld.empresa) || "",
    descricao,
  };
}

/** Salva a vaga direto no tracker do backend (envia o HTML para parsear no server). */
async function saveJobToTracker() {
  const { serverUrl } = await chrome.storage.local.get(["serverUrl"]);
  const base = serverUrl || DEFAULT_SERVER;
  const captured = captureJobData();

  const res = await fetch(`${base}/api/jobs/capture`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      url: window.location.href,
      html: document.documentElement.outerHTML,
      // fallback caso o server não ache JSON-LD:
      titulo: captured.titulo,
      descricao: captured.descricao,
      empresa: captured.empresa,
    }),
  });
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lê o texto de um seletor (o primeiro que casar). */
function readSelector(selectors) {
  for (const sel of selectors ?? []) {
    try {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 40) return el.innerText.trim();
    } catch (_) {}
  }
  return "";
}

/** Detecta se a página atual é a de UMA vaga aberta (não a lista de busca). */
function isJobDetailPage() {
  const site = detectSite();
  if (!site) return false;
  const sel = SITE_SELECTORS[site];
  // Tem título E descrição visíveis = página de detalhe.
  return !!(findText(sel?.titulo) && readSelector(sel?.descricao));
}

// ---------- Detector de vaga fantasma (heurística, sem chamada extra) ----------
/** Analisa o texto/DOM em busca de sinais de vaga fantasma. Retorna motivo ou null. */
function ghostReason(scope) {
  const root = scope || document.body;
  const txt = (root.innerText || "").toLowerCase();
  // Repostagem explícita.
  if (/\breposted\b|republicad|reposted \d+/.test(txt)) return "republicada";
  // "há X meses" / "X months ago" muito antigo (>30 dias).
  const m = txt.match(/(\d+)\s*(month|mês|meses|months)\s*ago|há\s*(\d+)\s*(mes|mês|meses)/);
  if (m) {
    const meses = Number(m[1] || m[3] || 0);
    if (meses >= 1) return `publicada há ${meses}+ mês(es)`;
  }
  const d = txt.match(/(\d+)\s*(day|dia)s?\s*ago|há\s*(\d+)\s*dias?/);
  if (d) {
    const dias = Number(d[1] || d[3] || 0);
    if (dias > 30) return `publicada há ${dias} dias`;
  }
  return null;
}

// ---------- Painel de ações flutuante ----------
let panelInjected = false;

function btnStyle(primario) {
  const base =
    `display:flex;align-items:center;justify-content:center;width:100%;margin:6px 0;` +
    `padding:9px 12px;border-radius:9999px;font:500 12px ${UI.fonte};cursor:pointer;` +
    `letter-spacing:-.01em;transition:background .12s,border-color .12s;`;
  return primario
    ? base + `border:0;background:${UI.acento};color:${UI.sobreAcento};`
    : base + `border:1px solid ${UI.linha};background:${UI.superficie};color:${UI.conteudo};`;
}

async function injectActionPanel() {
  if (panelInjected) {
    document.getElementById("bryanai-panel")?.remove();
  }
  panelInjected = true;

  const captured = captureJobData();
  const panel = document.createElement("div");
  panel.id = "bryanai-panel";
  panel.style.cssText =
    `position:fixed;top:80px;right:16px;z-index:2147483647;width:252px;` +
    `background:${UI.superficie};color:${UI.conteudo};padding:16px;border-radius:20px;` +
    `border:1px solid ${UI.linha};font:13px ${UI.fonte};letter-spacing:-.01em;` +
    `box-shadow:0 4px 16px rgba(18,19,23,.08);max-height:80vh;overflow:auto`;

  const ghost = ghostReason(document.body);
  panel.innerHTML =
    `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">` +
    `<strong style="font-weight:500;letter-spacing:-.02em">BryanAI</strong>` +
    `<span id="bryanai-close" style="cursor:pointer;opacity:.45;font-size:15px;line-height:1">✕</span></div>` +
    `<div id="bryanai-score" style="font-size:12px;color:${UI.conteudoSutil};margin-bottom:10px">Score: —</div>` +
    (ghost
      ? `<div style="background:#fff7ed;color:${UI.atencao};border:1px solid rgba(180,83,9,.16);padding:7px 10px;border-radius:10px;font-size:11px;margin-bottom:10px">Possível vaga fantasma — ${ghost}</div>`
      : "");

  const actions = [
    { id: "act-score", label: "Analisar compatibilidade", primario: true },
    { id: "act-save", label: "Salvar no kanban" },
    { id: "act-cv", label: "Gerar CV" },
    { id: "act-cover", label: "Cover letter" },
    { id: "act-prepare", label: "Preparar aplicação" },
  ];
  for (const a of actions) {
    const b = document.createElement("button");
    b.id = a.id;
    b.textContent = a.label;
    b.style.cssText = btnStyle(a.primario);
    panel.appendChild(b);
  }
  const status = document.createElement("div");
  status.id = "bryanai-panel-status";
  status.style.cssText = `font-size:11px;color:${UI.conteudoSutil};margin-top:10px;white-space:pre-wrap;line-height:1.5`;
  panel.appendChild(status);

  document.body.appendChild(panel);
  document.getElementById("bryanai-close").onclick = () => panel.remove();

  const setStatus = (t) => (status.textContent = t);
  const base = await serverBase();

  document.getElementById("act-score").onclick = async () => {
    setStatus("Analisando…");
    try {
      const res = await fetch(`${base}/api/jobfit/analyze`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ titulo: captured.titulo, descricao: captured.descricao }),
      });
      const data = await res.json();
      if (data.success) {
        const a = data.data.analise;
        const cor = a.score >= 80 ? UI.ok : a.score >= 60 ? UI.atencao : UI.erro;
        document.getElementById("bryanai-score").innerHTML =
          `Score: <b style="color:${cor}">${a.score}/100</b> · ${a.nivel_compatibilidade}` +
          (a.canadian?.work_auth_verdict === "needs_sponsorship_blocker"
            ? `<br><span style="color:${UI.erro}">Exige autorização de trabalho</span>`
            : "");
        setStatus("");
      } else setStatus("Erro: " + data.error);
    } catch (e) {
      setStatus("Servidor offline.");
    }
  };

  document.getElementById("act-save").onclick = async () => {
    setStatus("Salvando…");
    try {
      const r = await saveJobToTracker();
      setStatus(r.success ? "Salva no kanban ✓" : "Erro: " + r.error);
    } catch (e) {
      setStatus("Erro ao salvar.");
    }
  };

  document.getElementById("act-cv").onclick = async () => {
    setStatus("Gerando CV… (pode levar ~1min)");
    try {
      const res = await fetch(`${base}/api/jobfit/generate`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ titulo: captured.titulo, descricao: captured.descricao }),
      });
      const data = await res.json();
      if (data.success && data.data.arquivo?.nome) {
        window.open(`${base}/api/arquivos/${data.data.arquivo.nome}?download=true`, "_blank");
        setStatus("CV gerado ✓ (score " + data.data.score + ")");
      } else setStatus("Erro: " + (data.error || "falha ao gerar"));
    } catch (e) {
      setStatus("Erro ao gerar CV.");
    }
  };

  document.getElementById("act-cover").onclick = async () => {
    setStatus("Gerando cover letter…");
    try {
      const res = await fetch(`${base}/api/cover-letter`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          titulo: captured.titulo,
          descricao: captured.descricao,
          empresa: captured.empresa,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const texto = data.data.coverLetter || data.data.texto || JSON.stringify(data.data);
        await navigator.clipboard.writeText(texto).catch(() => {});
        setStatus("Cover letter copiada para a área de transferência ✓");
      } else setStatus("Erro: " + data.error);
    } catch (e) {
      setStatus("Erro.");
    }
  };

  document.getElementById("act-prepare").onclick = () =>
    prepareApplication(base, captured, setStatus);
}

// ---------- Copiloto: preenche o formulário Easy Apply (NUNCA envia) ----------
/** Encontra os inputs/labels do modal de aplicação aberto. */
function readApplyFields() {
  // Modal do LinkedIn Easy Apply; fallback: qualquer form visível na página.
  const modal =
    document.querySelector(".jobs-easy-apply-modal, [data-test-modal], form") ||
    document.body;
  const fields = [];
  modal.querySelectorAll("input, textarea, select").forEach((el) => {
    if (el.type === "hidden" || el.type === "submit" || el.type === "button") return;
    if (el.offsetParent === null) return; // invisível
    // label: <label for>, aria-label, ou texto do container
    let label = "";
    if (el.id) {
      const l = modal.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) label = l.innerText.trim();
    }
    label =
      label ||
      el.getAttribute("aria-label") ||
      el.closest("label")?.innerText.trim() ||
      el.getAttribute("placeholder") ||
      el.name ||
      "";
    label = label.replace(/\s+/g, " ").trim();
    if (label) fields.push({ el, label });
  });
  return fields;
}

async function prepareApplication(base, captured, setStatus) {
  setStatus("Preparando aplicação…");

  // Abre o modal Easy Apply se houver botão (o clique é ação sua, iniciada por você).
  const easyBtn = [...document.querySelectorAll("button")].find((b) =>
    /easy apply|candidatura simplificada|candidatar-se/i.test(b.innerText),
  );
  if (easyBtn) {
    easyBtn.click();
    await sleep(1200);
  }

  const fields = readApplyFields();
  const labels = fields.map((f) => f.label);

  let data;
  try {
    const res = await fetch(`${base}/api/apply/prepare`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        titulo: captured.titulo,
        descricao: captured.descricao,
        empresa: captured.empresa,
        url: window.location.href,
        campos: labels,
      }),
    });
    data = (await res.json()).data;
  } catch (e) {
    setStatus("Erro ao preparar (servidor offline).");
    return;
  }
  if (!data) {
    setStatus("Erro ao preparar aplicação.");
    return;
  }

  const respostas = data.respostas || [];
  let preenchidos = 0;
  let pendentes = 0;

  // Casa cada resposta com o input pelo label e preenche.
  for (const r of respostas) {
    const field = fields.find((f) => f.label === r.label);
    if (!field) continue;
    if (r.source === "needs_input") {
      field.el.style.outline = `2px solid ${UI.atencao}`; // falta você preencher
      field.el.dataset.bryanaiKey = r.key;
      field.el.dataset.bryanaiLabel = r.label;
      pendentes++;
    } else if (r.value) {
      try {
        field.el.value = r.value;
        field.el.dispatchEvent(new Event("input", { bubbles: true }));
        field.el.dispatchEvent(new Event("change", { bubbles: true }));
        field.el.style.outline = `2px solid ${UI.ok}`; // preenchido
        preenchidos++;
      } catch (e) {}
    }
  }

  // Botão "salvar respostas" para os campos amarelos → aprendizado.
  document.getElementById("bryanai-learn")?.remove();
  if (pendentes > 0) {
    const learn = document.createElement("button");
    learn.id = "bryanai-learn";
    learn.textContent = `Salvar minhas respostas (${pendentes})`;
    learn.style.cssText = btnStyle(false);
    learn.onclick = async () => {
      let salvos = 0;
      for (const field of fields) {
        const key = field.el.dataset.bryanaiKey;
        if (!key || !field.el.value.trim()) continue;
        try {
          await fetch(`${base}/api/answers`, {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({
              key,
              label: field.el.dataset.bryanaiLabel,
              answer: field.el.value.trim(),
            }),
          });
          field.el.style.outline = `2px solid ${UI.ok}`;
          salvos++;
        } catch (e) {}
      }
      setStatus(`${salvos} resposta(s) aprendida(s) ✓`);
    };
    document.getElementById("bryanai-panel").appendChild(learn);
  }

  const score = data.score != null ? ` · score ${data.score}` : "";
  setStatus(
    `Preparado${score}.\n${preenchidos} campo(s) preenchido(s), ` +
      `${pendentes} para você completar (amarelos).\n` +
      `⚠️ Revise e clique ENVIAR você mesmo — o BryanAI nunca envia.`,
  );

  // Reference letter pedida: mostra links das cartas salvas (o navegador não
  // deixa o Copiloto subir o arquivo; o anexo final é seu).
  document.getElementById("bryanai-refs")?.remove();
  if (data.pedeReferenceLetter) {
    const box = document.createElement("div");
    box.id = "bryanai-refs";
    box.style.cssText =
      `margin-top:10px;padding:10px;border-radius:12px;background:${UI.superficie2};border:1px solid ${UI.linhaSuave};font-size:11px;color:${UI.conteudoSuave};line-height:1.5`;
    const docs = data.documentosSugeridos || [];
    if (docs.length) {
      const base2 = base;
      box.innerHTML =
        `<b style="color:${UI.atencao};font-weight:500">Esta vaga pede reference letter.</b><br>` +
        `Suas cartas salvas (baixe e anexe você):<br>` +
        docs
          .map(
            (d) =>
              `<a href="${base2}${d.url}" target="_blank" style="color:#1a73e8;text-decoration:underline">${d.titulo}</a>`,
          )
          .join("<br>");
    } else {
      box.innerHTML =
        `<b style="color:${UI.atencao};font-weight:500">Esta vaga pede reference letter</b>, ` +
        `mas você não tem nenhuma salva. Adicione em Documentos → Meus anexos.`;
    }
    document.getElementById("bryanai-panel").appendChild(box);
  }
}

/** Inicializa o overlay: painel de ações na página de UMA vaga aberta. */
function initOverlay() {
  chrome.storage.local.get(["overlayOn"], ({ overlayOn }) => {
    if (overlayOn === false) return; // desligável pelo popup
    // Página de vaga aberta: injeta o painel (após o SPA montar).
    setTimeout(() => {
      if (isJobDetailPage()) injectActionPanel();
    }, 1500);
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "toggleOverlay") {
    document.getElementById("bryanai-panel")
      ? document.getElementById("bryanai-panel").remove()
      : injectActionPanel();
    sendResponse({ success: true });
    return;
  }
  if (msg.action === "captureJobData") {
    sendResponse(captureJobData());
  } else if (msg.action === "saveJobToTracker") {
    saveJobToTracker()
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true; // resposta assíncrona
  }
});

console.log("[BryanAI] content script carregado:", detectSite() || "site genérico");

// Overlay (Fase 10): painel na vaga + selos na lista + detector de fantasma.
// Só ativa em sites conhecidos e pode ser desligado pelo popup (overlayOn).
if (detectSite()) initOverlay();
