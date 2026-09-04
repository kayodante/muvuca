# Deploy

O Muvuca é agnóstico de hospedagem: qualquer ambiente que rode Node.js (ou
um container Docker) e tenha acesso a um projeto Supabase serve. Este
documento cobre as duas rotas suportadas: build direto com pnpm, e imagem
Docker a partir do output `standalone` do Next.js.

## Pré-requisitos

- Um projeto Supabase (local, self-hosted, ou o Supabase Cloud) com as
  migrations de `supabase/migrations/` aplicadas.
- As três variáveis de ambiente públicas descritas em `.env.example`.

## 1. Aplicar as migrations no projeto Supabase de destino

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Isso aplica, em ordem, todas as migrations versionadas em
`supabase/migrations/`. Não há passo manual de schema fora disso.

## 2. Build + start com pnpm

```bash
pnpm install --frozen-lockfile
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
NEXT_PUBLIC_APP_URL=... \
  pnpm build

pnpm start
```

As três variáveis `NEXT_PUBLIC_*` são inlined no bundle em tempo de build
(comportamento padrão do Next.js para variáveis com esse prefixo) — build e
start precisam usar os mesmos valores, e o valor de `NEXT_PUBLIC_APP_URL`
precisa ser a URL pública real onde a aplicação vai ficar disponível (usada
para montar o link de confirmação do magic link).

Isso funciona em qualquer plataforma que rode `pnpm build` seguido de
`pnpm start` sobre Node.js — não há dependência de nenhum provedor
específico.

## 3. Build com Docker (output standalone)

O output `standalone` do Next.js empacota só o subconjunto de
`node_modules` que o servidor realmente usa em `.next/standalone` — mas
`next start` (usado na rota 2 acima) não roda contra esse output, então
`next.config.ts` só o liga quando a variável `BUILD_STANDALONE=1` está
presente no build. O `Dockerfile` na raiz do projeto define essa variável
internamente antes de rodar `pnpm build`; você não precisa (nem deve)
setá-la para o `pnpm build` + `pnpm start` normal:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  --build-arg NEXT_PUBLIC_APP_URL=... \
  -t muvuca .

docker run -p 3000:3000 muvuca
```

Como as variáveis `NEXT_PUBLIC_*` são inlined em build time, elas precisam
ser passadas como `--build-arg` na hora do `docker build`, não só no
`docker run`. A imagem final:

- copia `.next/standalone` (servidor + dependências mínimas),
- copia `.next/static` (assets estáticos com hash, servidos pelo próprio
  Next.js standalone),
- copia `public/` (favicon, ícones, imagens da marca),
- roda como usuário não-root (`nextjs`, uid 1001).

## 4. Pós-deploy

- Confirme que o primeiro usuário existe no projeto Supabase de destino: o
  formulário de login nunca cria conta nova (`shouldCreateUser: false`, veja
  `lib/actions/auth.ts`) — o Muvuca é pensado para deploy single-user, então
  a conta precisa existir antes do primeiro acesso (convite via painel do
  Supabase, ou `supabase/seed.sql` como referência para um ambiente próprio).
- Configure a allow-list de redirect de Auth do seu projeto Supabase
  (`additional_redirect_urls` no equivalente hospedado de
  `supabase/config.toml`) para incluir `NEXT_PUBLIC_APP_URL` +
  `/auth/confirm`.
