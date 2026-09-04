-- Seed do banco local. Roda a cada `supabase db reset` (config.toml
-- `[db.seed] sql_paths = ["./seed.sql"]`). Nunca roda em produção -- o seed
-- do CLI é local/branch, e o deploy hospedado aplica só as migrations.
--
-- Existe por um motivo: `lib/actions/auth.ts` passa `shouldCreateUser: false`
-- e `[auth] enable_signup = false` desliga cadastro, porque o Muvuca é um
-- deploy single-user. Isso é correto em produção e fatal em desenvolvimento:
-- `db reset` apaga `auth.users`, e sem cadastro pela tela de login não existe
-- forma de recriar a conta -- o magic link responde
-- `422 otp_disabled / "Signups not allowed for otp"` e ninguém entra.
--
-- Como usar: peça o link em /login com o email abaixo e abra o Inbucket em
-- http://127.0.0.1:54324 para pegá-lo. Nenhuma senha é criada porque o único
-- fluxo de entrada é magic link.
--
-- O endereço é deliberadamente genérico (`.local`, reservado pela RFC 6762):
-- nenhum email real entra num arquivo versionado, e o domínio não resolve.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  -- Estas quatro colunas são nuláveis no schema e NÃO têm default, mas o
  -- GoTrue lê cada uma para uma string Go não-nulável. Deixá-las em NULL
  -- derruba o login inteiro com
  -- `500 unexpected_failure / "Database error finding user"`, cuja causa real
  -- só aparece no log do container:
  -- `Scan error on column index 3, name "confirmation_token":
  --  converting NULL to string is unsupported`.
  -- As demais colunas de token (`phone_change`, `phone_change_token`,
  -- `email_change_token_current`, `reauthentication_token`) já têm `''` como
  -- default e por isso ficam de fora.
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dev@muvuca.local',
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- O GoTrue exige uma identidade `email` correspondente; sem ela o usuário
-- existe mas o provider não o reconhece. `provider_id` é o próprio id como
-- texto, que é o formato que o GoTrue grava para o provider `email`.
insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub": "00000000-0000-4000-8000-000000000001", "email": "dev@muvuca.local"}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;
