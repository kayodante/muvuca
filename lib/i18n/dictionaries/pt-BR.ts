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
    // Verbos realmente compartilhados entre items/ e spotlight/ (>= 2
    // ocorrências idênticas). Frases compostas ("Salvar alterações",
    // "Excluir item") ficam nos grupos que as usam, não aqui.
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Excluir",
    tryAgain: "Tentar novamente",
    // Accessible name do botão "X" de fechar em Dialog/Sheet.
    close: "Fechar",
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
      nameLabel: "Como quer ser chamado",
      // Sem o ponto final: o JSX encaixa `{fallbackName}.` logo depois.
      hint: "Aparece no menu da conta. Deixe em branco para usar",
      save: "Salvar",
      saving: "Salvando...",
      saved: "Nome salvo.",
      removed: "Nome removido.",
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
      resetAccount: {
        cardHeading: "Começar do zero",
        cardDescription:
          "Apaga permanentemente todos os seus links, prompts e tags. Sua conta fica como se tivesse acabado de ser criada.",
        confirmTitle: "Apagar todos os dados?",
        // Dividido em prefixo/sufixo (não uma única string interpolada) para
        // o JSX poder envolver a frase de confirmação em <strong>.
        confirmDescriptionPrefix:
          "Esta ação remove todos os seus links, prompts, tags e preferências. Não pode ser desfeita. Digite",
        confirmDescriptionSuffix: "para confirmar.",
        confirmInputLabel: (phrase: string) =>
          `Digite ${phrase} para confirmar`,
        confirmButton: "Apagar tudo",
        deleting: "Apagando...",
        // Comparado literalmente contra o texto digitado -- precisa
        // permanecer em maiúsculas em ambos os idiomas.
        confirmPhrase: "APAGAR",
        success: "Sua conta foi zerada.",
      },
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
    breadcrumb: {
      ariaLabel: "Caminho da tag",
      root: "Tags",
      hiddenAncestors: (names: string) => `Tags intermediárias: ${names}`,
    },
    editor: {
      createTitle: "Nova tag",
      editTitle: "Editar tag",
      createDescription:
        "Tags ajudam a organizar e reencontrar itens da biblioteca.",
      editDescription: "As associações existentes com itens são preservadas.",
      nameLabel: "Nome",
      descriptionLabel: "Descrição",
      optional: "(opcional)",
      colorLabel: "Cor",
      parentLabel: "Tag pai",
      noParent: "Nenhuma (tag raiz)",
      createButton: "Criar tag",
      saveButton: "Salvar alterações",
      // Único rótulo de pendência para criar e editar: a janela de
      // pendência dura menos de um segundo, não justifica duas strings.
      saving: "Salvando...",
      created: "Tag criada.",
      updated: "Tag atualizada.",
    },
    deleteDialog: {
      title: (name: string) => `Excluir “${name}”?`,
      description: (name: string) =>
        `As tags filhas diretas passam a ficar sob a tag pai de “${name}” (ou viram tags raiz, se “${name}” já era raiz). Os itens associados não são excluídos -- apenas perdem a associação com esta tag.`,
      confirm: "Excluir tag",
      deleting: "Excluindo...",
      deleted: "Tag excluída.",
    },
    tree: {
      collapse: (name: string) => `Recolher ${name}`,
      expand: (name: string) => `Expandir ${name}`,
      actions: (name: string) => `Ações da tag ${name}`,
      createChild: "Criar tag filha",
    },
    page: {
      heading: "Tags",
      createTag: "Criar tag",
      emptyTitle: "Nenhuma tag ainda",
      emptyDescription:
        "Crie tags para organizar sua biblioteca em hierarquias, como Skills → Design → Dev.",
      filterLabel: "Filtrar tags por nome",
      treeRegionLabel: "Árvore de tags",
      noneFound: (query: string) => `Nenhuma tag encontrada para “${query}”.`,
      clearSearch: "Limpar busca",
    },
    detail: {
      headingPrefix: "Sua Muvuca em",
      itemsLabel: "itens",
      subtagsLabel: "subtags",
      emptyItemsTitle: "Nenhum item nesta tag",
      emptyItemsDescription:
        "Itens associados a esta tag e às tags filhas aparecem aqui.",
    },
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
    dialog: {
      title: "Importar favoritos",
      description:
        "O arquivo é lido somente neste navegador. Nenhuma URL será acessada.",
      selectFile: "Selecione um arquivo .html de até 10 MB",
      counts: {
        folders: "Pastas",
        validLinks: "Links válidos",
        alreadyInLibrary: "Já na biblioteca",
        duplicatesInFile: "Repetidos no arquivo",
        ignored: "Ignorados",
      },
      importingAria: "Importando favoritos",
      importingBatch: (current: number, total: number) =>
        `Importando lote ${current} de ${total}...`,
      progressAria: "Progresso da importação",
      processedOf: (processed: number, total: number) =>
        `${processed} de ${total} favoritos processados`,
      proposedStructure: "Estrutura proposta",
      flattenedFolders: (n: number) =>
        `${n} pasta(s) foram achatadas no sexto nível.`,
      catalogedBadge: "acervo catalogado",
      resultNone: "Nenhum link novo precisou ser adicionado à sua biblioteca.",
      resultOne: "1 novo link e sua estrutura de tags foram organizados.",
      resultMany: (count: number, locale: string) =>
        `${count.toLocaleString(locale)} novos links e a estrutura de pastas foram organizados.`,
      resultCounts: {
        itemsImported: "Itens importados",
        tagsCreated: "Tags criadas",
        associationsCreated: "Associações de tag",
        alreadyInLibrary: "Já estavam na biblioteca",
        duplicatesInFile: "Repetidos no arquivo",
        errorsIgnored: "Erros ignorados",
      },
      previewsNote:
        "As prévias de link (miniatura, favicon, título e descrição remotos) carregam em segundo plano.",
      chooseAnother: "Escolher outro",
      importing: "Importando...",
      confirmImport: "Confirmar importação",
      done: "Concluir",
      imported: "Favoritos importados.",
      batchError: (
        batch: number,
        total: number,
        message: string,
        imported: number,
      ) =>
        `Erro ao importar lote ${batch} de ${total}: ${message}. Foram importados ${imported} links antes da falha.`,
    },
  },
  auth: {
    login: {
      linkSentBadge: "LINK ENVIADO",
      checkEmailTitle: "Verifique seu email",
      checkEmailBody:
        "Se esse email tiver uma conta, enviamos um link de acesso. Confira sua caixa de entrada.",
      useAnotherEmail: "Usar outro email",
      resendHint:
        "Não recebeu? Verifique a pasta de spam. O Muvuca ainda não está aceitando novas contas, então emails sem cadastro não recebem link.",
      personalLibraryBadge: "BIBLIOTECA PESSOAL",
      pitch:
        "Salve links e prompts, organize por tags aninhadas e reencontre tudo em segundos.",
      emailLabel: "Email",
      emailPlaceholder: "voce@email.com",
      sendingLink: "Enviando link de acesso",
      sendLink: "Enviar link de acesso",
      passwordlessHint:
        "Sem senha — enviamos um link de acesso por email. O Muvuca ainda não está aceitando novas contas.",
    },
    loginFailedMessage:
      "Não foi possível concluir o login. O link pode ter expirado ou já ter sido usado. Solicite um novo link abaixo.",
    signOut: {
      pending: "Saindo da conta",
      label: "Sair",
    },
  },
  shell: {
    nav: {
      ariaLabel: "Navegação principal",
      allItems: "Todos os itens",
    },
    sidebarToggle: {
      expand: "Expandir barra lateral",
      collapse: "Recolher barra lateral",
    },
    userMenu: {
      fallbackName: "Usuário",
      tags: "Tags",
      importBookmarks: "Importar favoritos",
      settings: "Configurações",
    },
    topbar: {
      createItem: "Criar item",
    },
    mobileNav: {
      openLabel: "Abrir navegação",
      title: "Navegação",
    },
    search: {
      placeholder: "Buscar na biblioteca",
      openSpotlight: "Abrir busca rápida (Spotlight)",
      clear: "Limpar busca",
      searching: "Pesquisando…",
    },
    tagNav: {
      heading: "Tags",
      searchPlaceholder: "Buscar tags",
      searchAriaLabel: "Buscar tags por nome",
      noneFound: (query: string) => `Nenhuma tag encontrada para “${query}”.`,
    },
    loading: {
      library: "Carregando biblioteca",
      tag: "Carregando tag",
      tags: "Carregando tags",
    },
  },
  items: {
    card: {
      types: {
        link: {
          label: "link",
          hint: "Um conteúdo salvo da web para acessar depois.",
        },
        prompt: {
          label: "prompt",
          hint: "Um prompt salvo para usar novamente com IA.",
        },
        code_component: {
          label: "code",
          hint: "Um código ou snippet para consultar e reutilizar.",
        },
      },
      loadingItem: "Carregando item",
      openLinkNewTab: "Abrir link em nova aba",
      openLink: "Abrir link",
      viewFullContent: "Ver conteúdo completo",
      viewFullCode: "Ver código completo",
      copyPrompt: "Copiar prompt",
      copyCode: "Copiar código",
      copyLink: "Copiar link",
      copied: "Copiado!",
      refreshPreview: "Atualizar prévia",
      itemActions: (title: string) => `Ações de ${title}`,
      invalidLink: "Link inválido",
      hiddenTagsLabel: (count: number, names: string) =>
        `Mais ${count} ${count === 1 ? "tag" : "tags"}: ${names}`,
      promptCopied: "Prompt copiado para a área de transferência.",
      codeCopied: "Código copiado para a área de transferência.",
      promptCopyFailed: "Não foi possível copiar o prompt.",
      codeCopyFailed: "Não foi possível copiar o código.",
      linkCopied: "Link copiado para a área de transferência.",
      linkCopyFailed: "Não foi possível copiar o link.",
      brokenLink: "Link indisponível",
      previewUnavailable: "Prévia indisponível",
    },
    promptContentPanel: {
      lineCount: (n: number) =>
        `${n.toLocaleString("pt-BR")} ${n === 1 ? "linha" : "linhas"}`,
      charCount: (n: number) =>
        `${n.toLocaleString("pt-BR")} ${n === 1 ? "caractere" : "caracteres"}`,
    },
    codeSnippetEmbed: {
      copyCode: "Copiar código",
      codeCopied: "Código copiado para a área de transferência.",
      codeCopyFailed: "Não foi possível copiar o código.",
      lineCount: (n: number) =>
        `${n.toLocaleString("pt-BR")} ${n === 1 ? "linha" : "linhas"}`,
      charCount: (n: number) =>
        `${n.toLocaleString("pt-BR")} ${n === 1 ? "caractere" : "caracteres"}`,
    },
    deleteDialog: {
      title: (name: string) => `Excluir “${name}”?`,
      description:
        "Esta ação remove o item e suas associações com tags. Não pode ser desfeita.",
      confirm: "Excluir item",
      deleted: "Item excluído.",
    },
    editor: {
      types: {
        link: "Link",
        prompt: "Prompt",
        code_component: "Componente de código",
      },
      typeFieldsetLabel: "Tipo do item",
      editTitle: "Editar item",
      createTitle: "Novo item",
      dialogDescription:
        "Links, prompts e componentes ficam privados na sua biblioteca.",
      fields: {
        title: "Título",
        content: "Conteúdo",
        code: "Código",
        language: "Linguagem (opcional)",
        sourceLink: "Link da fonte (opcional)",
        description: "Descrição (opcional)",
        tags: "Tags (opcional)",
      },
      urlPlaceholder: "https://exemplo.com",
      codePlaceholder: "Cole o código do componente aqui...",
      codeUrlPlaceholder: "https://exemplo.com/componente",
      charCounter: (count: number) =>
        `${count.toLocaleString("pt-BR")} / ${(100000).toLocaleString("pt-BR")} caracteres`,
      plainText: "Texto puro",
      tagsLoading: "Carregando tags...",
      tagsLoadFailedLabel: "Não foi possível carregar as tags",
      tagsEmptyHint: "Crie tags na seção Tags para organizar seus itens.",
      tagsSelectHint: "Selecione uma ou mais tags para organizar o item.",
      itemUpdated: "Item atualizado.",
      itemCreated: "Item criado.",
      saveChanges: "Salvar alterações",
      createItem: "Criar item",
    },
    promptDetail: {
      openSource: "Abrir fonte original",
      editComponent: "Editar componente",
      editPrompt: "Editar prompt",
      copyCode: "Copiar código",
      copyPrompt: "Copiar prompt",
      copyingCode: "Copiando código",
      copyingPrompt: "Copiando prompt",
      codeCopiedLabel: "Código copiado!",
      promptCopiedLabel: "Prompt copiado!",
      codeCopiedMessage: "Código copiado para a área de transferência.",
      promptCopiedMessage: "Prompt copiado para a área de transferência.",
      codeCopyFailed: "Não foi possível copiar o código.",
      promptCopyFailed: "Não foi possível copiar o prompt.",
    },
    toolbar: {
      sectionLabel: "Filtros e ordenação",
      typeFilterLabel: "Filtrar por tipo",
      sortAriaLabel: "Ordenar itens",
      sortLabels: {
        newest: "Mais recentes",
        oldest: "Mais antigos",
        title_asc: "Título A–Z",
        title_desc: "Título Z–A",
        updated: "Atualizados recentemente",
      },
      typeTabs: {
        all: "Tudo",
        link: "Link",
        prompt: "Prompt",
        code: "Code",
      },
      refreshing: "Atualizando",
      refreshed: "Atualizado",
      refreshPreviews: "Atualizar pré-visualizações",
      loadingItem: "Carregando item…",
    },
    page: {
      defaultTitle: "Seus itens",
      emptyTitle: "Sua biblioteca está vazia",
      emptyDescription:
        "Salve um link, prompt ou componente para começar sua coleção.",
      noResultsTitle: "Nenhum resultado",
      noResultsDescription: "Tente ajustar a busca ou remover um filtro.",
      clearFilters: "Limpar filtros",
      importBookmarks: "Importar favoritos",
      paginationLabel: "Paginação",
      previousPage: "Página anterior",
      nextPage: "Próxima página",
      previewRefreshRequested: "Atualização da prévia solicitada.",
    },
    tagSelect: {
      placeholder: "Selecionar tags...",
      emptyLabel: "Nenhuma tag cadastrada ainda",
      selectedTagsLabel: "Tags selecionadas",
      removeTag: (name: string) => `Remover tag ${name}`,
      availableTagsLabel: "Tags disponíveis",
      searchPlaceholder: "Buscar tags...",
      noTagsFound: "Nenhuma tag encontrada.",
      selectedCount: (count: number) =>
        `${count} tag${count > 1 ? "s" : ""} selecionada${count > 1 ? "s" : ""}`,
    },
    previewDrain: {
      drainFailed: "Não foi possível drenar as prévias.",
      noPendingPreviews: "Nenhuma prévia pendente nesta página.",
      oneScheduled: "1 prévia será atualizada.",
      manyScheduled: (count: number) => `${count} prévias serão atualizadas.`,
      updateFailed: "Não foi possível atualizar as prévias.",
    },
  },
  spotlight: {
    quickActions: {
      createItem: {
        title: "Criar novo item",
        description: "Adicionar link, prompt ou código à biblioteca",
        keywords: [
          "novo",
          "criar",
          "adicionar",
          "salvar",
          "link",
          "prompt",
          "code",
        ],
      },
      goToLibrary: {
        title: "Ir para Biblioteca",
        description: "Visualizar e navegar por todos os itens salvos",
        keywords: ["biblioteca", "itens", "todos", "home", "galeria"],
      },
      manageTags: {
        title: "Gerenciar tags",
        description: "Organizar hierarquia e cores das tags",
        keywords: ["tag", "tags", "etiquetas", "categorias"],
      },
      settings: {
        title: "Configurações",
        description: "Exportar dados, backup e preferências da conta",
        keywords: ["configurações", "ajustes", "backup", "exportar", "conta"],
      },
      toggleTheme: {
        title: "Alternar tema (Claro / Escuro / Sistema)",
        description: "Mudar a aparência da interface",
        keywords: [
          "tema",
          "escuro",
          "claro",
          "dark",
          "light",
          "aparência",
          "modo",
        ],
      },
    },
    themeChangedDark: "Tema alterado para escuro.",
    themeChangedLight: "Tema alterado para claro.",
    searchPlaceholder: "Buscar links, prompts, código ou ações...",
    searchInputLabel: "Digitar busca",
    dialogLabel: "Muvuca Spotlight — Busca rápida",
    closeSpotlight: "Fechar busca rápida",
    filterByTag: "Filtrar por tag:",
    allTag: "Todas",
    noResults: (query: string) =>
      `Nenhum resultado encontrado para "${query}".`,
    execute: "Executar",
    navigate: "navegar",
    select: "selecionar",
    peek: "espiar",
    close: "fechar",
    spaceKey: "espaço",
    resultCount: (n: number) => `${n} ${n === 1 ? "resultado" : "resultados"}`,
    quickLookAria: "Espiar item (Quick Look)",
    quickLookTitle: "Espiar item (Espaço)",
    open: "Abrir",
    copyShort: "Copiar",
    copiedShort: "Copiado",
    invalidUrl: "URL inválida ou insegura.",
    promptCopiedMessage: "Prompt copiado para a área de transferência.",
    codeCopiedMessage: "Código copiado para a área de transferência.",
    copyContentFailed: "Não foi possível copiar o conteúdo.",
    badges: {
      link: "LINK",
      prompt: "PROMPT",
      code: "CÓDIGO",
    },
    quickLook: {
      regionLabel: "Pré-visualização do item (Quick Look)",
      close: "Fechar pré-visualização",
      openPage: "Abrir página",
      linkCopiedShort: "Link copiado",
      copyLinkShort: "Copiar link",
      copiedShort: "Copiado!",
      copyPrompt: "Copiar prompt",
      copyCode: "Copiar código",
      copyGenericFailed: "Não foi possível copiar.",
      invalidUrl: "URL inválida ou insegura.",
      linkCopiedMessage: "Link copiado para a área de transferência.",
      promptCopiedMessage: "Prompt copiado para a área de transferência.",
      codeCopiedMessage: "Código copiado para a área de transferência.",
    },
  },
  export: {
    heading: "Exportar dados",
    description:
      "Baixe uma cópia completa de todos os seus links, prompts e tags.",
    jsonButton: "Exportar JSON (Completo)",
    htmlButton: "Exportar HTML Bookmarks",
    // `Button`'s own `pendingLabel` becomes the accessible name while
    // `pending`, overriding the button's own visible text -- every button
    // that sets `pending` needs an explicit one, not `Button`'s generic
    // default, so it stays correct in both locales.
    exporting: "Exportando...",
    jsonSuccess: "Backup JSON exportado com sucesso.",
    htmlSuccess: "Favoritos HTML exportados com sucesso.",
  },
  backup: {
    cardHeading: "Restaurar backup",
    cardDescription:
      "Carregue um arquivo JSON exportado do Muvuca para reconstruir links, prompts e tags. Nada do que já existe é apagado.",
    restoreButton: "Restaurar backup JSON",
    dialogTitle: "Restaurar backup",
    dialogDescription:
      "O arquivo é lido somente neste navegador. A restauração apenas acrescenta: nada é apagado nem sobrescrito.",
    selectFile: "Selecione um arquivo .json de até 10 MB",
    fileTooLarge: "O arquivo excede o limite de 10 MB.",
    invalidJson: "Este arquivo não é um JSON válido.",
    incompatibleFile:
      "Este arquivo não é um backup do Muvuca compatível com esta versão.",
    emptyFile:
      "Este arquivo de backup está vazio. Nenhuma alteração será feita na biblioteca.",
    restoring: "Restaurando backup...",
    counts: {
      tags: "Tags",
      items: "Itens",
      ignored: "Ignorados",
    },
    resultCounts: {
      itemsRestored: "Itens restaurados",
      tagsCreated: "Tags criadas",
      alreadyExisted: "Já existiam",
    },
    chooseAnother: "Escolher outro",
    confirmRestore: "Confirmar restauração",
    restoringShort: "Restaurando...",
    done: "Concluir",
    restored: "Backup restaurado.",
  },
  states: {
    error: {
      genericTitle: "Algo deu errado",
      // Copy dos error boundaries de rota (app/**/error.tsx, app/error.tsx,
      // app/not-found.tsx). Vive aqui, não em `errors`, porque `errors` é
      // convencionalmente chave -> string plana (mapTagError em
      // lib/actions/tags.ts indexa `Dictionary["errors"]` esperando sempre
      // `string`); um valor objeto ali quebraria esse contrato de tipo.
      boundary: {
        root: {
          title: "Algo deu errado",
          message: "Não foi possível concluir essa ação. Tente novamente.",
        },
        app: {
          title: "Não foi possível carregar sua conta",
          message: "Tente novamente em alguns segundos.",
        },
        library: {
          title: "Não foi possível abrir a biblioteca",
          message: "Tente carregar seus itens novamente.",
        },
        tag: {
          title: "Não foi possível abrir esta tag",
          message: "Tente carregar a hierarquia e os itens novamente.",
        },
        tags: {
          title: "Não foi possível abrir a lista de tags",
          message: "Tente carregar as tags novamente.",
        },
        notFound: {
          title: "Página não encontrada",
          message: "Verifique o endereço ou volte para a sua biblioteca.",
          backToLibrary: "Ir para a biblioteca",
        },
      },
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
