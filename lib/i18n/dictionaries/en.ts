import type { Dictionary } from "./pt-BR";

/**
 * English dictionary. Typed against `Dictionary` so it must match the
 * `pt-BR` shape exactly — a missing or extra key fails `tsc`.
 */
export const en: Dictionary = {
  common: {
    localeNames: {
      "pt-BR": "Português (Brasil)",
      en: "English",
    },
  },
  metadata: {
    title: "Muvuca",
    description: "Personal library for links and prompts.",
  },
  settings: {
    title: "Settings",
    subtitle: "Manage your library and your session.",
    profile: {
      heading: "Profile",
      description: "How Muvuca refers to you.",
      fallbackName: "User",
    },
    appearance: {
      heading: "Appearance",
      description: "Choose how Muvuca follows your color preference.",
      themeLabel: "Theme",
      themeHint: "System is the default for new accounts.",
      themeAriaLabel: (label: string) => `Theme: ${label}`,
      themeOptions: {
        system: "System",
        light: "Light",
        dark: "Dark",
      },
    },
    language: {
      heading: "Language",
      description: "Choose the language of the Muvuca interface.",
      label: "Language",
      hint: "If not saved, we follow your browser's language.",
      ariaLabel: (label: string) => `Language: ${label}`,
      saved: "Language saved.",
    },
    data: {
      heading: "Data & Privacy",
      description: "Back up your library for full portability.",
    },
    account: {
      heading: "Account",
      description: "Your session uses magic link sign-in.",
      emailLabel: "Email",
      emailUnavailable: "Email unavailable",
    },
    danger: {
      heading: "Danger zone",
      description: "Destructive, irreversible actions.",
    },
  },
  validation: {
    invalid: "Invalid value.",
    required: "Required field.",
  },
  errors: {
    unknown: "Something went wrong. Please try again.",
    invalidInput: "Invalid input.",
  },
};
