# Arquitetura

Este documento descreve como o Muvuca é construído: as camadas do código, o
modelo de dados, e as decisões de segurança que moldam o projeto. Para
instruções de execução e deploy, veja [README.md](../README.md) e
[docs/DEPLOY.md](./DEPLOY.md).

## Visão geral

O Muvuca é um monólito modular: um único app Next.js (App Router) fala
diretamente com um banco Supabase Postgres via PostgREST/RPC, sem camada de
API própria e sem ORM. A autoridade de segurança é sempre o banco (Row Level
Security), nunca o frontend.

```
Browser
  │
  ▼
proxy.ts (Edge)  ── refresh de sessão Supabase + nonce CSP por request
  │
  ▼
Next.js App Router
  │  Server Components  → leitura direta via Supabase client
  │  Server Actions     → mutações, sempre validadas com Zod antes do RPC
  │
  ▼
Supabase Postgres
  │  RLS em toda tabela privada (deny-by-default)
  │  RPCs para operações compostas/atômicas
  ▼
Supabase Storage (bucket privado de previews de link)
```

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router), Server Components + Server Actions |
| UI | React, Tailwind CSS, Base UI / shadcn |
| Linguagem | TypeScript (strict) |
| Banco | Supabase Postgres, Row Level Security, Auth email + senha |
| Validação | Zod, nas fronteiras de servidor |
| Testes | Vitest (unitário/integração), pgTAP (banco), Playwright (E2E) |

Versões exatas ficam fixadas em `package.json`.

## Estrutura de diretórios

```
app/                  Rotas do Next.js App Router
  (app)/              Rotas autenticadas (biblioteca, tags, configurações)
  (auth)/login/       Tela de login (email + senha)
  (auth)/forgot-password/  Pedido do link de redefinição de senha
  (auth)/reset-password/   Nova senha (só com sessão de recuperação)
  auth/confirm/       Route Handler que troca o token/code por sessão
  api/previews/       Proxy same-origin para imagens de preview e a rota
                      que drena a fila de enriquecimento
components/           Componentes React, organizados por área de produto
lib/
  actions/            Server Actions (mutações)
  database/queries/   Leituras tipadas via Supabase client
  validation/         Schemas Zod compartilhados entre cliente e servidor
  security/           Headers, CSP, logger central, validação de redirect
  metadata/           Fetcher SSRF-hardened para enriquecimento de link
  previews/           Fila de previews: claim, enriquecimento, conclusão
  supabase/           Clientes Supabase (browser, server, proxy)
  tags/, bookmarks/, backup/, export/, prompt/, theme/, storage/
                       Lógica de domínio pura, testável sem I/O quando possível
supabase/
  migrations/         Schema versionado em SQL puro
  tests/              Suítes pgTAP (RLS, triggers, RPCs)
  config.toml         Configuração do stack local
e2e/                  Testes Playwright ponta-a-ponta
proxy.ts              Edge Proxy: refresh de sessão + nonce CSP por request
```

## Modelo de dados

Três entidades centrais, todas com `user_id` obrigatório e RLS:

- **`tags`** — hierarquia via `parent_id` autorreferente, profundidade máxima
  de 6 níveis, imposta por trigger. Cores vêm de uma paleta curada.
- **`library_items`** — item polimórfico com `type` em `link` | `prompt` |
  `code_component`. Links carregam `url`/`normalized_url`; prompts e
  code_component carregam `content`.
- **`item_tags`** — associação N:N entre itens e tags, com chaves
  estrangeiras compostas `(item_id, user_id)` / `(tag_id, user_id)`, o que
  torna uma associação cross-user estruturalmente impossível no nível
  relacional (não depende só de RLS).

Tabelas de suporte: `user_preferences` (tema), `link_previews` (fila de
enriquecimento de metadados e cache de thumbnail/favicon).

### URLs de tag

**UUID é a identidade da tag. Slug é apenas a identidade de roteamento.**
Relações, RPCs e Server Actions continuam por UUID; o slug só existe para a
URL `/t/<slug-raiz>/.../<slug-tag>` (ex.: `/t/design/recursos-assets/icones`).

- Só o slug de cada tag é persistido; o caminho é derivado de
  `parent_id + slug` na leitura. Renomear ou mover uma tag muda a URL dela e
  das descendentes sem nenhum update em cascata.
- O banco é o único autor de slug (`slugify_tag_name` + trigger
  `tags_set_slug`, para toda escrita, inclusive importação de favoritos e
  restauração de backup): sem acento, minúsculas, `[a-z0-9-]`, nunca vazio
  (`tag` como fallback).
- Único por irmãos (`(user_id, slug, parent_id)`). Nomes distintos que
  normalizam igual ("Ícones", "Icones") ganham sufixo: `icones`, `icones-2`.
- Rename muda o slug quando a base do nome muda; não há histórico de slug.
- `/tags/<uuid>` (links antigos) responde 307 para o caminho atual — não
  permanente, porque o destino muda a cada rename.
- Backup 1.3 inclui o slug; arquivos anteriores restauram com o slug
  derivado do nome.

A fila de previews é drenada pelo próprio cliente, através de um Route
Handler dedicado — e não de uma Server Action, porque Server Actions são
serializadas por cliente e uma varredura em segundo plano competiria com
importação e edição. O hook drena primeiro os links visíveis na página e,
quando esses acabam, o restante da fila do usuário. Retry, backoff e
classificação de erro permanente vivem em RPCs (`claim_preview_jobs`,
`complete_preview_job`), não no cliente.

O schema completo, com todas as constraints e índices, está em
`supabase/migrations/` — as migrations são a fonte de verdade, numeradas e
aplicadas em ordem.

## Autenticação

Email + senha via Supabase Auth (`signInWithPassword`). O Muvuca é pensado
para deploy single-user: não existe tela de cadastro; o único usuário é
provisionado por quem faz o deploy (pelo painel do Supabase, ou pelo seed
local). Falha de login devolve sempre o mesmo erro genérico, para a resposta
não revelar se o email tem conta.

"Esqueci a senha" envia um link de recuperação (PKCE) que volta por
`auth/confirm/`; o pedido responde sucesso mesmo para email sem conta. A
página de nova senha e a action só aceitam sessão cujo `amr` tem uma entrada
`recovery` dos últimos 15 minutos — uma sessão de login comum, mesmo roubada, não troca a senha — e,
depois da troca, as demais sessões são encerradas.

Identidade é sempre verificada com `getClaims()` (validação criptográfica
local do JWT contra o JWKS do projeto), nunca lida de um objeto de sessão em
cookie sem revalidação. `requireUser()` roda no layout do segmento
autenticado, em todo request — esconder UI no cliente não é controle de
acesso.

## Segurança

- **RLS deny-by-default**: toda tabela privada tem RLS habilitado e forçado
  (`force row level security`, fechando o bypass do dono da tabela); o papel
  `anon` não tem nenhum grant. Toda policy compara contra
  `(select auth.uid()) = user_id`.
- **SSRF contido**: o servidor Next.js nunca faz fetch para uma URL
  fornecida por usuário, exceto dentro de `lib/metadata/`, sob uma allowlist
  de protocolo, bloqueio de IP privado/metadata de nuvem via `net.BlockList`
  com `lookup` customizado (valida o IP antes do connect, não depois),
  revalidação a cada redirect, timeout e teto de bytes. Fora desse módulo, a
  proibição é absoluta.
- **CSP com nonce por request**: gerado em `proxy.ts`, com `strict-dynamic`
  e sem `unsafe-eval` em produção.
- **Zero chave privilegiada no runtime da aplicação**: só a chave publicável
  (`sb_publishable_...`) circula no código; nenhuma `service_role` ou
  `sb_secret_...` é usada pelo servidor Next.js.
- **Erros nunca vazam detalhe interno**: toda mutação retorna um
  `ActionResult<T>` tipado; mensagens de erro do Postgres só chegam ao
  cliente quando são texto de aplicação já controlado (`raise exception`
  com SQLSTATE `P0001`), nunca um SQLSTATE genérico ou stack trace.

## RPCs e composição no banco

Operações que precisam ser atômicas e/ou atravessar mais de uma tabela viram
RPC (`security invoker`, `set search_path = ''`, nunca `security definer`):
criação/edição de item com substituição de tags, exclusão de tag com
reparentamento dos filhos, importação de favoritos HTML, restauração de
backup JSON, busca full-text com paginação por keyset. Toda RPC herda as
policies de RLS do chamador — não existe atalho de privilégio elevado.

## Testes

- **Unitário/integração** (Vitest): lógica pura e Server Actions, com o
  cliente Supabase mockado.
- **Banco** (pgTAP, `supabase test db`): RLS, triggers, constraints e RPCs
  exercitados diretamente no Postgres local, incluindo negativas cross-user.
- **E2E** (Playwright): fluxos críticos completos contra o stack local
  (Supabase + Mailpit para capturar o email de redefinição de senha).

## Decisões notáveis

- **Sem ORM**: queries tipadas via PostgREST/`@supabase/ssr`, com o tipo do
  schema gerado (`lib/database/generated.types.ts`), nunca copiado à mão.
- **Server-first**: Server Components por padrão; `"use client"` só no nó
  que realmente precisa de estado/eventos do navegador.
- **Sem features especulativas**: sem IA server-side, sem scraping remoto
  arbitrário, sem colaboração multi-usuário — o escopo é deliberadamente
  pequeno.
