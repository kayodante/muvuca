import type { TagColorToken } from "@/lib/validation/tag";

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
  tags: {
    // Nomes de cor exibidos no seletor de cor da tag (tooltip + accessible name).
    colors: {
      lime: "Lima",
      chartreuse: "Chartreuse",
      yellow: "Amarelo",
      amber: "Âmbar",
      orange: "Laranja",
      peach: "Pêssego",
      terracotta: "Terracota",
      brown: "Marrom",
      red: "Vermelho",
      rose: "Rosé",
      coral: "Coral",
      pink: "Rosa",
      fuchsia: "Fúcsia",
      purple: "Roxo",
      lavender: "Lavanda",
      violet: "Violeta",
      indigo: "Índigo",
      periwinkle: "Pervinca",
      blue: "Azul",
      sky: "Celeste",
      cyan: "Ciano",
      aqua: "Água",
      teal: "Verde-azulado",
      emerald: "Esmeralda",
      mint: "Menta",
      green: "Verde",
      slate: "Ardósia",
      zinc: "Zinco",
      stone: "Pedra",
    } satisfies Record<TagColorToken, string>,
  },
  bookmarks: {
    errors: {
      invalidFileType: "Selecione um arquivo HTML de favoritos.",
      emptyFile: "O arquivo está vazio.",
      fileTooLarge: "O arquivo deve ter no máximo 10 MB.",
      tooManyBookmarks: (count: string) =>
        `O arquivo possui mais de ${count} favoritos válidos.`,
      tooManyFolders: (count: string) =>
        `O arquivo possui mais de ${count} pastas.`,
      noValidBookmarks: "Nenhum favorito válido foi encontrado.",
    },
  },
  validation: {
    invalid: "Valor inválido.",
    required: "Campo obrigatório.",
    contentRequired: "O conteúdo é obrigatório.",
    validUrlRequired: "Informe uma URL http ou https válida.",
    duplicateTagAssociation: "Uma tag só pode ser associada uma vez.",
    displayNameTooLong: "Use no máximo 50 caracteres.",
    displayNameNoControlChars: "Use só texto, sem quebras de linha.",
    duplicateItemTags: "Tags repetidas no item.",
    duplicateFileTags: "Tags repetidas no arquivo.",
    tagSelfParentInFile: "Uma tag não pode ser pai de si mesma.",
    invalidTagHierarchy: "Hierarquia de tags inválida.",
    itemReferencesMissingTag: "Item referencia uma tag inexistente.",
    duplicatePayloadTags: "Tags repetidas no payload.",
    invalidLinkUrl: "URL do link é inválida.",
    invalidCodeComponentUrl: "URL do code component é inválida.",
    missingItemTagInPayload: "Tag do item ausente no payload.",
    invalidNormalizedUrl: "URL normalizada inválida.",
    duplicateFolders: "Pastas repetidas.",
    invalidFolderHierarchy: "Hierarquia de pastas inválida.",
    invalidBookmarkFolder: "Pasta do favorito inválida.",
  },
  errors: {
    unknown: "Algo deu errado. Tente novamente.",
    invalidInput: "Dados inválidos.",
    operationFailed: "Não foi possível concluir a operação.",
    invalidItem: "Item inválido.",
    itemNotFound: "Item não encontrado.",
    itemOrTagsUnavailable: "Item ou tags não estão disponíveis.",
    itemLoadFailed: "Não foi possível carregar o item.",
    checkItemFields: "Verifique os campos do item.",
    duplicateLink: "Esse link já está na sua biblioteca.",
    invalidItemData: "Dados do item inválidos.",
    invalidTagReference: "Uma ou mais tags são inválidas.",
    tagSelfParent: "A tag não pode ser pai de si mesma.",
    tagCycle: "Esta alteração criaria um ciclo na hierarquia de tags.",
    tagMaxDepth:
      "A hierarquia de tags excede a profundidade máxima de 6 níveis.",
    tagDescendantMaxDepth:
      "Esta alteração excederia a profundidade máxima de 6 níveis para tags descendentes.",
    tagNotFound: "Tag não encontrada.",
    checkTagFields: "Verifique os campos da tag.",
    invalidTag: "Tag inválida.",
    invalidParentTag: "Tag pai inválida.",
    invalidTagData: "Dados da tag inválidos.",
    duplicateTagName: "Já existe uma tag com esse nome nesse nível.",
    duplicateTagNameField:
      "Esse nome já está em uso nesse nível da hierarquia.",
    tagsLoadFailed: "Não foi possível carregar as tags.",
    previewNotFound: "Preview não encontrado.",
    previewUpdateFailed: "Não foi possível atualizar o preview.",
    invalidPreviewScope: "Escopo de prévias inválido.",
    previewRescheduleFailed: "Não foi possível atualizar as prévias.",
    previewJobsLoadFailed: "Não foi possível buscar jobs de preview.",
    accountResetFailed: "Não foi possível apagar os dados da conta.",
    invalidEmail: "Informe um email válido.",
    signOutFailed: "Não foi possível sair. Tente novamente.",
    invalidTheme: "Tema inválido.",
    themeUpdateFailed: "Não foi possível atualizar a aparência.",
    displayNameSaveFailed: "Não foi possível salvar seu nome.",
    backupNeedsRevalidation:
      "O arquivo de backup precisa ser analisado novamente.",
    backupRestoreFailed: "Não foi possível concluir a restauração.",
    backupHierarchyInvalid: "A hierarquia de tags do arquivo é inválida.",
    invalidBookmarks: "Favoritos inválidos.",
    duplicateCheckFailed: "Não foi possível analisar duplicatas.",
    importNeedsRevalidation: "A importação precisa ser analisada novamente.",
    bookmarkImportFailed: "Não foi possível concluir a importação.",
    exportFailed: "Falha ao gerar dados de exportação.",
    spotlightLoadFailed:
      "Não foi possível carregar os dados para a busca rápida.",
    spotlightSearchFailed: "Erro ao pesquisar itens na busca rápida.",
    unreadableFile: "Não foi possível ler este arquivo.",
  },
};

export type Dictionary = typeof ptBR;
