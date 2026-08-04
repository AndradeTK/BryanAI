/**
 * Cria (ou troca a senha de) a conta de acesso. Não existe rota de cadastro:
 * esta é a única porta de entrada de um usuário no sistema.
 *
 *   node scripts/create-user.mjs --email voce@exemplo.com [--nome "Seu Nome"]
 *
 * ESM puro, dependendo só de `postgres` e do node:crypto — nada de TypeScript
 * nem de devDependencies. É o que permite rodá-lo direto no diretório do release
 * em produção, que só tem as dependências de runtime.
 *
 * O formato do hash é o mesmo de src/server/auth/password.ts, e
 * password.test.ts verifica que os dois continuam compatíveis.
 */
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import postgres from "postgres";

const scryptAsync = promisify(scrypt);

/** Mantido em sincronia com PARAMS de src/server/auth/password.ts. */
const PARAMS = { N: 2 ** 16, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const KEYLEN = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/**
 * Fábrica de perguntas, com uma única leitura de stdin para todas elas.
 *
 * Duas perguntas, um stdin: abrir um `readline` por pergunta funciona no
 * terminal mas quebra com pipe — o primeiro consome o stream até o fim e o
 * segundo nunca recebe uma linha, deixando a promessa pendurada e o processo
 * saindo com código 0 sem ter feito nada.
 *
 * No terminal, esconde o que é digitado. Com pipe não há eco para esconder.
 */
function criarPrompt() {
  const interativo = Boolean(process.stdin.isTTY);

  if (!interativo) {
    const rl = createInterface({ input: process.stdin });
    const pendentes = [];
    const linhas = [];
    rl.on("line", (linha) => {
      const proximo = pendentes.shift();
      if (proximo) proximo(linha);
      else linhas.push(linha);
    });
    // stdin fechou antes de responder tudo: resolve com vazio para a validação
    // adiante recusar, em vez de o processo morrer em silêncio.
    rl.on("close", () => {
      while (pendentes.length) pendentes.shift()("");
    });

    return {
      perguntar: () =>
        new Promise((resolve) => {
          if (linhas.length) resolve(linhas.shift());
          else pendentes.push(resolve);
        }),
      fechar: () => rl.close(),
    };
  }

  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });

  return {
    perguntar: (pergunta) =>
      new Promise((resolve) => {
        muted = false;
        rl.question(pergunta, (resposta) => {
          muted = false;
          process.stdout.write("\n");
          resolve(resposta);
        });
        muted = true;
      }),
    fechar: () => rl.close(),
  };
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const nome = arg("nome")?.trim() ?? null;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error(
      'Uso: node scripts/create-user.mjs --email voce@exemplo.com [--nome "Seu Nome"]',
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida.");
    process.exit(1);
  }

  const prompt = criarPrompt();
  const senha = await prompt.perguntar(`Senha para ${email}: `);
  const confirma = await prompt.perguntar("Confirme a senha: ");
  prompt.fechar();

  if (!senha) {
    console.error("Nenhuma senha informada.");
    process.exit(1);
  }
  if (senha !== confirma) {
    console.error("As senhas não conferem.");
    process.exit(1);
  }
  if (senha.length < 12) {
    console.error(
      "Use no mínimo 12 caracteres — esta conta fica exposta na internet.",
    );
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  try {
    const passwordHash = await hashPassword(senha);
    const [existente] = await sql`SELECT id FROM users WHERE email = ${email}`;

    if (existente) {
      await sql`
        UPDATE users
           SET password_hash = ${passwordHash}
             , nome = COALESCE(${nome}, nome)
         WHERE id = ${existente.id}`;
      // Trocar a senha derruba as sessões abertas — se a troca foi por suspeita
      // de comprometimento, deixar as antigas valendo anularia o propósito.
      const apagadas = await sql`DELETE FROM sessions WHERE user_id = ${existente.id}`;
      console.log(
        `Senha de ${email} atualizada. ${apagadas.count} sessão(ões) encerrada(s).`,
      );
    } else {
      await sql`
        INSERT INTO users (email, nome, password_hash)
        VALUES (${email}, ${nome}, ${passwordHash})`;
      console.log(`Usuário ${email} criado.`);
    }
  } finally {
    await sql.end();
  }
}

/**
 * Só executa quando chamado direto. O teste de compatibilidade importa
 * `hashPassword` daqui, e importar não deve abrir conexão nem pedir senha.
 *
 * A comparação é feita sobre o caminho REAL dos dois lados: em produção a
 * aplicação roda a partir de `/var/www/bryanai/current`, que é um symlink para o
 * release. O Node resolve o symlink em `import.meta.url` mas não em
 * `process.argv[1]`, então comparar as strings direto daria sempre falso — e o
 * script terminaria com código 0 sem ter feito nada.
 */
function chamadoDiretamente() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
    );
  } catch {
    return false;
  }
}

if (chamadoDiretamente()) {
  main().catch((e) => {
    console.error("Erro:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
