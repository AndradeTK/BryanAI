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
import { pathToFileURL } from "node:url";
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

/** Lê do terminal sem ecoar, para a senha não ficar no scrollback. */
function promptHidden(question) {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });

  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      muted = false;
      process.stdout.write("\n");
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
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

  const senha = await promptHidden(`Senha para ${email}: `);
  const confirma = await promptHidden("Confirme a senha: ");

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

// Só executa quando chamado direto. O teste de compatibilidade importa
// `hashPassword` daqui, e importar não deve abrir conexão nem pedir senha.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("Erro:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
