import { db, schema } from "./client";

/**
 * Seed de EXEMPLO — dados fictícios, para um ambiente de desenvolvimento novo
 * ter algo na tela.
 *
 * Este arquivo já teve os dados reais do dono do projeto embutidos, incluindo
 * telefone e e-mail. Como o repositório é público, isso era contato pessoal
 * exposto à coleta automatizada; e, além disso, uma segunda cópia da verdade
 * que envelhecia em silêncio enquanto o banco seguia em frente.
 *
 * Os dados reais entram por outro caminho, que não passa pelo código:
 *   1. `npm run db:migrate`   cria o schema
 *   2. `npm run user:create`  cria a conta de acesso
 *   3. Configurações → Importar, com o JSON de `/api/dados/export`
 *
 * Rodar: npm run db:seed
 */

async function seed() {
  console.log("Limpando tabelas...");
  await db.delete(schema.historicoGeracoes);
  await db.delete(schema.idiomas);
  await db.delete(schema.educacaoECursos);
  await db.delete(schema.formacaoEProjetos);
  await db.delete(schema.experiencias);
  await db.delete(schema.perfil);

  console.log("Inserindo perfil de exemplo...");
  await db.insert(schema.perfil).values({
    nomeCompleto: "Alex Exemplo",
    email: "alex@exemplo.invalid",
    telefone: "+1 555 0100",
    localizacao: "Calgary, AB, Canadá",
    linkedin: "https://www.linkedin.com/in/exemplo/",
    github: "https://github.com/exemplo",
    resumoBase:
      "Pessoa desenvolvedora back-end com foco em Node.js, APIs REST e automação de processos. Experiência com PostgreSQL, Docker e integrações com serviços de terceiros.",
    dataNascimento: "2000-01-01",
  });

  console.log("Inserindo experiências de exemplo...");
  await db.insert(schema.experiencias).values([
    {
      empresa: "Empresa Exemplo",
      cargo: "Desenvolvedor Back-end",
      dataInicio: "2024-03-01",
      dataFim: null,
      categoria: "Desenvolvimento",
      sortOrder: 0,
      tagsTecnicas: ["Node.js", "PostgreSQL", "Docker", "APIs REST"],
      descricaoAtividades:
        "Desenvolvimento e manutenção de APIs REST, integrações com serviços externos e automação de rotinas internas.",
      principaisConquistas:
        "Reduziu em 40% o tempo de processamento de um fluxo crítico ao substituir polling por webhooks.",
    },
    {
      empresa: "Outra Empresa Exemplo",
      cargo: "Desenvolvedor Júnior",
      dataInicio: "2023-01-01",
      dataFim: "2024-02-29",
      categoria: "Desenvolvimento",
      sortOrder: 1,
      tagsTecnicas: ["JavaScript", "MySQL"],
      descricaoAtividades:
        "Manutenção de aplicações web e correção de defeitos reportados pelo suporte.",
    },
  ]);

  console.log("Inserindo formação de exemplo...");
  await db.insert(schema.formacaoEProjetos).values([
    {
      tipo: "educacao",
      tituloCurso: "Tecnologia em Análise e Desenvolvimento de Sistemas",
      instituicaoProjeto: "Instituição de Exemplo",
      status: "Concluído",
      sortOrder: 0,
      descricaoDetalhada:
        "Formação superior em desenvolvimento de software, bancos de dados e engenharia de requisitos.",
    },
    {
      tipo: "projeto",
      tituloCurso: "Projeto de Exemplo",
      instituicaoProjeto: "Pessoal",
      status: "Entregue",
      link: "https://github.com/exemplo/projeto",
      sortOrder: 1,
      descricaoDetalhada:
        "Serviço em Node.js que consome uma API pública, normaliza os dados e expõe um endpoint de consulta.",
    },
  ]);

  console.log("Inserindo certificações de exemplo...");
  await db.insert(schema.educacaoECursos).values([
    {
      tituloDoCurso: "Certificação de Exemplo",
      emissorInstituicao: "Emissor Exemplo",
      destaque: true,
      descricao: "Curso introdutório de fundamentos de infraestrutura e redes.",
    },
  ]);

  console.log("Inserindo idiomas de exemplo...");
  await db.insert(schema.idiomas).values([
    {
      idioma: "Inglês",
      nivelCefr: "B2 - Intermediário Avançado",
      certificacaoExame: "Exemplo",
      historicoDeEscolas: null,
    },
    {
      idioma: "Português",
      nivelCefr: "Nativo",
      certificacaoExame: null,
      historicoDeEscolas: null,
    },
  ]);

  console.log("Seed de exemplo concluído.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Erro no seed:", e?.cause?.message || e?.message);
  process.exit(1);
});
