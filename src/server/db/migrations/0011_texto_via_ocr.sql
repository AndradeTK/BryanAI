-- Marca se o texto do documento veio da leitura por IA (documento escaneado)
-- em vez da extração direta do arquivo. A distinção importa: transcrição é
-- reprodução, e o usuário precisa poder conferir antes que ela alimente a
-- geração de currículo.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "texto_via_ocr" boolean DEFAULT false NOT NULL;
