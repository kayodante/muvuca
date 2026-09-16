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

### Antes: exportar um backup

Numa atualização de uma instância que já tem dados, exporte antes de aplicar
qualquer migration: **Configurações → Exportar dados → Exportar JSON
(Completo)**. Guarde o arquivo até confirmar que a versão nova subiu
funcionando.

O passo não é cerimônia. `supabase db push` é irreversível na prática, e o
Supabase Free Tier não tem PITR nem backup automático — se uma migration
destruir dados, o JSON exportado é a única volta. Ele restaura pela própria
tela de importação, e `lib/backup/validation.ts` aceita todos os formatos já
emitidos (1.0, 1.1 e 1.2), inclusive um arquivo mais antigo que a versão
instalada.

### Aplicar

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Isso aplica, em ordem, **apenas as migrations ainda não aplicadas** no projeto
remoto, comparando `supabase/migrations/` com o histórico já registrado lá.
Não há passo manual de schema fora disso.

> **Nunca rode `supabase db reset` contra um projeto com dados reais.** Esse
> comando recria o banco do zero e reaplica migrations mais o seed; ele existe
> para a máquina de desenvolvimento e para o stack efêmero do CI, onde os
> dados são descartáveis. Atualizar uma instância em uso é sempre `db push`.

As migrations deste repo são aditivas por padrão, e
`__tests__/migrations-destructive.test.ts` falha o CI se alguma passar a
apagar dados sem que o autor declare a intenção no próprio arquivo.

### Automatizando o passo (opcional)

O passo acima é manual de propósito — este documento vale para qualquer
hospedagem. No repositório canônico ele é feito pelo job `migrate` do
`.github/workflows/ci.yml`: num push para `main`, depois de `quality` e
`integration` passarem, ele roda `supabase db push` contra o projeto de
produção. O job exige aprovação manual pelo environment `Production` do
GitHub, justamente pelo motivo da seção anterior, e depende de três secrets
nesse environment: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` e
`SUPABASE_PROJECT_REF`.

Um fork não dispara esse job (ele checa o nome do repositório); para
adotá-lo, aponte essa checagem para o seu repositório e crie os secrets.
O deploy do app é independente desse job, então a ordem entre os dois não é
garantida: prefira migrations aditivas, que toleram uma janela curta de
código novo sobre o schema anterior.

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
