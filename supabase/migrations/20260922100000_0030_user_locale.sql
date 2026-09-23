-- Idioma escolhido pelo usuário (AAA-215). Mora em user_preferences, junto
-- de theme/display_name, não em auth.users.raw_user_meta_data -- pelo mesmo
-- motivo da 0029: o metadata só chega ao app pelo JWT, que fica velho até o
-- próximo refresh, e não aceita constraint.
--
-- null = não definido; a UI cai no cookie `muvuca-locale` ou no
-- Accept-Language do navegador (lib/i18n/config.ts:resolveLocale).
-- RLS e grants de 0014/0020 já cobrem a coluna nova; reset_account() apaga
-- a linha inteira, então o idioma salvo volta a null junto com o tema.

alter table public.user_preferences
  add column locale text,
  add constraint user_preferences_locale_allowed check (
    locale is null or locale in ('pt-BR', 'en')
  );
