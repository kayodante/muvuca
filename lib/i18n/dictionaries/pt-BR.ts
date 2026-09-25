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
    // `pendingLabel` genérico para Button quando não há um verbo específico
    // da ação (o botão já tem `aria-label` próprio nesses casos, então isto
    // é o fallback de reserva, não o texto normalmente visto).
    loading: "Carregando",
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
      hiddenAncestors: (names: string) => `Tags intermediárias: ${names}`,
    },
    editor: {
      createTitle: "Nova tag",
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
      select: "Selecionar",
      cancelSelection: "Cancelar seleção",
    },
    detail: {
      headingPrefix: "Sua Muvuca em",
      itemsLabel: "itens",
      subtagsLabel: "subtags",
      emptyItemsTitle: "Nenhum item nesta tag",
      emptyItemsDescription:
        "Itens associados a esta tag e às tags filhas aparecem aqui.",
      editTag: "Editar tag",
    },
    inspector: {
      emptyTitle: "Nenhuma tag selecionada",
      emptyDescription:
        "Escolha uma tag na árvore para editar nome, cor, tag pai e descrição.",
      pathLabel: "Caminho",
      children: "Tags filhas",
      noChildren: "Nenhuma tag filha.",
      addChild: "Nova tag filha",
      maxDepthReached: "Limite de 6 níveis atingido.",
      openItems: "Abrir itens",
      moreActions: (name: string) => `Mais ações para ${name}`,
      discardTitle: "Descartar alterações?",
      discardDescription: "As alterações não salvas nesta tag serão perdidas.",
      discardConfirm: "Descartar",
      keepEditing: "Continuar editando",
    },
    bulk: {
      panelLabel: "Ações em lote",
      noneSelected: "Marque as tags que quer mover ou excluir.",
      selectedCount: (n: number) =>
        n === 1 ? "1 tag selecionada" : `${n} tags selecionadas`,
      move: "Mover para…",
      delete: "Excluir",
      moveTitle: (n: number) => (n === 1 ? "Mover 1 tag" : `Mover ${n} tags`),
      moveDescription: "Cada tag leva junto as próprias filhas.",
      destinationLabel: "Destino",
      chooseDestination: "Escolha o destino",
      includedByParent: (n: number) =>
        n === 1
          ? "1 tag já vai junto com a tag mãe."
          : `${n} tags já vão junto com as tags mães.`,
      nameCollision: (names: string) =>
        `Já existe uma tag com o nome de ${names} nesse destino. Renomeie antes de mover.`,
      moveConfirm: "Mover",
      moving: "Movendo...",
      moved: (n: number) => (n === 1 ? "1 tag movida." : `${n} tags movidas.`),
      deleteTitle: (n: number) =>
        n === 1 ? "Excluir 1 tag?" : `Excluir ${n} tags?`,
      deleteDescription:
        "As tags filhas que não estiverem selecionadas passam a ficar sob o ancestral mais próximo que continuar existindo. Os itens associados não são excluídos.",
      deleteConfirm: "Excluir tags",
      deleteOverCap: "Excluir aceita até 500 tags por vez.",
      deleting: "Excluindo...",
      deleted: (n: number) =>
        n === 1 ? "1 tag excluída." : `${n} tags excluídas.`,
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
      personalLibraryBadge: "BIBLIOTECA PESSOAL",
      pitch:
        "Salve links e prompts, organize por tags aninhadas e reencontre tudo em segundos.",
      emailLabel: "Email",
      emailPlaceholder: "voce@email.com",
      passwordLabel: "Senha",
      signIn: "Entrar",
      signingIn: "Entrando",
      noSignupHint: "O Muvuca ainda não está aceitando novas contas.",
      forgotPasswordLink: "Esqueci a senha",
    },
    // Card mostrado quando o link de callback (`/auth/confirm`) falha --
    // cobre tanto um link expirado/reusado quanto um link de recuperação de
    // senha inválido, já que os dois passam pela mesma rota de callback.
    loginFailedMessage:
      'Não foi possível validar o link. Ele pode ter expirado ou já ter sido usado. Peça um novo em "Esqueci a senha".',
    signOut: {
      pending: "Saindo da conta",
      label: "Sair",
    },
    forgotPassword: {
      badge: "RECUPERAR ACESSO",
      title: "Esqueci a senha",
      pitch:
        "Informe seu email e, se houver uma conta, enviamos um link para redefinir sua senha.",
      submit: "Enviar link de redefinição",
      sending: "Enviando link",
      linkSentBadge: "LINK ENVIADO",
      checkEmailTitle: "Verifique seu email",
      checkEmailBody:
        "Se esse email tiver uma conta, enviamos um link para redefinir a senha.",
      useAnotherEmail: "Usar outro email",
      resendHint: "Não recebeu? Verifique a pasta de spam.",
      backToLogin: "Voltar para o login",
    },
    resetPassword: {
      badge: "NOVA SENHA",
      title: "Defina sua nova senha",
      passwordLabel: "Nova senha",
      confirmPasswordLabel: "Confirmar nova senha",
      passwordHint: "Mínimo de 12 caracteres.",
      submit: "Salvar nova senha",
      saving: "Salvando",
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
      // `pendingLabel` dos botões de copiar (aria-label já cobre o estado
      // normal; usado quando `pending` está true).
      copyingPrompt: "Copiando prompt",
      copyingCode: "Copiando código",
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
      deleting: "Excluindo...",
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
      saving: "Salvando...",
      creating: "Criando...",
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
      refreshPreviews: "Atualizar pré-visualizações",
      loadingItem: "Carregando item…",
      updatingResults: "Atualizando resultados…",
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
    passwordMismatch: "As senhas não coincidem.",
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
    tagBatchInvalid: "Selecione entre 1 e 500 tags.",
    tagMoveNameCollision:
      "Uma das tags tem o mesmo nome de outra tag no destino.",
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
    invalidCredentials: "Email ou senha inválidos.",
    tooManyAttempts:
      "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    signOutFailed: "Não foi possível sair. Tente novamente.",
    recoverySessionExpired:
      'Sua sessão de redefinição expirou ou é inválida. Peça um novo link em "Esqueci a senha".',
    passwordSameAsCurrent: "A nova senha precisa ser diferente da atual.",
    weakPassword: "Essa senha é muito fraca. Escolha uma senha mais forte.",
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
  // Copy da landing (`components/landing/**`, `lib/landing/demo-data.ts`).
  // `demo` guarda o texto dos itens/tags fictícios do acervo de demonstração
  // usados em várias seções (Hero, Gallery, TagRollup, SearchDemo,
  // CommandPalette); os IDs e cores continuam em `lib/landing/demo-data.ts`.
  landing: {
    skipToContent: "Pular para o conteúdo principal",
    common: {
      getStarted: "Começar",
      seeHow: "Ver como funciona",
      login: "Entrar",
      library: "Biblioteca",
    },
    nav: {
      home: "Início",
      overview: "Visão geral",
      tags: "Tags",
      search: "Busca",
      import: "Importação",
    },
    header: {
      navAriaLabel: "Navegação Principal",
      mobileNavAriaLabel: "Navegação Mobile",
      openSpotlight: "Abrir Spotlight",
      openSearchMobile: "Abrir busca rápida",
      openMenu: "Abrir menu de navegação",
      menuTitle: "Menu de navegação",
      menuDescription: "Links e ações da landing page",
    },
    demo: {
      promptCopied: "Prompt copiado.",
      copyPrompt: "Copiar prompt",
      copy: "Copiar",
      copied: "Copiado",
      promptBadge: "PROMPT",
      openItem: (title: string) => `Abrir ${title}`,
      openItemNewTab: (title: string) => `Abrir ${title} em nova aba`,
      tags: {
        skills: "Skills",
        design: "Design",
        branding: "Branding",
        productDesign: "Product Design",
        desenvolvimento: "Desenvolvimento",
        frontend: "Front-end",
        ia: "IA & Prompts",
        produtividade: "Produtividade",
        referencias: "Referências",
        artigos: "Artigos",
      },
      items: {
        item1: {
          title: "Linear — Issue tracking for high-velocity teams",
          description:
            "Referência de interface densa com navegação por teclado e performance de resposta em milissegundos.",
        },
        item2: {
          title: "System Prompt: Senior Code Reviewer",
          description:
            "Auditoria com foco em integridade de banco de dados, RLS e ausência de any.",
          contentPreview:
            "Atue como um Senior Code Reviewer. Analise o diff priorizando: 1. Segurança e RLS; 2. Tipagem estrita sem any; 3. Acessibilidade WCAG AA; 4. Queries parametrizadas.",
        },
        item3: {
          title: "Minimal Gallery — Curated web design inspiration",
          description:
            "Diretório curado com foco em grid editorial, tipografia precisa e microinterações elegantes.",
        },
        item4: {
          title: "Refatoração de Componentes Acessíveis",
          description:
            "Guia de boas práticas para garantir navegação por teclado e conformidade WCAG 2.2 AA.",
          contentPreview:
            "Substitua divs clicáveis por <button>, garanta aria-label em botões de ícone e associe mensagens de erro com aria-describedby.",
        },
        item5: {
          title: "Tailwind CSS v4 Documentation",
          description:
            "Guia completo da nova engine CSS baseada em variáveis nativas e cascade layers.",
        },
        item6: {
          title: "Token Terminal — Financial metrics for crypto",
          description:
            "Referência de grid com hairlines de 1px, tipografia Geist Mono e composição densa e calma.",
        },
        item7: {
          title: "Extrator de DTO Puro de Bookmarks",
          description:
            "Algoritmo seguro para parsing de arquivo Netscape Bookmarks no cliente com DOMParser inerte.",
          contentPreview:
            "function parseBookmarksHtml(rawHtml: string): BookmarkFolderTree {\n  const parser = new DOMParser();\n  const doc = parser.parseFromString(rawHtml, 'text/html');\n  // extrai estritamente textContent e atributos href\n}",
        },
      },
    },
    hero: {
      title: "Organize a muvuca que você salva na internet.",
      subtitle:
        "Links e prompts organizados numa biblioteca visual feita para você encontrar de novo o que decidiu guardar.",
      openSearchAria: "Abrir busca rápida da demonstração",
      searchPlaceholder: "Buscar na biblioteca...",
      gridView: "Visualização em grade",
      listView: "Visualização em lista",
      clearFilter: "Limpar",
      allItems: "Todos os itens",
      itemsShown: (count: number, filtered: boolean) =>
        `(${count} ${count === 1 ? "item exibido" : "itens exibidos"}${filtered ? " pelo filtro" : ""})`,
      activeFilter: (tagName: string) => `Filtro ativo: ${tagName}`,
    },
    problem: {
      title:
        "O trabalho real começa quando você esquece onde guardou e precisa achar de novo.",
      subtitle:
        "A maioria das ferramentas de bookmarking trata seus links como uma lista infinita e desordenada.",
      steps: {
        scattered: {
          title: "Favoritos espalhados",
          description:
            "Links acabam presos em dezenas de abas, notas e ferramentas diferentes, sem um ponto central para recuperar tudo depois.",
        },
        rigid: {
          title: "Pastas que não acompanham sua cabeça",
          description:
            "Uma referência técnica ou visual quase sempre faz sentido em mais de um contexto. Pastas tradicionais obrigam você a escolher apenas uma gaveta.",
        },
        lost: {
          title: "O esforço de busca supera o conteúdo",
          description:
            "Quando a biblioteca cresce, lembrar em qual pasta ou dispositivo você guardou dá mais trabalho do que encontrar o que precisa.",
        },
        solution: {
          title: "Recuperação imediata em qualquer contexto",
          description:
            "Tags hierárquicas e agregação automática (rollup) alimentam uma busca instantânea que varre título, descrição e prompts em milissegundos.",
        },
      },
      visuals: {
        scattered: {
          tabsOpen: "28 abas abertas",
          mobileNotes: "Notas do celular",
          codeReviewTitle: "System Prompt: Code Review",
          desktopTabs: "Abas do navegador (desktop)",
          uiPatternsTitle: "Linear UI Patterns & Architecture",
          bookmarksOther: "Favoritos / Outros",
          tailwindDocsTitle: "Tailwind CSS v4 Documentation",
          fragmented: "Fragmentado em 3 dispositivos diferentes",
        },
        rigid: {
          treeLabel: "Árvore Rígida Tradicional",
          oneFolderPerItem: "1 pasta por item",
          bookmarksRoot: "📁 Favoritos",
          work: "├── 📁 Trabalho",
          design: "│ └── 📁 Design",
          designSystemTitle: "📄 Design System & Tokens",
          stuckInDesign: "Preso em Design",
          personal: "└── 📁 Pessoal",
          frontendEngineering: " └── 📁 Engenharia Front-end",
          caption:
            "Este link é design e código ao mesmo tempo, mas a pasta só aceita um dos dois.",
        },
        lost: {
          searchAttempt: "Tentativa de Busca",
          noMatch: "Sem correspondência",
          queryExample: '"prompt refatoração typescript"',
          untitledGist: "Sem título (1), https://gist.github.com/...",
          linkSavedOn: "Link salvo em 12/04/2024",
          newTabAiTool: "Nova aba - Ferramenta IA",
          caption:
            "O prompt está salvo em algum lugar, mas inacessível pela busca.",
        },
        muvuca: {
          tagRollupActive: "Tag Rollup Ativo",
          instantRetrieval: "Recuperação instantânea",
          searchQuery: "refatoração",
          itemsFound: (n: number) => `${n} itens encontrados`,
          readyToCopy: "Pronto para copiar",
          // Rótulo curto do chip nesse mock (não é o nome completo da tag
          // "IA & Prompts" de `t.landing.demo.tags.ia`).
          iaTagShort: "IA",
          caption:
            "Encontrado por qualquer uma das tags filhas ou pela tag pai.",
        },
      },
    },
    galleryOverview: {
      title: "Uma biblioteca que continua legível quando cresce.",
      subtitle:
        "O Muvuca reúne seus itens em uma galeria visual, mantém a busca sempre por perto e usa tags para dar contexto sem transformar sua coleção em uma árvore impossível de navegar.",
      heading: "Acervo em Destaque",
      itemsCount: (count: number) => `(${count} itens)`,
      filterAriaLabel: "Filtrar acervo por tipo",
      filters: {
        all: "Todos",
        links: "Links",
        prompts: "Prompts",
      },
    },
    tagRollup: {
      title: "Organize uma vez e encontre por qualquer caminho depois.",
      subtitle:
        "Tags podem ter filhas, e um item pode pertencer a mais de uma. Ao abrir uma tag pai, o Muvuca reúne automaticamente os itens de toda a hierarquia, sem duplicar conteúdo.",
      treeLabel: "Árvore de Tags (Clique para testar)",
      activeTagLabel: "Tag ativa:",
      itemsAggregated: (count: number, subtagCount: number) =>
        `${count} itens agregados ${subtagCount > 0 ? `(de ${subtagCount} subtags)` : ""}`,
      filterByTag: (name: string) => `Filtrar por ${name}`,
    },
    searchDemo: {
      title: "Você não precisa lembrar onde salvou.",
      subtitle:
        "Pesquise por título, domínio, descrição ou conteúdo e combine a busca com suas tags para reduzir rapidamente a biblioteca ao que importa.",
      inputAriaLabel: "Demonstração interativa de busca",
      placeholder: "Buscar por título, domínio, descrição ou prompt...",
      tryQueries: "Testar consultas:",
      openSpotlightShortcut: "Abrir Spotlight (⌘K)",
      resultsCount: (count: number) =>
        `${count} ${count === 1 ? "resultado encontrado" : "resultados encontrados"}`,
      noResults: (query: string) =>
        `Nenhum item corresponde à busca "${query}".`,
    },
    itemTypes: {
      title: "Links e prompts convivem no mesmo acervo.",
      subtitle:
        "Cada tipo de item possui personalidade visual e ações contextuais próprias, sem quebrar o grid da biblioteca.",
      linkCardLabel: "Link de Referência",
      linkCardDescription:
        "Referência de interface densa com navegação por teclado e performance em milissegundos.",
      linkCaption:
        "O domínio aparece sozinho, em Geist Mono. A tag herda da hierarquia do item. Abrir o link usa sempre",
      promptCardLabel: "Prompt de IA & Instrução",
      copyPromptDemoAria: "Copiar prompt demonstrativo",
      promptCardDescription:
        "Instrução de sistema para auditoria de segurança OWASP e consistência de tipos.",
      promptContent:
        "Atue como um Senior Code Reviewer. Analise o diff priorizando:\n1. Segurança de dados e integridade de RLS;\n2. Tipagem estrita em TypeScript sem any;\n3. Acessibilidade WCAG 2.2 AA (teclado e contraste);\n4. Ausência de queries SQL concatenadas.\n\nRetorne apontamentos objetivos categorizados por severidade.",
      collapse: "Recolher visualização",
      expand: "Ver prompt completo",
      promptCardCaption:
        "O preview mantém a formatação original, e copiar vai pro clipboard em um clique. Expandir mostra o prompt inteiro.",
    },
    import: {
      title: "Traga seus favoritos sem perder a estrutura de pastas.",
      subtitle:
        "Importe os favoritos do navegador e transforme pastas e subpastas em uma hierarquia de tags antes de confirmar o que entra na biblioteca.",
      stagesLabel: "Etapas da migração:",
      stage1: "1. Arquivo de Favoritos",
      stage2: "2. Análise Segura no Navegador",
      stage3: "3. Árvore de Tags Muvuca",
      sourceHeading: "Favoritos do Navegador (.html)",
      sourceCount: "114 links",
      folderDesign: "📁 Design",
      folderInspiration: "↳ 📁 Inspiração (54 links)",
      folderTools: "↳ 📁 Ferramentas (18 links)",
      folderDev: "📁 Desenvolvimento",
      folderReact: "↳ 📁 React & Next.js (24 links)",
      folderAi: "↳ 📁 IA & LLMs (18 links)",
      conversion: "Conversão 1:1",
      targetHeading: "Estrutura de Tags no Muvuca",
      tagsCreated: "6 tags criadas",
      tagDesign: "# Design",
      tagInspiration: "# Inspiração [tag filha]",
      tagTools: "# Ferramentas [tag filha]",
      tagDev: "# Desenvolvimento",
      tagReact: "# React & Next.js [tag filha]",
      tagAi: "# IA & LLMs [tag filha]",
      parserNote:
        "Parser inerte no cliente (sem SSRF, sem envio de HTML bruto)",
      parserCode:
        "const parser = new DOMParser();\nconst doc = parser.parseFromString(rawHtml, 'text/html');\n// Extração pura de textContent e atributos href validados (apenas http/https)\n// O servidor recebe apenas o DTO estruturado de tags e links.",
      caption:
        "O arquivo é processado localmente. Antes de salvar, você vê quantos itens são válidos e quantos são duplicados.",
    },
    collections: {
      title: "Você organiza cada coleção do seu jeito.",
      subtitle:
        "Crie a taxonomia que faz sentido para você e agrupe qualquer tipo de interesse. O Muvuca se molda ao seu acervo pessoal.",
      items: {
        skills: {
          title: "Skills & Engenharia",
          countHint: "128 itens",
          tags: ["Front-end", "Next.js", "Segurança"],
          description:
            "Artigos técnicos, documentações e snippets essenciais para o fluxo diário de código.",
        },
        design: {
          title: "Design & Direção de Arte",
          countHint: "94 itens",
          tags: ["Tipografia", "Branding", "Design System"],
          description:
            "Referências visuais, catálogos editoriais e componentes de alta fidelidade.",
        },
        prompts: {
          title: "Prompts de IA",
          countHint: "42 itens",
          tags: ["Code Review", "Redação", "Refatoração"],
          description:
            "Instruções de sistema, templates de agentes e comandos reutilizáveis prontos para copiar.",
        },
        wishlist: {
          title: "Lista de Desejos & Wishlist",
          countHint: "31 itens",
          tags: ["Livros", "Hardware", "Presentes"],
          description:
            "Itens de compra e recomendações sem a bagunça de listas em múltiplos blocos de notas.",
        },
        videos: {
          title: "Vídeos & Aulas",
          countHint: "56 itens",
          tags: ["Palestras", "Tutoriais", "Podcasts"],
          description:
            "Gravações que você quer assistir com calma no fim de semana.",
        },
        articles: {
          title: "Artigos & Ensaios",
          countHint: "67 itens",
          tags: ["Filosofia", "Produto", "História da Web"],
          description:
            "Textos longos e ensaios guardados para consulta futura e pesquisa.",
        },
      },
    },
    cta: {
      title: "Transforme sua muvuca em uma biblioteca.",
      subtitle:
        "Guarde o que importa sem depender da memória para encontrar depois.",
    },
    commandPalette: {
      dialogAriaLabel: "Busca rápida na biblioteca de demonstração",
      placeholder: "Buscar links, prompts, domínios ou tags...",
      inputAriaLabel: "Digitar busca",
      closeAria: "Fechar busca rápida",
      filterByTagLabel: "Filtrar por tag:",
      allTags: (count: number) => `Todas (${count})`,
      noResults: (query: string) => `Nenhum item encontrado para "${query}".`,
      open: "Abrir",
      navigateHint: "navegar",
      selectHint: "selecionar",
      closeHint: "fechar",
      itemCount: (count: number) =>
        `${count} ${count === 1 ? "item" : "itens"}`,
    },
    footer: {
      tagline: "O que você guarda continua fácil de achar.",
      navAriaLabel: "Rodapé",
      copyright: (year: number) =>
        `© ${year} Muvuca. Todos os direitos reservados.`,
    },
  },
};

export type Dictionary = typeof ptBR;
