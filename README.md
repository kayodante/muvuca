<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/brand/logo-full-light.svg">
    <source media="(prefers-color-scheme: light)" srcset="./public/brand/logo-full-dark.svg">
    <img src="./public/brand/logo-full-dark.svg" alt="Muvuca" width="279">
  </picture>
</p>

<p align="center">
  <strong>Sua biblioteca pessoal de links, prompts e snippets.</strong><br>
  Organize tudo com tags hierárquicas e encontre qualquer coisa em segundos.
</p>

<p align="center">
  <a href="https://github.com/kayodante/muvuca/actions/workflows/ci.yml"><img src="https://shieldcn.dev/github/ci/kayodante/muvuca.svg" alt="Status do CI"></a>
  <a href="./LICENSE"><img src="https://shieldcn.dev/github/license/kayodante/muvuca.svg" alt="Licença MIT"></a>
</p>

## O Muvuca

O Muvuca reúne links, prompts e componentes de código em uma biblioteca visual,
rápida e fácil de manter. Você pode importar os favoritos do navegador, organizar
o acervo em até seis níveis de tags e pesquisar por título, conteúdo, descrição ou
domínio.

### O que você encontra por aqui

- **Uma biblioteca só:** links, prompts e snippets lado a lado, cada tipo com uma
  apresentação própria.
- **Tags que preservam contexto:** hierarquia com rollup automático, sem itens
  duplicados nos resultados.
- **Busca imediata:** pesquisa full-text combinada com filtros e ordenação.
- **Importação sem retrabalho:** transforme a exportação de favoritos do navegador
  em tags e links, com prévia antes de confirmar.
- **Portabilidade:** exporte o acervo em JSON ou HTML Bookmarks e restaure backups
  quando precisar.
- **Feito para qualquer tela:** interface responsiva com temas claro, escuro e do
  sistema.

## Comece em poucos minutos

### Pré-requisitos

- [Node.js](https://nodejs.org/) 24 LTS
- [pnpm](https://pnpm.io/) 11
- [Docker](https://www.docker.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) 2.113 ou mais recente

### 1. Baixe o projeto

```bash
git clone https://github.com/kayodante/muvuca.git
cd muvuca
pnpm install --frozen-lockfile
```

### 2. Inicie o Supabase local

```bash
supabase start
cp .env.example .env.local
```

Copie a **Publishable key** exibida por `supabase start` para
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`. Os demais valores já
apontam para o ambiente local.

### 3. Rode o Muvuca

```bash
pnpm dev
```

Acesse [localhost:3000](http://localhost:3000), entre com
`dev@muvuca.local` e abra o link recebido no
[Mailpit local](http://127.0.0.1:54324). Nenhum email é enviado de verdade.

Para encerrar o ambiente local:

```bash
supabase stop
```

## Usando seu próprio Supabase

Para usar o Muvuca com um projeto Supabase na nuvem ou self-hosted:

1. Crie o projeto e aplique as migrations:

   ```bash
   supabase link --project-ref <seu-project-ref>
   supabase db push
   ```

2. Preencha as três variáveis de `.env.local` com os dados do projeto.
3. Crie o primeiro usuário em **Authentication → Users** no painel do Supabase.
4. Faça o build e o deploy seguindo o [guia de deploy](./docs/DEPLOY.md).

O formulário de login não cria novas contas: o Muvuca foi pensado para um deploy
pessoal, autenticado por Magic Link.

## Variáveis de ambiente

| Variável | Uso |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável (`sb_publishable_...`) |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação |

Todas são públicas por design. O Muvuca não usa `service_role` nem outra chave
administrativa no servidor da aplicação.

<details>
<summary><strong>Desenvolvimento e testes</strong></summary>

### Comandos úteis

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia o servidor de desenvolvimento |
| `pnpm test` | Executa os testes com Vitest |
| `pnpm test:e2e` | Executa os testes end-to-end com Playwright |
| `supabase test db` | Executa os testes de banco e RLS com pgTAP |
| `pnpm check` | Executa lint, typecheck, testes e verificação de formato |
| `pnpm build` | Gera o build de produção |

### Estrutura do repositório

```text
app/                  Rotas do Next.js App Router
components/           Componentes React por área de produto
lib/
  actions/            Server Actions
  database/queries/   Consultas tipadas ao Supabase
  validation/         Schemas Zod
  security/           Headers, CSP, logs e redirects
  metadata/           Pipeline protegido de prévias de links
  supabase/           Clientes para browser, servidor e proxy
supabase/
  migrations/         Schema versionado em SQL
  tests/              Testes pgTAP
e2e/                  Testes Playwright
docs/                 Arquitetura e deploy
proxy.ts              Sessão Supabase e nonce CSP por request
```

</details>

## Sobre o projeto

O Muvuca nasceu como estudo de caso de desenvolvimento assistido por IA, com foco
em arquitetura, segurança e fluxo de trabalho com agentes. O projeto usa Next.js,
React, TypeScript e Supabase, com RLS deny-by-default e validação em profundidade.

- [Arquitetura e decisões de segurança](./docs/ARQUITETURA.md)
- [Guia de deploy](./docs/DEPLOY.md)
- [Como contribuir](./CONTRIBUTING.md)
- [Política de segurança](./SECURITY.md)

## Licença

Distribuído sob a [licença MIT](./LICENSE).
