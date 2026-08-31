import {
  perfilRepo,
  experienciaRepo,
  formacaoRepo,
  cursoRepo,
  idiomaRepo,
  canadaProfileRepo,
} from "@/server/db/repositories";

/**
 * Monta o perfil em Markdown para colar numa IA de terceiro.
 *
 * Markdown e não JSON porque o destino é a janela de contexto de um modelo:
 * títulos e listas são mais legíveis para ele (e para você conferir o que está
 * mandando) do que chaves e colchetes.
 *
 * `redactContact` existe porque o link pode vazar. O histórico profissional já
 * é o que a IA precisa para analisar o perfil; telefone e e-mail só aparecem
 * se o token foi criado explicitamente com contato liberado.
 */
export async function perfilEmMarkdown(opts: {
  redactContact: boolean;
}): Promise<string> {
  const [perfil, experiencias, formacaoTudo, cursos, idiomas, canada] =
    await Promise.all([
      perfilRepo.get(),
      experienciaRepo.getAll(),
      formacaoRepo.getAll(),
      cursoRepo.getAll(),
      idiomaRepo.getAll(),
      canadaProfileRepo.get(),
    ]);

  const L: string[] = [];
  const secao = (titulo: string) => L.push("", `## ${titulo}`, "");

  L.push(`# ${perfil?.nomeCompleto ?? "Perfil profissional"}`);

  const contato: string[] = [];
  if (perfil?.localizacao) contato.push(perfil.localizacao);
  if (!opts.redactContact) {
    if (perfil?.email) contato.push(perfil.email);
    if (perfil?.telefone) contato.push(perfil.telefone);
  }
  if (perfil?.linkedin) contato.push(perfil.linkedin);
  if (perfil?.github) contato.push(perfil.github);
  if (contato.length) L.push("", contato.join(" · "));
  if (opts.redactContact) {
    L.push("", "> Dados de contato omitidos deste documento.");
  }

  if (perfil?.resumoBase) {
    secao("Resumo");
    L.push(perfil.resumoBase);
  }

  if (experiencias.length) {
    secao("Experiência profissional");
    for (const e of experiencias) {
      const periodo = [e.dataInicio, e.dataFim ?? "atual"].filter(Boolean).join(" — ");
      L.push(`### ${e.cargo} — ${e.empresa}`);
      if (periodo) L.push(`*${periodo}*`);
      if (e.descricaoAtividades) L.push("", e.descricaoAtividades);
      if (e.principaisConquistas) L.push("", `**Conquistas:** ${e.principaisConquistas}`);
      if (e.tagsTecnicas?.length) L.push("", `**Tecnologias:** ${e.tagsTecnicas.join(", ")}`);
      L.push("");
    }
  }

  const educacao = formacaoTudo.filter((f) => f.tipo === "educacao");
  if (educacao.length) {
    secao("Formação");
    for (const f of educacao) {
      L.push(`- **${f.tituloCurso ?? ""}** — ${f.instituicaoProjeto ?? ""}${f.status ? ` (${f.status})` : ""}`);
    }
  }

  const projetos = formacaoTudo.filter((f) => f.tipo === "projeto");
  if (projetos.length) {
    secao("Projetos");
    for (const p of projetos) {
      L.push(`### ${p.instituicaoProjeto ?? ""}`);
      if (p.descricaoDetalhada) L.push(p.descricaoDetalhada);
      if (p.link) L.push(`Link: ${p.link}`);
      L.push("");
    }
  }

  const atividades = formacaoTudo.filter((f) => f.tipo === "atividade");
  if (atividades.length) {
    secao("Atividades e liderança");
    for (const a of atividades) {
      const periodo = a.periodoInicio
        ? ` (${a.periodoInicio} — ${a.periodoFim ?? "atual"})`
        : "";
      L.push(`### ${a.papel ?? ""} — ${a.instituicaoProjeto ?? ""}${periodo}`);
      if (a.noCanada) L.push("*Realizada no Canadá.*");
      if (a.descricaoDetalhada) L.push("", a.descricaoDetalhada);
      L.push("");
    }
  }

  if (cursos.length) {
    secao("Certificações e cursos");
    for (const c of cursos) {
      L.push(`- **${c.tituloDoCurso}** — ${c.emissorInstituicao ?? ""}`);
    }
  }

  if (idiomas.length) {
    secao("Idiomas");
    for (const i of idiomas) {
      L.push(`- ${i.idioma}: ${i.nivelCefr ?? ""}${i.certificacaoExame ? ` (${i.certificacaoExame})` : ""}`);
    }
  }

  if (canada) {
    secao("Perfil canadense");
    L.push(`- Autorização de trabalho: ${canada.workAuthorization}`);
    if (canada.clbEnglish) L.push(`- CLB (inglês): ${canada.clbEnglish}`);
    if (canada.nclcFrench) L.push(`- NCLC (francês): ${canada.nclcFrench}`);
    L.push(`- ECA: ${canada.ecaStatus}`);
    if (canada.regulatedProfession)
      L.push(`- Profissão regulamentada: ${canada.regulatedProfession} (${canada.licenseStatus})`);
    L.push(`- Experiência canadense: ${canada.canadianExpMonths} meses`);
  }

  L.push("", "---", "", `*Gerado em ${new Date().toISOString().slice(0, 10)}.*`);
  return L.join("\n");
}
