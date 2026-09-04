# Muvuca

> Biblioteca pessoal de links, prompts de IA e snippets de código, organizada
> por tags hierárquicas com rollup automático e busca instantânea.

## O que é

O Muvuca é um app web para guardar e organizar links, prompts de IA e
snippets de código num só lugar, com tags hierárquicas (até 6 níveis) que
agregam automaticamente os itens de toda a subárvore, busca full-text
instantânea e importação de favoritos do navegador.

Este projeto nasceu como material de um curso sobre desenvolvimento
assistido por IA — construído do zero como estudo de caso de arquitetura,
segurança e fluxo de trabalho com agentes — e está disponível publicamente
para quem quiser estudar o código, rodar localmente ou usar como base para o
próprio projeto.

Detalhes de arquitetura, modelo de dados e decisões de segurança estão em
[`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md). Instruções de deploy estão
em [`docs/DEPLOY.md`](./docs/DEPLOY.md).

## Pré-requisitos

- [Node.js](https://nodejs.org/) 24 (LTS)
- [pnpm](https://pnpm.io/) 11
- [Docker](https://www.docker.com/) (para o stack local do Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) 2.113+

## Instalação

```bash
git clone https://github.com/<seu-usuario>/muvuca.git
cd muvuca
pnpm install --frozen-lockfile
```

## Supabase local

O jeito mais simples de rodar o Muvuca é contra um stack Supabase local via
Docker — não depende de nenhuma conta ou projeto na nuvem.

```bash
supabase start
```

Isso sobe Postgres, Auth, Storage e Mailpit (captura de email local, para o
magic link) e aplica as migrations de `supabase/migrations/`. Ao final, o
comando imprime a URL da API e a chave publicável do stack local — são os
mesmos valores já preenchidos como default em `.env.example`.

```bash
cp .env.example .env.local
pnpm dev
```

A aplicação sobe em `http://localhost:3000`. O login é feito por magic
link: o email é interceptado pelo Mailpit local, disponível em
`http://127.0.0.1:54324`.

Para parar o stack:

```bash
supabase stop
```

## Supabase próprio

Para usar um projeto Supabase na nuvem (ou self-hosted) em vez do stack
local:

1. Crie um projeto em [supabase.com](https://supabase.com) (ou use uma
   instância self-hosted).
2. Aplique as migrations:
   ```bash
   supabase link --project-ref <seu-project-ref>
   supabase db push
   ```
3. Preencha `.env.local` com a URL e a chave publicável do seu projeto
   (Project Settings → API no painel do Supabase).
4. Como o Muvuca é pensado para deploy single-user, crie o primeiro usuário
   diretamente pelo painel do Supabase (Authentication → Users) — o
   formulário de login do app nunca cria conta nova.

## Variáveis de ambiente

Só existem três, todas públicas (prefixo `NEXT_PUBLIC_`) — o Muvuca nunca
usa uma chave privilegiada (`service_role`) no servidor. Veja
`.env.example` para os valores de referência do stack local.

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável (`sb_publishable_...`) |
| `NEXT_PUBLIC_APP_URL` | URL pública onde a aplicação está servida |

## Testes

```bash
pnpm test          # Unitário/integração (Vitest)
pnpm test:watch    # Vitest em modo watch
pnpm test:e2e      # End-to-end (Playwright, precisa do stack local rodando)
supabase test db   # Suítes pgTAP: RLS, triggers, constraints, RPCs
pnpm check         # lint + typecheck + test + format:check
```

## Estrutura do repositório

```
app/                  Rotas do Next.js App Router
components/           Componentes React, organizados por área de produto
lib/
  actions/            Server Actions (mutações)
  database/queries/   Leituras tipadas via Supabase client
  validation/         Schemas Zod
  security/           Headers, CSP, logger, validação de redirect
  metadata/           Fetcher SSRF-hardened para preview de links
  supabase/           Clientes Supabase (browser, server, proxy)
supabase/
  migrations/         Schema versionado em SQL puro
  tests/              Suítes pgTAP
e2e/                  Testes Playwright ponta-a-ponta
docs/                 Arquitetura e deploy
proxy.ts              Edge Proxy: refresh de sessão + nonce CSP por request
```

Mais detalhes em [`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md).

## Contribuição

Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para padrões de código,
convenções de commit e o checklist de PR.

## Deploy

O Muvuca é agnóstico de hospedagem: qualquer ambiente Node.js ou Docker
serve. Veja [`docs/DEPLOY.md`](./docs/DEPLOY.md) para as duas rotas
suportadas (`pnpm build` + `pnpm start`, ou a imagem Docker a partir do
`Dockerfile` na raiz).

## Segurança

Para reportar uma vulnerabilidade, veja [`SECURITY.md`](./SECURITY.md).

## Licença

[MIT](./LICENSE).
