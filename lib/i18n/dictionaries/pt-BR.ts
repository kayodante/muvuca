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
      heading: "Aparência e idioma",
      description: "Defina o tema e o idioma usados no Muvuca.",
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
      description: "Você entra com email e senha.",
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
    parentPicker: {
      noResults: "Nenhuma tag encontrada.",
      toggleOptions: "Abrir opções",
    },
    deleteDialog: {
      title: (name: string) => `Excluir “${name}”?`,
      childrenToParent: (n: number, parentName: string) =>
        n === 1
          ? `A tag filha passa para “${parentName}”.`
          : `As ${n} tags filhas passam para “${parentName}”.`,
      childrenToRoot: (n: number) =>
        n === 1
          ? "A tag filha passa a ser raiz."
          : `As ${n} tags filhas passam a ser raiz.`,
      itemsNone: "Nenhum item usa esta tag.",
      itemsOne: "1 item perde esta tag. O item não é excluído.",
      itemsMany: (n: number) =>
        `${n} itens perdem esta tag. Os itens não são excluídos.`,
      confirm: "Excluir tag",
      deleting: "Excluindo...",
      deleted: "Tag excluída.",
    },
    tree: {
      collapse: (name: string) => `Recolher ${name}`,
      expand: (name: string) => `Expandir ${name}`,
    },
    columns: {
      roots: "Raízes",
      open: (name: string) => `Abrir ${name}`,
      back: (name: string) => `Voltar para ${name}`,
      edit: "Editar",
      editTag: (name: string) => `Editar ${name}`,
      childCount: (n: number) => (n === 1 ? "1 tag filha" : `${n} tags filhas`),
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
    exportJson: "Exportar JSON da tag",
    exportSuccess: "JSON da tag exportado com sucesso.",
    inspector: {
      emptyTitle: "Nenhuma tag selecionada",
      emptyDescription:
        "Escolha uma tag nas colunas para editar nome, cor, tag pai e descrição.",
      shortcutFilter: "filtra",
      shortcutNavigate: "navega nas colunas",
      shortcutSelect: "seleciona",
      shortcutBack: "volta",
      summary: (total: number, roots: number, levels: number) =>
        [
          total === 1 ? "1 tag" : `${total} tags`,
          roots === 1 ? "1 raiz" : `${roots} raízes`,
          levels === 1 ? "1 nível" : `${levels} níveis`,
        ].join(" · "),
      repeatedNames: "Nomes repetidos",
      repeatedNamesHint: "O mesmo nome em mais de um ramo da hierarquia.",
      repeatedNameChipLabel: (name: string, location: string) =>
        `${name} — ${location}`,
      rootLabel: "Raiz",
      emptyTags: "Vazias",
      emptyTagsHint: "Sem itens nela nem nas filhas.",
      singleItemTags: "Com 1 item",
      singleItemTagsHint: "Candidatas a juntar com outra tag ou excluir.",
      showAll: (n: number) => `Mostrar todas (${n})`,
      showLess: "Mostrar menos",
      allTidy:
        "Nenhuma tag vazia, nenhuma com só 1 item e nenhum nome se repete.",
      itemCount: (n: number) =>
        n === 0
          ? "Nenhum item com esta tag"
          : n === 1
            ? "1 item com esta tag"
            : `${n} itens com esta tag`,
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
          ? "1 tag já vai junto com a tag pai."
          : `${n} tags já vão junto com a tag pai delas.`,
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
      itemCount: (n: number) => (n === 1 ? "1 item" : `${n} itens`),
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
      exportHelp: "Como exportar favoritos do navegador",
      chromeExportHelp:
        "Chrome: Gerenciador de favoritos → ⋮ → Exportar favoritos.",
      edgeExportHelp: "Edge: Favoritos → Mais opções → Exportar favoritos.",
      firefoxExportHelp:
        "Firefox: Gerenciar favoritos → Importar e backup → Exportar favoritos para HTML.",
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
      shortPlaceholder: "Buscar",
      tagScope: "Busca nesta tag",
      openSpotlight: "Abrir busca rápida (Spotlight)",
      clear: "Limpar busca",
      searching: "Pesquisando…",
    },
    tagNav: {
      heading: "Tags",
      manageTags: "Gerenciar tags",
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
      codeRegion: "Código",
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
      discardTitle: "Descartar alterações?",
      discardDescription: "As alterações não salvas serão perdidas.",
      keepEditing: "Continuar editando",
      discardConfirm: "Descartar",
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
      searchLabel: "Buscar tags",
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
        title: "Alternar tema claro/escuro",
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
    searchPlaceholder: "Buscar itens ou ações…",
    searchInputLabel: "Digitar busca",
    dialogLabel: "Busca rápida",
    closeSpotlight: "Fechar busca rápida",
    filterByTag: "Filtrar por tag:",
    navigate: "navegar",
    select: "selecionar",
    peek: "prévia",
    close: "fechar",
    groups: {
      actions: "Ações",
      recent: "Recentes",
      items: "Itens",
    },
    loadFailed: "Não foi possível carregar os itens.",
    retry: "Tentar de novo",
    itemCount: (n: number, hasMore: boolean) =>
      hasMore ? `${n}+ itens` : `${n} ${n === 1 ? "item" : "itens"}`,
    searching: "Buscando…",
    noItems: (query: string) => `Nenhum item encontrado para "${query}".`,
    clearSearch: "Limpar busca",
    seeAll: "Ver todos na biblioteca",
    seeAllDescription: "Abrir a busca completa com este filtro",
    quickLookTitle: "Pré-visualizar (→)",
    open: "Abrir",
    copyShort: "Copiar",
    copiedShort: "Copiado",
    invalidUrl: "URL inválida ou insegura.",
    promptCopiedMessage: "Prompt copiado para a área de transferência.",
    codeCopiedMessage: "Código copiado para a área de transferência.",
    copyContentFailed: "Não foi possível copiar o conteúdo.",
    quickLook: {
      regionLabel: "Pré-visualização do item",
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
  // Landing pública e identificação dos assets pendentes de produção.
  landing: {
    skipToContent: "Pular para o conteúdo principal",
    common: {
      getStarted: "Abrir Muvuca",
      seeHow: "Conheça por dentro",
      login: "Entrar",
    },
    nav: {
      about: "Sobre",
      features: "Recursos",
      how: "Como funciona",
      faq: "Perguntas",
    },
    header: {
      navAriaLabel: "Navegação principal",
      mobileNavAriaLabel: "Navegação mobile",
      openMenu: "Abrir menu de navegação",
      menuTitle: "Explore o Muvuca",
      menuDescription: "Seções e acesso ao Muvuca.",
    },
    media: {
      pending: "Imagem a produzir",
      landscapeFormat: "CAPTURA · 16:9",
      detailFormat: "RECORTE OU VÍDEO · 4:3",
    },
    hero: {
      eyebrow: "Seu pequeno acervo de grandes descobertas",
      title: "Guarde o que inspira. Encontre quando precisar.",
      subtitle:
        "Links, prompts e trechos de código. Um lugar seu para reunir boas descobertas e voltar a elas quando fizer sentido.",
      assetTitle: "Sua biblioteca, em uma imagem.",
      assetDescription:
        "Captura da biblioteca no tema escuro, com uma seleção de links, prompts e tags.",
    },
    intro: {
      label: "Um lugar seu",
      title: "A internet é uma muvuca. O que você guarda dela não precisa ser.",
      body: "Uma referência para o próximo projeto. Um artigo para ler com calma. Aquele prompt que deu certo. O Muvuca reúne tudo em uma biblioteca visual, organizada do seu jeito e fácil de encontrar de novo.",
      signature: "MENOS ABAS ABERTAS. MAIS IDEIAS POR PERTO.",
    },
    features: {
      label: "Por dentro do Muvuca",
      title: "Tudo por perto. Cada coisa no seu lugar.",
      subtitle:
        "Da primeira referência a uma coleção inteira: uma biblioteca para guardar, organizar e reencontrar.",
      tabsLabel: "Recursos do Muvuca",
      items: [
        {
          id: "library",
          number: "01",
          label: "Biblioteca",
          assetTitle: "Sua biblioteca, em uma imagem.",
          assetDescription:
            "Visão geral da biblioteca no tema escuro, com cards e miniaturas reais.",
          caption: "Links, prompts e código convivem em uma biblioteca visual.",
        },
        {
          id: "tags",
          number: "02",
          label: "Tags",
          assetTitle: "Conexões que fazem sentido.",
          assetDescription:
            "Captura ou vídeo da navegação por tags e subtags, com seus itens relacionados.",
          caption:
            "Um item pode estar em mais de uma tag. Sua organização acompanha o seu raciocínio.",
        },
        {
          id: "search",
          number: "03",
          label: "Busca",
          assetTitle: "Do pensamento ao resultado.",
          assetDescription:
            "Captura ou vídeo de uma busca, mostrando o termo e os resultados encontrados.",
          caption:
            "Encontre pelo título, domínio, descrição ou conteúdo do prompt.",
        },
        {
          id: "prompts",
          number: "04",
          label: "Prompts",
          assetTitle: "Pronto para usar de novo.",
          assetDescription:
            "Captura ou vídeo de um prompt aberto e da ação de copiar o conteúdo.",
          caption:
            "Guarde o que funcionou. Copie o prompt completo quando precisar.",
        },
        {
          id: "import",
          number: "05",
          label: "Importação",
          assetTitle: "Suas descobertas vêm junto.",
          assetDescription:
            "Captura da prévia de importação, com a árvore de pastas e o resumo dos favoritos.",
          caption:
            "Importe os favoritos do navegador. Pastas e subpastas se tornam tags.",
        },
      ],
    },
    details: {
      label: "Feito para o seu jeito",
      title: "Guardar é só o começo.",
      subtitle:
        "O valor está em voltar àquela ideia. Com contexto, sem refazer o caminho inteiro.",
      items: [
        {
          number: "02",
          label: "Organização que se conecta",
          title: "Uma ideia cabe em mais de um lugar.",
          body: "Agrupe suas referências com tags e subtags. Ao abrir uma tag, encontre também os itens das suas descendentes, sem duplicações.",
          note: "Vários caminhos para a mesma descoberta.",
          assetTitle: "Tags em contexto.",
          assetDescription:
            "Recorte da árvore de tags e dos itens relacionados. Reaproveitar o asset 02.",
        },
        {
          number: "03",
          label: "Encontre de novo",
          title: "Lembre de uma palavra. A busca faz o resto.",
          body: "Pesquise o que você lembra e refine por tag ou tipo de item. A referência certa continua ao alcance, mesmo quando a biblioteca cresce.",
          note: "Menos tempo procurando. Mais tempo criando.",
          assetTitle: "Uma busca, bons resultados.",
          assetDescription:
            "Vídeo curto de uma pesquisa ou recorte dos resultados. Reaproveitar o asset 03.",
        },
        {
          number: "05",
          label: "Traga o que já é seu",
          title: "Seus favoritos ganham uma nova casa.",
          body: "Importe o arquivo de favoritos do navegador e confira a prévia antes de confirmar. A estrutura de pastas vira uma árvore de tags.",
          note: "Comece com o acervo que você já construiu.",
          assetTitle: "Dos favoritos à biblioteca.",
          assetDescription:
            "Recorte da prévia de importação com pastas e contadores. Reaproveitar o asset 05.",
        },
      ],
    },
    faq: {
      label: "Perguntas frequentes",
      title: "Antes de guardar a primeira ideia.",
      subtitle: "Algumas respostas para conhecer melhor o Muvuca.",
      items: [
        {
          question: "O que posso guardar no Muvuca?",
          answer:
            "Links de páginas, prompts e trechos de código. Você pode adicionar descrições e tags para manter o contexto de cada descoberta.",
        },
        {
          question: "Qual a diferença entre tags e pastas?",
          answer:
            "Um item pode ter várias tags. As tags também podem ter subtags: ao abrir uma tag principal, você encontra os itens dela e de suas descendentes, sem duplicar os resultados.",
        },
        {
          question: "Posso trazer os favoritos do navegador?",
          answer:
            "Sim. Exporte seus favoritos como um arquivo HTML no navegador e importe no Muvuca. Você confere uma prévia antes de confirmar, e suas pastas e subpastas viram tags.",
        },
        {
          question: "Minha biblioteca é pública?",
          answer:
            "Não. Sua biblioteca é privada e vinculada à sua conta. O Muvuca não oferece compartilhamento público dos seus itens.",
        },
        {
          question: "Funciona no celular e em outros idiomas?",
          answer:
            "Sim. O Muvuca funciona no navegador do computador e do celular, com interface em português do Brasil e inglês. O conteúdo que você salva permanece como foi escrito.",
        },
      ],
    },
    cta: {
      title: "Sua próxima ideia pode estar no que você já guardou.",
      subtitle:
        "Dê um lugar às suas descobertas. E um caminho simples para voltar a elas.",
    },
    footer: {
      tagline: "O que você guarda continua fácil de achar.",
      navAriaLabel: "Rodapé",
      language: "Idioma",
      copyright: (year: number) =>
        `© ${year} Muvuca. Todos os direitos reservados.`,
    },
  },
};

export type Dictionary = typeof ptBR;
