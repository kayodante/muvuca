/**
 * Portuguese (Brazil) dictionary — the product default and the type source
 * of truth. `en.ts` is typed against `Dictionary` (`typeof ptBR`), so a
 * missing or extra key there is a `tsc` error, not a silent runtime gap.
 *
 * Grouped by app area (`common`, `metadata`, `settings`, ...); access is
 * always a direct property path (`t.settings.title`), never `t("a.b")`
 * with a string. A value can be a plain string or a function returning one,
 * for interpolation (e.g. `themeAriaLabel(label)`).
 */
export const ptBR = {
  common: {
    // Nome de cada idioma no próprio idioma, para o seletor de idioma: o
    // usuário reconhece a opção mesmo sem entender a UI atual.
    localeNames: {
      "pt-BR": "Português (Brasil)",
      en: "English",
    },
  },
  metadata: {
    title: "Muvuca",
    description: "Biblioteca pessoal de links e prompts.",
  },
  settings: {
    title: "Configurações",
    subtitle: "Ajustes da sua biblioteca e da sua sessão.",
    profile: {
      heading: "Perfil",
      description: "Como o Muvuca se refere a você.",
      fallbackName: "Usuário",
    },
    appearance: {
      heading: "Aparência",
      description: "Escolha como o Muvuca acompanha sua preferência de cor.",
      themeLabel: "Tema",
      themeHint: "Sistema é o padrão para novas contas.",
      themeAriaLabel: (label: string) => `Tema: ${label}`,
      themeOptions: {
        system: "Sistema",
        light: "Claro",
        dark: "Escuro",
      },
    },
    language: {
      heading: "Idioma",
      description: "Escolha o idioma da interface do Muvuca.",
      label: "Idioma",
      hint: "Se não for salvo, seguimos o idioma do seu navegador.",
      ariaLabel: (label: string) => `Idioma: ${label}`,
      saved: "Idioma salvo.",
    },
    data: {
      heading: "Dados e Privacidade",
      description: "Faça backup do seu acervo para portabilidade total.",
    },
    account: {
      heading: "Conta",
      description: "Sua sessão usa acesso por link mágico.",
      emailLabel: "Email",
      emailUnavailable: "Email não disponível",
    },
    danger: {
      heading: "Zona de perigo",
      description: "Ações destrutivas e irreversíveis.",
    },
  },
  validation: {
    invalid: "Valor inválido.",
    required: "Campo obrigatório.",
  },
  errors: {
    unknown: "Algo deu errado. Tente novamente.",
    invalidInput: "Dados inválidos.",
  },
};

export type Dictionary = typeof ptBR;
