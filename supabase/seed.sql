-- Seed do banco local. Roda a cada `supabase db reset` (config.toml
-- `[db.seed] sql_paths = ["./seed.sql"]`). Nunca roda em produção -- o seed
-- do CLI é local/branch, e o deploy hospedado aplica só as migrations.
--
-- Existe por um motivo: `[auth] enable_signup = false` desliga cadastro em
-- produção, porque o Muvuca é um deploy single-user. Isso é correto lá e
-- fatal em desenvolvimento: `db reset` apaga `auth.users`, e sem cadastro
-- pela tela de login não existe forma de recriar a conta.
--
-- Como usar: entre em /login com o email e a senha abaixo. A senha só existe
-- neste arquivo de seed -- nunca é enviada a produção, nunca sai daqui, e
-- `extensions.crypt`/`gen_salt('bf')` já a grava como hash bcrypt, o mesmo
-- formato que o GoTrue lê de `encrypted_password`.
--
-- O endereço é deliberadamente genérico (`.local`, reservado pela RFC 6762):
-- nenhum email real entra num arquivo versionado, e o domínio não resolve.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
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
  extensions.crypt('muvuca-dev-local', extensions.gen_salt('bf')),
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
