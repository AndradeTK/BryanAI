-- Atividades extracurriculares e de liderança.
--
-- O sistema só sabia registrar emprego (experiencias), educação e projeto
-- (formacao_e_projetos) e certificação (educacao_e_cursos). "Embaixador do
-- SAIT", monitoria, representação estudantil e voluntariado não tinham onde
-- morar.
--
-- Para quem constrói carreira no Canadá isso não é detalhe: é atividade em
-- instituição canadense, em inglês, que responde à objeção de "Canadian
-- experience" — e é soft skill demonstrada em vez de afirmada numa lista.
--
-- ATENÇÃO: ADD VALUE em enum do Postgres NÃO é reversível (não existe DROP
-- VALUE). Reverter exigiria recriar o tipo. É aditivo e seguro, mas é de mão
-- única.
ALTER TYPE "tipo_formacao" ADD VALUE IF NOT EXISTS 'atividade';
--> statement-breakpoint

-- O papel exercido não cabia em nenhuma coluna: instituicao_projeto é a
-- organização e titulo_curso é o nome do programa.
ALTER TABLE "formacao_e_projetos" ADD COLUMN IF NOT EXISTS "papel" varchar(150);
--> statement-breakpoint

-- Período em texto livre, como no resto do sistema (o currículo imprime
-- "09/2025 — atual", não faz aritmética de data). NULL em periodo_fim
-- significa em andamento.
ALTER TABLE "formacao_e_projetos" ADD COLUMN IF NOT EXISTS "periodo_inicio" varchar(20);
--> statement-breakpoint
ALTER TABLE "formacao_e_projetos" ADD COLUMN IF NOT EXISTS "periodo_fim" varchar(20);
--> statement-breakpoint

-- Marca a atividade feita no Canadá. Fica separado de canadian_exp_months do
-- canada_profile de propósito: atividade voluntária não é emprego, e somar as
-- duas infla um número que o próprio usuário usa para decidir se concorre a
-- uma vaga.
ALTER TABLE "formacao_e_projetos" ADD COLUMN IF NOT EXISTS "no_canada" boolean NOT NULL DEFAULT false;
