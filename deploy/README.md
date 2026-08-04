# Deploy

Cópia versionada da configuração que vive na VPS. **A fonte da verdade é o
servidor** — isto aqui é referência e ponto de partida para reconstruir o
ambiente, não algo que o CI aplique automaticamente.

## Arquivos

| Arquivo | Onde vive na VPS |
| --- | --- |
| `nginx-app.bryanandrade.dev.conf` | `/etc/nginx/sites-enabled/app.bryanandrade.dev` |

Os blocos marcados `# managed by Certbot` foram escritos pelo `certbot --nginx` —
não edite à mão: uma renovação com mudança de configuração os reescreve.

## Topologia

```
internet :443 ──► nginx ──► 127.0.0.1:3100 (bryanai, PM2)
                    │
                    └─────► 127.0.0.1:3000/:3001 (VanBora — outra aplicação)

/var/www/bryanai/
  releases/<sha>/       bundle standalone do release
  current -> releases/<sha>
  shared/.env           segredos, fora do git, montado por symlink no release
/var/lib/bryanai/generated/   PDFs gerados e anexos do usuário
```

`STORAGE_DIR` aponta para fora do diretório do release de propósito: o deploy
substitui o release inteiro, e guardar os anexos ali dentro apagaria as cartas
de recomendação a cada publicação.

## Coisas que não são óbvias

**`HOSTNAME=127.0.0.1` precisa estar no ambiente do processo.** O `server.js` do
build standalone faz `process.env.HOSTNAME || '0.0.0.0'` na linha 9, antes de o
Next carregar os arquivos `.env`. Definir só no `.env` não basta: a aplicação
sobe escutando em todas as interfaces e passa a responder direto pela porta,
sem HTTPS e sem os cabeçalhos `X-Forwarded-*`. O deploy resolve fazendo
`set -a; . shared/.env; set +a` antes do `pm2 reload --update-env`.

**`X-Real-IP` e `X-Forwarded-For` não são decoração.** O rate limit do login
conta tentativas por IP. Sem esses cabeçalhos, toda tentativa chega como
`127.0.0.1` e um único atacante trancaria a conta para você também.

**`X-Frame-Options` é `SAMEORIGIN`, não `DENY`.** A tela de comparação de
currículos usa iframes apontando para `/api/preview/<template>` na própria
origem; `DENY` bloqueia até same-origin e quebraria o preview.

**Timeouts de 300s.** Geração de PDF e chamadas ao Gemini com retry passam de
60s no pior caso. O padrão do nginx cortaria a resposta no meio.

**`client_max_body_size 12M`.** O padrão de 1MB recusaria um currículo em PDF
com imagens antes de a aplicação ver a requisição.

## Certificado

Emitido por Let's Encrypt via `certbot --nginx`, renovação automática pelo
`certbot.timer` do systemd.

```bash
certbot certificates                                    # ver validade
certbot renew --cert-name app.bryanandrade.dev --dry-run  # simular renovação
```

HSTS está com `max-age=31536000` **sem** `includeSubDomains`: o certificado
cobre só este subdomínio, e a raiz do domínio pode vir a apontar para outro
servidor.

## Rollback

```bash
ls -1dt /var/www/bryanai/releases/*/
ln -sfnT /var/www/bryanai/releases/<sha-anterior> /var/www/bryanai/current
pm2 reload bryanai --update-env
```

O workflow já faz isso sozinho quando a verificação de saúde falha. Migrations
**não** são revertidas — se o problema for de schema, confira o banco à mão.
