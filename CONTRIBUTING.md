# Guia de Contribuição — Muvuca

Obrigado pelo interesse em contribuir com o Muvuca! Este documento cobre
padrões de código, arquitetura, segurança e o fluxo de trabalho esperado em
um Pull Request.

Para uma visão mais completa da arquitetura, veja
[`docs/ARQUITETURA.md`](./docs/ARQUITETURA.md).

## 1. Escopo

O Muvuca é deliberadamente pequeno em escopo. Antes de propor uma feature
nova, considere se ela se encaixa no propósito do projeto — uma biblioteca
pessoal de links/prompts/snippets, single-user, com tags hierárquicas e
busca. Ficam fora de escopo por design:

- Integrações de IA ou auto-tagging.
- Screenshot automático ou unfurl via headless browser/serviço de terceiro.
  Enriquecimento de metadata (favicon/Open Graph) é permitido, mas
  **exclusivamente** através do módulo `lib/metadata/`, sob os controles
  SSRF-hardened documentados em `docs/ARQUITETURA.md` — qualquer outro fetch
  de URL de usuário continua proibido.
- Compartilhamento público, colaboração multi-usuário ou workspaces
  compartilhados.
- Upload de arquivos estáticos arbitrários.
- Extensões de navegador ou automações externas.

## 2. Setup do ambiente

Veja [`README.md`](./README.md#instalação) para os passos completos de
instalação e Supabase local. Resumo:

```bash
pnpm install
supabase start
cp .env.example .env.local
pnpm dev
```

## 3. Padrões de código e arquitetura

### 3.1. Server-first

Server Components por padrão. Adicione `"use client"` apenas no menor nó da
árvore que realmente precise de estado ou eventos do navegador. Mutações web
usam Server Actions, sempre retornando `ActionResult<T>` (`lib/utils/result.ts`).

### 3.2. Banco de dados (sem ORM)

- Toda alteração de estrutura é uma **migration versionada** em
  `supabase/migrations/`.
- Toda tabela privada tem `user_id` obrigatório e Row Level Security ativo
  por padrão.
- Nunca concatene strings em SQL. Use os builders tipados do PostgREST ou
  RPCs parametrizadas com `security invoker` + `set search_path = ''`.

### 3.3. Validação em profundidade

Toda funcionalidade com entrada de dados passa por:

1. Validação de formulário no cliente (UX).
2. Validação de esquema com Zod no servidor (fronteira de segurança real).
3. Constraints relacionais (`CHECK`, `NOT NULL`, `FOREIGN KEY`) no Postgres.
4. Políticas RLS no Postgres.

### 3.4. Regras de segurança que não têm exceção

- **SSRF contido em `lib/metadata/`**: proibido `fetch()`/requisição de rede
  no servidor para uma URL de usuário fora desse módulo. Dentro dele, todo
  fetch passa pelos controles SSRF-hardened (allowlist de protocolo,
  bloqueio de IP privado/metadata via `net.BlockList` + `lookup`
  customizado, revalidação de redirect, timeout, teto de bytes).
- **Zero XSS**: proibido `dangerouslySetInnerHTML` com qualquer dado de
  usuário (título, descrição, prompt, bookmark importado).
- **Zero chave privilegiada**: nenhuma `service_role`/`sb_secret_*` no
  código do app ou no cliente.

## 4. Scripts

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` / `pnpm test:watch` | Testes unitários/integração (Vitest) |
| `pnpm test:e2e` | Testes end-to-end (Playwright) |
| `supabase test db` | Suítes pgTAP no Postgres local |
| `pnpm check` | Validação completa: lint + typecheck + test + format:check |
| `pnpm check:hygiene` | Verifica que nenhum arquivo rastreado tem segredo/referência privada |

## 5. Git e commits

Convenção livre de [Conventional Commits](https://www.conventionalcommits.org/),
em português ou inglês.

**Branches:** `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`.

**Exemplos de commit:**
- `feat(items): add prompt copy button with feedback toast`
- `fix(tags): prevent cycle creation on tag reparenting`
- `test(rls): add negative cross-user assertion for item_tags`

## 6. Checklist de Pull Request

- [ ] A alteração respeita o escopo do projeto (seção 1).
- [ ] Elementos interativos têm rótulo acessível e navegação por teclado.
- [ ] Todo input no servidor é validado com Zod.
- [ ] Tabelas/operações novas têm policies RLS restritivas e teste provando
      que o Usuário B não acessa recursos do Usuário A.
- [ ] Nenhuma URL de usuário é requisitada pelo servidor fora de
      `lib/metadata/`, e nenhum conteúdo é injetado via
      `dangerouslySetInnerHTML`.
- [ ] Nenhum segredo (token, senha, chave privada) exposto no cliente, logs
      ou commit.
- [ ] `pnpm check` passa localmente.
- [ ] `supabase test db` passa sem erros.
- [ ] `pnpm test:e2e` passa sem regressão nos fluxos críticos tocados.

## 7. Dúvidas

Abra uma issue ou discussão no repositório.
