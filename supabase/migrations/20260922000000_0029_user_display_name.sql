-- Como o usuário quer ser chamado (AAA-216). Mora em user_preferences, não
-- em auth.users.raw_user_meta_data: o metadata só chega ao app pelo JWT,
-- que fica velho até o próximo refresh, e não aceita constraint.
--
-- null = não definido; a UI cai no nome do provedor ou no email.
-- RLS e grants de 0014/0020 já cobrem a coluna nova; reset_account() apaga
-- a linha inteira, então o nome volta a null junto com o tema.

alter table public.user_preferences
  add column display_name text,
  add constraint user_preferences_display_name_valid check (
    display_name is null
    or (
      char_length(display_name) between 1 and 50
      and display_name = btrim(display_name)
      and display_name !~ '[[:cntrl:]]'
    )
  );
