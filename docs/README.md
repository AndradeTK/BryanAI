# Documentação

Para **usar** o sistema — instalar, rodar, entender a stack e o deploy — a
referência é o [README da raiz](../README.md). O que está aqui é o registro
histórico: por que as decisões do código são como são.

| Documento | O que é | Estado |
| --- | --- | --- |
| [FASE-0-1-PLANO.md](FASE-0-1-PLANO.md) | Segurança e higiene, sobre a versão Express/EJS | histórico — concluído |
| [FASE-3-PLANO.md](FASE-3-PLANO.md) | Migração para Next.js 16 + TypeScript + Zod | histórico — concluído |
| [FASE-2-PLANO.md](FASE-2-PLANO.md) | Domínio canadense (NOC, CLB, ECA, anti-alucinação) | histórico — concluído |
| [FASES-4-6-ENTREGUE.md](FASES-4-6-ENTREGUE.md) | Postgres/Drizzle, pgvector, auth e deploy | registro do que existe |
| [PLANO-MELHORIAS.md](PLANO-MELHORIAS.md) | Bugs e features levantados na auditoria de 30/08/2026 | **trabalho em aberto** |
| `CREDENCIAIS_SISTEMA.md` | Acessos da VPS e do repositório | **local, fora do git** |

## A ordem das fases não é a ordem dos números

A Fase 3 (base TS/Zod) foi executada **antes** da Fase 2 (domínio canadense), de
propósito. A razão está escrita nos dois planos, e vale repetir porque é a
decisão de arquitetura mais importante do projeto:

Um currículo canadense não pode ter foto, idade, estado civil ou nacionalidade —
exigência dos Human Rights Codes provinciais. A forma correta de garantir isso
**não é uma instrução de prompt**, que o modelo pode ignorar, e sim a *ausência
desses campos no schema Zod de saída*. O modelo não consegue emitir o que o
schema não declara.

Isso só existe se os schemas já forem Zod. Fazer o domínio canadense em
JavaScript primeiro seria construir a versão fraca e depois refazer a forte.

## Os planos citam caminhos que não existem mais

`../app.js`, `../services/*`, `../controllers/*` — são da versão Express/EJS/MySQL,
que hoje vive só na tag `v2-legacy`. Os documentos foram mantidos como estavam:
reescrevê-los apagaria o raciocínio que justifica o código atual.
