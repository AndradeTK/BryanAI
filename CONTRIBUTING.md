# Contribuindo para o BryanAI

Obrigado pelo interesse em contribuir! Aqui estão as diretrizes para contribuição.

## Como Contribuir

1. **Fork** o repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/minha-feature`)
3. Faça suas alterações e **commit** (`git commit -m 'feat: adiciona nova feature'`)
4. **Push** para a branch (`git push origin feature/minha-feature`)
5. Abra um **Pull Request**

## Padrão de Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — Nova funcionalidade
- `fix:` — Correção de bug
- `docs:` — Apenas documentação
- `refactor:` — Refatoração sem mudança de funcionalidade
- `style:` — Formatação, ponto e vírgula, etc.
- `test:` — Adição ou correção de testes
- `chore:` — Tarefas de manutenção

## Configuração do Ambiente

```bash
# Clone
git clone https://github.com/AndradeTK/BryanAI.git
cd BryanAI

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Inicie o banco de dados
mysql -u root -p < infos_curriculo.sql

# Inicie em modo de desenvolvimento
npm run dev
```

## Segurança

- **NUNCA** commite credenciais, API keys ou senhas
- Use variáveis de ambiente via `.env`
- Se encontrar uma vulnerabilidade, abra uma issue privada ou entre em contato diretamente

## Código

- Use `async/await` ao invés de callbacks
- Trate erros com `try/catch` em todas as funções async
- Siga o padrão de código existente no projeto
- Adicione comentários JSDoc nas funções públicas
