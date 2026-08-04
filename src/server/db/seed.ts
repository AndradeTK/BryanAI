import { db, schema } from "./client";

/**
 * Seed com os dados reais do usuário (Bryan), convertidos do dump MySQL
 * (minhas_infos_curriculo.sql) para o schema Postgres corrigido:
 *   - datas em PT ("Janeiro/2025") -> DATE ISO; "Atual" -> null
 *   - tags CSV -> array
 *   - destaque "Sim" -> true
 *   - tipo "Educação"/"Projeto..." -> enum educacao/projeto
 *
 * Rodar: npx tsx --env-file=.env src/server/db/seed.ts
 */

// "Janeiro/2025" -> "2025-01-01"; "Atual" -> null
const MESES: Record<string, string> = {
  janeiro: "01", fevereiro: "02", março: "03", abril: "04",
  maio: "05", junho: "06", julho: "07", agosto: "08",
  setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};
function ptDate(s: string | null): string | null {
  if (!s || /atual/i.test(s)) return null;
  const [mes, ano] = s.toLowerCase().split("/");
  const mm = MESES[mes.trim()];
  if (!mm || !ano) return null;
  return `${ano.trim()}-${mm}-01`;
}

async function seed() {
  console.log("Limpando tabelas...");
  await db.delete(schema.historicoGeracoes);
  await db.delete(schema.idiomas);
  await db.delete(schema.educacaoECursos);
  await db.delete(schema.formacaoEProjetos);
  await db.delete(schema.experiencias);
  await db.delete(schema.perfil);

  console.log("Inserindo perfil...");
  await db.insert(schema.perfil).values({
    nomeCompleto: "Bryan Rodrigues de Andrade",
    email: "bryanrodriguesdeandrade@gmail.com",
    telefone: "+55 11 91479-6414",
    localizacao: "Salto, São Paulo, Brasil",
    linkedin: "https://www.linkedin.com/in/andradetk/",
    github: "https://github.com/AndradeTK",
    resumoBase:
      "Profissional com sólida formação técnica em Informática e Administração pelo IFSP. Possuo experiência prática em rotinas administrativas complexas no Tribunal de Justiça (TJSP), onde desenvolvi sistemas de automação em Excel para otimização de fluxos. Atuo também como Desenvolvedor Full Stack freelancer, com foco em Node.js, n8n e integração de APIs financeiras e de automação. Inglês nível avançado (B2) e certificado em Suporte de TI pelo Google. Atualmente focado em criar soluções tecnológicas que otimizam processos de negócio.",
    dataNascimento: "2007-08-29",
  });

  console.log("Inserindo experiências...");
  await db.insert(schema.experiencias).values([
    {
      empresa: "Tribunal de Justiça do Estado de São Paulo - Comarca de Salto",
      cargo: "Estagiário Administrativo",
      dataInicio: ptDate("Janeiro/2025"),
      dataFim: ptDate("Dezembro/2025"),
      descricaoAtividades:
        "Auxiliar no recebimento e preparação de cargas dos expedientes/de processos físicos da unidade.\nAuxiliar no acondicionamento, empacotamento e embalagem de material...",
      principaisConquistas:
        "Desenvolvimento e implementação de um sistema em Excel para controle de prazos e desarquivamentos...",
      categoria: "Administrativa",
      tagsTecnicas: null,
    },
    {
      empresa: "Freelancer",
      cargo: "Desenvolvedor de Software Full Stack / Web Developer",
      dataInicio: ptDate("Outubro/2025"),
      dataFim: ptDate("Atual"), // null = atual
      descricaoAtividades:
        "Criação de fluxos de automação com n8n e Node.js para processamento de dados em tempo real...",
      principaisConquistas:
        "Arquitetura de uma solução completa de automação em três camadas...",
      categoria: "Tecnologia",
      tagsTecnicas: [
        "Node.js", "n8n", "JavaScript", "Docker", "VPS", "PM2",
        "Express.js", "PostgreSQL", "MySQL", "APIs REST",
      ],
    },
  ]);

  console.log("Inserindo formação e projetos...");
  await db.insert(schema.formacaoEProjetos).values([
    {
      tipo: "educacao",
      instituicaoProjeto:
        "Instituto Federal de Educação, Ciência e Tecnologia de São Paulo - IFSP",
      tituloCurso:
        "Curso Técnico em Informática para Internet Integrado ao Ensino Médio",
      status: "Concluído (Dezembro/2025)",
      descricaoDetalhada:
        "Formação técnica focada em desenvolvimento web, lógica de programação, banco de dados e redes de computadores.",
    },
    {
      tipo: "educacao",
      instituicaoProjeto:
        "Instituto Federal de Educação, Ciência e Tecnologia de São Paulo - IFSP",
      tituloCurso: "Curso Técnico em Administração",
      status: "Em andamento (Previsão: Julho/2026)",
      descricaoDetalhada:
        "Foco em rotinas administrativas, gestão de processos, logística e controles internos.",
    },
    {
      tipo: "projeto",
      instituicaoProjeto: "Sistema de Automação Shopee",
      tituloCurso: "Desenvolvedor de Automação",
      status: "Concluído (Outubro/2025)",
      descricaoDetalhada:
        "Desenvolvimento de uma solução completa integrando n8n, API da Shopee e Node.js...",
    },
  ]);

  console.log("Inserindo cursos/certificações...");
  await db.insert(schema.educacaoECursos).values([
    {
      emissorInstituicao: "Google",
      tituloDoCurso: "Fundamentos de Suporte de TI (IT Support Professional)",
      descricao:
        "Certificação profissional que cobre troubleshooting, redes, sistemas operacionais e segurança.",
      destaque: true,
    },
    {
      emissorInstituicao: "Cisco",
      tituloDoCurso: "IT Customer Support Basics",
      descricao:
        "Foco em suporte ao cliente técnico e resolução de problemas de hardware e software.",
      destaque: true,
    },
    {
      emissorInstituicao: "Fundação Bradesco",
      tituloDoCurso: "Administrador de Banco de Dados",
      descricao: "Fundamentos de SQL, modelagem de dados e gerenciamento de bases.",
      destaque: true,
    },
    {
      emissorInstituicao: "Origamid",
      tituloDoCurso: "Web Design & Front-End",
      descricao:
        "Desenvolvimento de interfaces modernas com foco em HTML, CSS e UX.",
      destaque: true,
    },
  ]);

  console.log("Inserindo idiomas...");
  await db.insert(schema.idiomas).values([
    {
      idioma: "Inglês",
      nivelCefr: "B2 - Intermediário Avançado / Advanced",
      certificacaoExame: "Duolingo English Test - 115 pontos",
      historicoDeEscolas:
        "CNA Salto - Master 1 (2025).\nInflux Salto - Conversação Avançada (2024-2025)...",
    },
    {
      idioma: "Português",
      nivelCefr: "Nativo (Native)",
      certificacaoExame: null,
      historicoDeEscolas: null,
    },
  ]);

  console.log("✅ Seed concluído.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Erro no seed:", e?.cause?.message || e?.message);
  process.exit(1);
});
