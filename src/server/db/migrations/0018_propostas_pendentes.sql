-- Propostas de escrita que sobrevivem ao fim da conversa.
--
-- O assistente já não grava sozinho: propõe, a tela mostra o que mudaria, o
-- usuário aprova. Mas a proposta vive só na resposta do turno — fechar a aba
-- a perde, e não há como aprovar depois.
--
-- Isso basta enquanto a conversa acontece dentro do BryanAI, com a tela aberta.
-- Deixa de bastar quando ela acontece noutro app (um chat de IA externo via
-- MCP): ali o pedido e a aprovação são momentos separados por horas, e a
-- proposta precisa esperar em algum lugar.
--
-- Os argumentos ficam em jsonb sem CHECK de propósito: quem valida é o Zod de
-- ARGS_SCHEMAS, duas vezes — ao criar a proposta e de novo ao aplicar. Um
-- schema que mudar entre a criação e a confirmação deve fazer a proposta antiga
-- FALHAR na aplicação, não passar por uma regra de banco que ficou velha junto.
CREATE TABLE IF NOT EXISTS "propostas" (
  "id" serial PRIMARY KEY,
  -- Nome interno da escrita (chave de ARGS_SCHEMAS) — o que aplicarEscrita()
  -- despacha. Um nome público de protocolo pode mudar sem migração; este não.
  "ferramenta" varchar(60) NOT NULL,
  "argumentos" jsonb NOT NULL,
  -- De onde veio: 'assistente' (chat interno) ou 'mcp' (chat externo). Guardado
  -- porque a confiança é diferente — uma proposta que nasceu fora do painel
  -- merece mais atenção na revisão.
  "origem" varchar(20) NOT NULL DEFAULT 'assistente',
  -- Rótulo de quem propôs, quando houver (o label do token do MCP). Uma
  -- proposta de origem que você não reconhece é o alarme.
  "origem_rotulo" varchar(100),
  -- 'pendente' | 'aplicada' | 'rejeitada'
  "estado" varchar(12) NOT NULL DEFAULT 'pendente',
  -- Mensagem de aplicarEscrita(), ou o erro de validação se falhou ao aplicar.
  "resultado" text,
  "criada_em" timestamptz NOT NULL DEFAULT now(),
  "resolvida_em" timestamptz,
  -- Sete dias. Uma proposta velha é pior que nenhuma: você não lembra do pedido
  -- e o perfil pode ter mudado por outro caminho, então aprovar às cegas
  -- reintroduziria dado obsoleto. Lida na consulta, não por job — cron numa VPS
  -- de 3.8GB é infraestrutura que não se paga.
  "expira_em" timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
--> statement-breakpoint

-- A consulta quente é uma só: quantas pendentes válidas existem, para o badge
-- da navegação em cada render de página.
CREATE INDEX IF NOT EXISTS "propostas_pendentes_idx"
  ON "propostas" ("estado", "expira_em")
  WHERE "estado" = 'pendente';
