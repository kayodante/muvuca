import type { Dictionary } from "./pt-BR";
import type { TagColorToken } from "@/lib/validation/tag";

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
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    tryAgain: "Try again",
    close: "Close",
    loading: "Loading",
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
      nameLabel: "What should we call you",
      hint: "Shows in the account menu. Leave blank to use",
      save: "Save",
      saving: "Saving...",
      saved: "Name saved.",
      removed: "Name removed.",
      photo: {
        upload: "Upload photo",
        change: "Change photo",
        remove: "Remove photo",
        uploading: "Uploading...",
        removing: "Removing...",
        hint: "JPEG, PNG, WebP, GIF, or AVIF. The photo is cropped to a square from the center.",
        updated: "Photo updated.",
        removed: "Photo removed.",
      },
    },
    appearance: {
      heading: "Appearance & language",
      description: "Choose the theme and language used across Muvuca.",
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
      description: "Sign in with your email and password.",
      emailLabel: "Email",
      emailUnavailable: "Email unavailable",
    },
    danger: {
      heading: "Danger zone",
      description: "Destructive, irreversible actions.",
      resetAccount: {
        cardHeading: "Start over",
        cardDescription:
          "Permanently deletes all your links, prompts, and tags. Your account ends up as if it were just created.",
        confirmTitle: "Delete all data?",
        confirmDescriptionPrefix:
          "This removes all your links, prompts, tags, and preferences. This can't be undone. Type",
        confirmDescriptionSuffix: "to confirm.",
        confirmInputLabel: (phrase: string) => `Type ${phrase} to confirm`,
        confirmButton: "Delete everything",
        deleting: "Deleting...",
        confirmPhrase: "DELETE",
        success: "Your account has been reset.",
      },
    },
  },
  tags: {
    colors: {
      lime: "Lime",
      chartreuse: "Chartreuse",
      yellow: "Yellow",
      amber: "Amber",
      orange: "Orange",
      peach: "Peach",
      terracotta: "Terracotta",
      brown: "Brown",
      red: "Red",
      rose: "Rose",
      coral: "Coral",
      pink: "Pink",
      fuchsia: "Fuchsia",
      purple: "Purple",
      lavender: "Lavender",
      violet: "Violet",
      indigo: "Indigo",
      periwinkle: "Periwinkle",
      blue: "Blue",
      sky: "Sky",
      cyan: "Cyan",
      aqua: "Aqua",
      teal: "Teal",
      emerald: "Emerald",
      mint: "Mint",
      green: "Green",
      slate: "Slate",
      zinc: "Zinc",
      stone: "Stone",
    } satisfies Record<TagColorToken, string>,
    breadcrumb: {
      ariaLabel: "Tag path",
      hiddenAncestors: (names: string) => `Intermediate tags: ${names}`,
    },
    editor: {
      createTitle: "New tag",
      nameLabel: "Name",
      descriptionLabel: "Description",
      optional: "(optional)",
      colorLabel: "Color",
      parentLabel: "Parent tag",
      noParent: "None (root tag)",
      createButton: "Create tag",
      saveButton: "Save changes",
      saving: "Saving...",
      created: "Tag created.",
      updated: "Tag updated.",
    },
    parentPicker: {
      noResults: "No tags found.",
      toggleOptions: "Open options",
    },
    deleteDialog: {
      title: (name: string) => `Delete “${name}”?`,
      childrenToParent: (n: number, parentName: string) =>
        n === 1
          ? `The child tag moves under “${parentName}”.`
          : `The ${n} child tags move under “${parentName}”.`,
      childrenToRoot: (n: number) =>
        n === 1
          ? "The child tag becomes a root tag."
          : `The ${n} child tags become root tags.`,
      itemsNone: "No item uses this tag.",
      itemsOne: "1 item loses this tag. The item is not deleted.",
      itemsMany: (n: number) =>
        `${n} items lose this tag. The items are not deleted.`,
      confirm: "Delete tag",
      deleting: "Deleting...",
      deleted: "Tag deleted.",
    },
    tree: {
      collapse: (name: string) => `Collapse ${name}`,
      expand: (name: string) => `Expand ${name}`,
    },
    columns: {
      roots: "Roots",
      open: (name: string) => `Open ${name}`,
      back: (name: string) => `Back to ${name}`,
      edit: "Edit",
      editTag: (name: string) => `Edit ${name}`,
      childCount: (n: number) => (n === 1 ? "1 child tag" : `${n} child tags`),
    },
    page: {
      heading: "Tags",
      createTag: "Create tag",
      emptyTitle: "No tags yet",
      emptyDescription:
        "Create tags to organize your library into hierarchies, like Skills → Design → Dev.",
      filterLabel: "Filter tags by name",
      treeRegionLabel: "Tag tree",
      noneFound: (query: string) => `No tags found for “${query}”.`,
      clearSearch: "Clear search",
      select: "Select",
      cancelSelection: "Cancel selection",
    },
    detail: {
      headingPrefix: "Your Muvuca in",
      itemsLabel: "items",
      subtagsLabel: "subtags",
      emptyItemsTitle: "No items in this tag",
      emptyItemsDescription:
        "Items linked to this tag and its child tags show up here.",
      editTag: "Edit tag",
    },
    exportJson: "Export tag JSON",
    exportSuccess: "Tag JSON exported successfully.",
    inspector: {
      emptyTitle: "No tag selected",
      emptyDescription:
        "Pick a tag in the columns to edit its name, color, parent and description.",
      shortcutFilter: "filters",
      shortcutNavigate: "navigates the columns",
      shortcutSelect: "selects",
      shortcutBack: "goes back",
      summary: (total: number, roots: number, levels: number) =>
        [
          total === 1 ? "1 tag" : `${total} tags`,
          roots === 1 ? "1 root" : `${roots} roots`,
          levels === 1 ? "1 level" : `${levels} levels`,
        ].join(" · "),
      repeatedNames: "Repeated names",
      repeatedNamesHint: "The same name in more than one branch.",
      repeatedNameChipLabel: (name: string, location: string) =>
        `${name} — ${location}`,
      rootLabel: "Root",
      emptyTags: "Empty",
      emptyTagsHint: "No items in it or its children.",
      singleItemTags: "With 1 item",
      singleItemTagsHint: "Candidates to merge into another tag or delete.",
      showAll: (n: number) => `Show all (${n})`,
      showLess: "Show less",
      allTidy: "No tag is empty, none has just 1 item, and no name repeats.",
      itemCount: (n: number) =>
        n === 0
          ? "No items with this tag"
          : n === 1
            ? "1 item with this tag"
            : `${n} items with this tag`,
      pathLabel: "Path",
      children: "Child tags",
      noChildren: "No child tags.",
      addChild: "New child tag",
      maxDepthReached: "6-level limit reached.",
      openItems: "Open items",
      moreActions: (name: string) => `More actions for ${name}`,
      discardTitle: "Discard changes?",
      discardDescription: "Unsaved changes to this tag will be lost.",
      discardConfirm: "Discard",
      keepEditing: "Keep editing",
    },
    bulk: {
      panelLabel: "Bulk actions",
      noneSelected: "Check the tags you want to move or delete.",
      selectedCount: (n: number) =>
        n === 1 ? "1 tag selected" : `${n} tags selected`,
      move: "Move to…",
      delete: "Delete",
      moveTitle: (n: number) => (n === 1 ? "Move 1 tag" : `Move ${n} tags`),
      moveDescription: "Each tag takes its own children along.",
      destinationLabel: "Destination",
      chooseDestination: "Choose a destination",
      includedByParent: (n: number) =>
        n === 1
          ? "1 tag already goes along with its parent."
          : `${n} tags already go along with their parents.`,
      nameCollision: (names: string) =>
        `A tag named ${names} already exists at that destination. Rename it before moving.`,
      moveConfirm: "Move",
      moving: "Moving...",
      moved: (n: number) => (n === 1 ? "1 tag moved." : `${n} tags moved.`),
      deleteTitle: (n: number) =>
        n === 1 ? "Delete 1 tag?" : `Delete ${n} tags?`,
      deleteDescription:
        "Unselected child tags move under the nearest ancestor that still exists. Associated items are not deleted.",
      deleteConfirm: "Delete tags",
      deleteOverCap: "Delete accepts up to 500 tags at a time.",
      deleting: "Deleting...",
      deleted: (n: number) =>
        n === 1 ? "1 tag deleted." : `${n} tags deleted.`,
      itemCount: (n: number) => (n === 1 ? "1 item" : `${n} items`),
    },
  },
  bookmarks: {
    errors: {
      invalidFileType: "Select an HTML bookmarks file.",
      emptyFile: "The file is empty.",
      fileTooLarge: "The file must be at most 10 MB.",
      tooManyBookmarks: (count: string) =>
        `The file has more than ${count} valid bookmarks.`,
      tooManyFolders: (count: string) =>
        `The file has more than ${count} folders.`,
      noValidBookmarks: "No valid bookmarks were found.",
    },
    dialog: {
      title: "Import bookmarks",
      exportHelp: "How to export bookmarks from your browser",
      chromeExportHelp: "Chrome: Bookmark Manager → ⋮ → Export bookmarks.",
      edgeExportHelp: "Edge: Favorites → More options → Export favorites.",
      firefoxExportHelp:
        "Firefox: Manage Bookmarks → Import and Backup → Export Bookmarks to HTML.",
      description:
        "The file is read only in this browser. No URL will be accessed.",
      selectFile: "Select an .html file up to 10 MB",
      counts: {
        folders: "Folders",
        validLinks: "Valid links",
        alreadyInLibrary: "Already in library",
        duplicatesInFile: "Duplicates in file",
        ignored: "Ignored",
      },
      importingAria: "Importing bookmarks",
      importingBatch: (current: number, total: number) =>
        `Importing batch ${current} of ${total}...`,
      progressAria: "Import progress",
      processedOf: (processed: number, total: number) =>
        `${processed} of ${total} bookmarks processed`,
      proposedStructure: "Proposed structure",
      flattenedFolders: (n: number) =>
        `${n} folder(s) were flattened at the sixth level.`,
      catalogedBadge: "library cataloged",
      resultNone: "No new links needed to be added to your library.",
      resultOne: "1 new link and its tag structure were organized.",
      resultMany: (count: number, locale: string) =>
        `${count.toLocaleString(locale)} new links and the folder structure were organized.`,
      resultCounts: {
        itemsImported: "Items imported",
        tagsCreated: "Tags created",
        associationsCreated: "Tag associations",
        alreadyInLibrary: "Already in library",
        duplicatesInFile: "Duplicates in file",
        errorsIgnored: "Errors ignored",
      },
      previewsNote:
        "Link previews (thumbnail, favicon, remote title and description) load in the background.",
      chooseAnother: "Choose another",
      importing: "Importing...",
      confirmImport: "Confirm import",
      done: "Done",
      imported: "Bookmarks imported.",
      batchError: (
        batch: number,
        total: number,
        message: string,
        imported: number,
      ) =>
        `Error importing batch ${batch} of ${total}: ${message}. ${imported} links were imported before the failure.`,
    },
  },
  auth: {
    login: {
      personalLibraryBadge: "PERSONAL LIBRARY",
      pitch:
        "Save links and prompts, organize them with nested tags, and find everything again in seconds.",
      emailLabel: "Email",
      emailPlaceholder: "you@email.com",
      passwordLabel: "Password",
      signIn: "Sign in",
      signingIn: "Signing in",
      noSignupHint: "Muvuca isn't accepting new accounts yet.",
      forgotPasswordLink: "Forgot password",
    },
    loginFailedMessage:
      'Couldn\'t validate the link. It may have expired or already been used. Request a new one from "Forgot password".',
    signOut: {
      pending: "Signing out",
      label: "Sign out",
    },
    forgotPassword: {
      badge: "RECOVER ACCESS",
      title: "Forgot password",
      pitch:
        "Enter your email and, if there's an account, we'll send a link to reset your password.",
      submit: "Send reset link",
      sending: "Sending link",
      linkSentBadge: "LINK SENT",
      checkEmailTitle: "Check your email",
      checkEmailBody:
        "If that email has an account, we sent a link to reset the password.",
      useAnotherEmail: "Use another email",
      resendHint: "Didn't get it? Check your spam folder.",
      backToLogin: "Back to login",
    },
    resetPassword: {
      badge: "NEW PASSWORD",
      title: "Set your new password",
      passwordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      passwordHint: "At least 12 characters.",
      submit: "Save new password",
      saving: "Saving",
    },
  },
  shell: {
    nav: {
      ariaLabel: "Main navigation",
      allItems: "All items",
    },
    sidebarToggle: {
      expand: "Expand sidebar",
      collapse: "Collapse sidebar",
    },
    userMenu: {
      fallbackName: "User",
      tags: "Tags",
      importBookmarks: "Import bookmarks",
      settings: "Settings",
    },
    topbar: {
      createItem: "Create item",
    },
    mobileNav: {
      openLabel: "Open navigation",
      title: "Navigation",
    },
    search: {
      placeholder: "Search your library",
      shortPlaceholder: "Search",
      tagScope: "Search within this tag",
      openSpotlight: "Open quick search (Spotlight)",
      clear: "Clear search",
      searching: "Searching…",
    },
    tagNav: {
      heading: "Tags",
      manageTags: "Manage tags",
      searchPlaceholder: "Search tags",
      searchAriaLabel: "Search tags by name",
      noneFound: (query: string) => `No tags found for “${query}”.`,
    },
    loading: {
      library: "Loading library",
      tag: "Loading tag",
      tags: "Loading tags",
    },
  },
  items: {
    card: {
      types: {
        link: {
          label: "link",
          hint: "A saved piece of the web to visit later.",
        },
        prompt: {
          label: "prompt",
          hint: "A saved prompt to reuse with AI.",
        },
        code_component: {
          label: "code",
          hint: "Saved code or a snippet to reference and reuse.",
        },
      },
      loadingItem: "Loading item",
      openLinkNewTab: "Open link in new tab",
      openLink: "Open link",
      viewFullContent: "View full content",
      viewFullCode: "View full code",
      copyPrompt: "Copy prompt",
      copyCode: "Copy code",
      copyLink: "Copy link",
      copyingPrompt: "Copying prompt",
      copyingCode: "Copying code",
      copied: "Copied!",
      refreshPreview: "Refresh preview",
      itemActions: (title: string) => `Actions for ${title}`,
      invalidLink: "Invalid link",
      hiddenTagsLabel: (count: number, names: string) =>
        `${count} more ${count === 1 ? "tag" : "tags"}: ${names}`,
      promptCopied: "Prompt copied to clipboard.",
      codeCopied: "Code copied to clipboard.",
      promptCopyFailed: "Couldn't copy the prompt.",
      codeCopyFailed: "Couldn't copy the code.",
      linkCopied: "Link copied to clipboard.",
      linkCopyFailed: "Couldn't copy the link.",
      brokenLink: "Link unavailable",
      previewUnavailable: "Preview unavailable",
    },
    promptContentPanel: {
      lineCount: (n: number) =>
        `${n.toLocaleString("en-US")} ${n === 1 ? "line" : "lines"}`,
      charCount: (n: number) =>
        `${n.toLocaleString("en-US")} ${n === 1 ? "character" : "characters"}`,
    },
    codeSnippetEmbed: {
      copyCode: "Copy code",
      codeRegion: "Code",
      codeCopied: "Code copied to clipboard.",
      codeCopyFailed: "Couldn't copy the code.",
      lineCount: (n: number) =>
        `${n.toLocaleString("en-US")} ${n === 1 ? "line" : "lines"}`,
      charCount: (n: number) =>
        `${n.toLocaleString("en-US")} ${n === 1 ? "character" : "characters"}`,
    },
    deleteDialog: {
      title: (name: string) => `Delete “${name}”?`,
      description:
        "This removes the item and its tag associations. This can't be undone.",
      confirm: "Delete item",
      deleting: "Deleting...",
      deleted: "Item deleted.",
    },
    editor: {
      types: {
        link: "Link",
        prompt: "Prompt",
        code_component: "Code component",
      },
      typeFieldsetLabel: "Item type",
      editTitle: "Edit item",
      createTitle: "New item",
      dialogDescription:
        "Links, prompts, and components stay private in your library.",
      fields: {
        title: "Title",
        content: "Content",
        code: "Code",
        language: "Language (optional)",
        sourceLink: "Source link (optional)",
        description: "Description (optional)",
        tags: "Tags (optional)",
      },
      urlPlaceholder: "https://example.com",
      codePlaceholder: "Paste the component's code here...",
      codeUrlPlaceholder: "https://example.com/component",
      charCounter: (count: number) =>
        `${count.toLocaleString("en-US")} / ${(100000).toLocaleString("en-US")} characters`,
      plainText: "Plain text",
      tagsLoading: "Loading tags...",
      tagsLoadFailedLabel: "Couldn't load tags",
      tagsEmptyHint: "Create tags in the Tags section to organize your items.",
      tagsSelectHint: "Select one or more tags to organize the item.",
      itemUpdated: "Item updated.",
      itemCreated: "Item created.",
      discardTitle: "Discard changes?",
      discardDescription: "Your unsaved changes will be lost.",
      keepEditing: "Keep editing",
      discardConfirm: "Discard",
      saveChanges: "Save changes",
      createItem: "Create item",
      saving: "Saving...",
      creating: "Creating...",
    },
    promptDetail: {
      openSource: "Open original source",
      editComponent: "Edit component",
      editPrompt: "Edit prompt",
      copyCode: "Copy code",
      copyPrompt: "Copy prompt",
      copyingCode: "Copying code",
      copyingPrompt: "Copying prompt",
      codeCopiedLabel: "Code copied!",
      promptCopiedLabel: "Prompt copied!",
      codeCopiedMessage: "Code copied to clipboard.",
      promptCopiedMessage: "Prompt copied to clipboard.",
      codeCopyFailed: "Couldn't copy the code.",
      promptCopyFailed: "Couldn't copy the prompt.",
    },
    toolbar: {
      sectionLabel: "Filters and sorting",
      typeFilterLabel: "Filter by type",
      sortAriaLabel: "Sort items",
      sortLabels: {
        newest: "Newest",
        oldest: "Oldest",
        title_asc: "Title A–Z",
        title_desc: "Title Z–A",
        updated: "Recently updated",
      },
      typeTabs: {
        all: "All",
        link: "Link",
        prompt: "Prompt",
        code: "Code",
      },
      refreshing: "Refreshing",
      refreshPreviews: "Refresh previews",
      loadingItem: "Loading item…",
      updatingResults: "Updating results…",
    },
    page: {
      defaultTitle: "Your items",
      emptyTitle: "Your library is empty",
      emptyDescription:
        "Save a link, prompt, or component to start your collection.",
      noResultsTitle: "No results",
      noResultsDescription: "Try adjusting the search or removing a filter.",
      clearFilters: "Clear filters",
      importBookmarks: "Import bookmarks",
      paginationLabel: "Pagination",
      previousPage: "Previous page",
      nextPage: "Next page",
      previewRefreshRequested: "Preview refresh requested.",
    },
    tagSelect: {
      placeholder: "Select tags...",
      emptyLabel: "No tags yet",
      selectedTagsLabel: "Selected tags",
      removeTag: (name: string) => `Remove tag ${name}`,
      availableTagsLabel: "Available tags",
      searchPlaceholder: "Search tags...",
      searchLabel: "Search tags",
      noTagsFound: "No tags found.",
      selectedCount: (count: number) =>
        `${count} tag${count > 1 ? "s" : ""} selected`,
    },
    previewDrain: {
      drainFailed: "Couldn't refresh previews.",
      noPendingPreviews: "No pending previews on this page.",
      oneScheduled: "1 preview will be refreshed.",
      manyScheduled: (count: number) => `${count} previews will be refreshed.`,
      updateFailed: "Couldn't update the previews.",
    },
  },
  spotlight: {
    quickActions: {
      createItem: {
        title: "Create new item",
        description: "Add a link, prompt, or code to your library",
        keywords: ["new", "create", "add", "save", "link", "prompt", "code"],
      },
      goToLibrary: {
        title: "Go to Library",
        description: "View and browse all your saved items",
        keywords: ["library", "items", "all", "home", "gallery"],
      },
      manageTags: {
        title: "Manage tags",
        description: "Organize tag hierarchy and colors",
        keywords: ["tag", "tags", "categories"],
      },
      settings: {
        title: "Settings",
        description: "Export data, backup, and account preferences",
        keywords: ["settings", "preferences", "backup", "export", "account"],
      },
      toggleTheme: {
        title: "Toggle light/dark theme",
        description: "Change the interface appearance",
        keywords: ["theme", "dark", "light", "appearance", "mode"],
      },
    },
    themeChangedDark: "Theme changed to dark.",
    themeChangedLight: "Theme changed to light.",
    searchPlaceholder: "Search items or actions…",
    searchInputLabel: "Type to search",
    dialogLabel: "Quick search",
    closeSpotlight: "Close quick search",
    filterByTag: "Filter by tag:",
    navigate: "navigate",
    select: "select",
    peek: "preview",
    close: "close",
    groups: {
      actions: "Actions",
      recent: "Recent",
      items: "Items",
    },
    loadFailed: "Couldn't load the items.",
    retry: "Try again",
    itemCount: (n: number, hasMore: boolean) =>
      hasMore ? `${n}+ items` : `${n} ${n === 1 ? "item" : "items"}`,
    searching: "Searching…",
    noItems: (query: string) => `No items found for "${query}".`,
    clearSearch: "Clear search",
    seeAll: "See all in library",
    seeAllDescription: "Open full search with this filter",
    quickLookTitle: "Preview (→)",
    open: "Open",
    copyShort: "Copy",
    copiedShort: "Copied",
    invalidUrl: "Invalid or unsafe URL.",
    promptCopiedMessage: "Prompt copied to clipboard.",
    codeCopiedMessage: "Code copied to clipboard.",
    copyContentFailed: "Couldn't copy the content.",
    quickLook: {
      regionLabel: "Item preview",
      close: "Close preview",
      openPage: "Open page",
      linkCopiedShort: "Link copied",
      copyLinkShort: "Copy link",
      copiedShort: "Copied!",
      copyPrompt: "Copy prompt",
      copyCode: "Copy code",
      copyGenericFailed: "Couldn't copy.",
      invalidUrl: "Invalid or unsafe URL.",
      linkCopiedMessage: "Link copied to clipboard.",
      promptCopiedMessage: "Prompt copied to clipboard.",
      codeCopiedMessage: "Code copied to clipboard.",
    },
  },
  export: {
    heading: "Export data",
    description:
      "Download a complete copy of all your links, prompts, and tags.",
    jsonButton: "Export JSON (Full)",
    htmlButton: "Export HTML Bookmarks",
    exporting: "Exporting...",
    jsonSuccess: "JSON backup exported successfully.",
    htmlSuccess: "HTML bookmarks exported successfully.",
  },
  backup: {
    cardHeading: "Restore backup",
    cardDescription:
      "Upload a JSON file exported from Muvuca to rebuild links, prompts, and tags. Nothing that already exists is deleted.",
    restoreButton: "Restore JSON backup",
    dialogTitle: "Restore backup",
    dialogDescription:
      "The file is read only in this browser. Restoring only adds: nothing is deleted or overwritten.",
    selectFile: "Select a .json file up to 10 MB",
    fileTooLarge: "The file exceeds the 10 MB limit.",
    invalidJson: "This file isn't valid JSON.",
    incompatibleFile:
      "This file isn't a Muvuca backup compatible with this version.",
    emptyFile:
      "This backup file is empty. No changes will be made to your library.",
    restoring: "Restoring backup...",
    counts: {
      tags: "Tags",
      items: "Items",
      ignored: "Ignored",
    },
    resultCounts: {
      itemsRestored: "Items restored",
      tagsCreated: "Tags created",
      alreadyExisted: "Already existed",
    },
    chooseAnother: "Choose another",
    confirmRestore: "Confirm restore",
    restoringShort: "Restoring...",
    done: "Done",
    restored: "Backup restored.",
  },
  states: {
    error: {
      genericTitle: "Something went wrong",
      boundary: {
        root: {
          title: "Something went wrong",
          message: "Couldn't complete that action. Please try again.",
        },
        app: {
          title: "Couldn't load your account",
          message: "Please try again in a few seconds.",
        },
        library: {
          title: "Couldn't open your library",
          message: "Try loading your items again.",
        },
        tag: {
          title: "Couldn't open this tag",
          message: "Try loading the hierarchy and items again.",
        },
        tags: {
          title: "Couldn't open the tag list",
          message: "Try loading the tags again.",
        },
        notFound: {
          title: "Page not found",
          message: "Check the address or head back to your library.",
          backToLibrary: "Go to library",
        },
      },
    },
  },
  validation: {
    invalid: "Invalid value.",
    required: "Required field.",
    contentRequired: "Content is required.",
    validUrlRequired: "Enter a valid http or https URL.",
    duplicateTagAssociation: "A tag can only be associated once.",
    displayNameTooLong: "Use up to 50 characters.",
    displayNameNoControlChars: "Text only, no line breaks.",
    duplicateItemTags: "Duplicate tags on this item.",
    duplicateFileTags: "Duplicate tags in the file.",
    tagSelfParentInFile: "A tag can't be its own parent.",
    invalidTagHierarchy: "Invalid tag hierarchy.",
    itemReferencesMissingTag: "Item references a tag that doesn't exist.",
    duplicatePayloadTags: "Duplicate tags in the payload.",
    invalidLinkUrl: "Invalid link URL.",
    invalidCodeComponentUrl: "Invalid code component URL.",
    missingItemTagInPayload: "Item tag missing from the payload.",
    invalidNormalizedUrl: "Invalid normalized URL.",
    duplicateFolders: "Duplicate folders.",
    invalidFolderHierarchy: "Invalid folder hierarchy.",
    invalidBookmarkFolder: "Invalid bookmark folder.",
    passwordMismatch: "Passwords don't match.",
    avatarUnsupportedFormat:
      "Unsupported format. Use JPEG, PNG, WebP, GIF, or AVIF.",
    avatarTooLarge: "Use an image up to 2 MB.",
  },
  errors: {
    unknown: "Something went wrong. Please try again.",
    invalidInput: "Invalid input.",
    operationFailed: "Couldn't complete the operation.",
    invalidItem: "Invalid item.",
    itemNotFound: "Item not found.",
    itemOrTagsUnavailable: "Item or tags are unavailable.",
    itemLoadFailed: "Couldn't load the item.",
    checkItemFields: "Check the item's fields.",
    duplicateLink: "That link is already in your library.",
    invalidItemData: "Invalid item data.",
    invalidTagReference: "One or more tags are invalid.",
    tagSelfParent: "A tag can't be its own parent.",
    tagCycle: "This change would create a cycle in the tag hierarchy.",
    tagMaxDepth: "The tag hierarchy exceeds the maximum depth of 6 levels.",
    tagDescendantMaxDepth:
      "This change would push descendant tags past the maximum depth of 6 levels.",
    tagNotFound: "Tag not found.",
    tagBatchInvalid: "Select between 1 and 500 tags.",
    tagMoveNameCollision:
      "One of the tags has the same name as another tag at the destination.",
    checkTagFields: "Check the tag's fields.",
    invalidTag: "Invalid tag.",
    invalidParentTag: "Invalid parent tag.",
    invalidTagData: "Invalid tag data.",
    duplicateTagName: "A tag with that name already exists at this level.",
    duplicateTagNameField:
      "That name is already used at this level of the hierarchy.",
    tagsLoadFailed: "Couldn't load tags.",
    previewNotFound: "Preview not found.",
    previewUpdateFailed: "Couldn't update the preview.",
    invalidPreviewScope: "Invalid preview scope.",
    previewRescheduleFailed: "Couldn't update previews.",
    previewJobsLoadFailed: "Couldn't fetch preview jobs.",
    accountResetFailed: "Couldn't delete your account data.",
    invalidEmail: "Enter a valid email.",
    invalidCredentials: "Invalid email or password.",
    tooManyAttempts: "Too many attempts. Wait a few minutes and try again.",
    signOutFailed: "Couldn't sign out. Please try again.",
    recoverySessionExpired:
      'Your reset session expired or is invalid. Request a new link from "Forgot password".',
    passwordSameAsCurrent:
      "The new password must be different from the current one.",
    weakPassword: "That password is too weak. Choose a stronger password.",
    invalidTheme: "Invalid theme.",
    themeUpdateFailed: "Couldn't update the appearance.",
    displayNameSaveFailed: "Couldn't save your name.",
    avatarSaveFailed: "Couldn't save your photo.",
    avatarRemoveFailed: "Couldn't remove your photo.",
    backupNeedsRevalidation: "The backup file needs to be checked again.",
    backupRestoreFailed: "Couldn't complete the restore.",
    backupHierarchyInvalid: "The file's tag hierarchy is invalid.",
    invalidBookmarks: "Invalid bookmarks.",
    duplicateCheckFailed: "Couldn't check for duplicates.",
    importNeedsRevalidation: "The import needs to be checked again.",
    bookmarkImportFailed: "Couldn't complete the import.",
    exportFailed: "Failed to generate export data.",
    spotlightLoadFailed: "Couldn't load data for quick search.",
    spotlightSearchFailed: "Error searching items in quick search.",
    unreadableFile: "Couldn't read this file.",
  },
  landing: {
    skipToContent: "Skip to main content",
    common: {
      getStarted: "Open Muvuca",
      seeHow: "Take a closer look",
      login: "Log in",
    },
    nav: {
      about: "About",
      features: "Features",
      how: "How it works",
      faq: "FAQ",
    },
    header: {
      navAriaLabel: "Main navigation",
      mobileNavAriaLabel: "Mobile navigation",
      openMenu: "Open navigation menu",
      menuTitle: "Explore Muvuca",
      menuDescription: "Sections and access to Muvuca.",
    },
    media: {
      pending: "Image to be supplied",
      landscapeFormat: "SCREENSHOT · 16:9",
      detailFormat: "CROP OR VIDEO · 4:3",
    },
    hero: {
      eyebrow: "A little library for your best discoveries",
      title: "Save what inspires. Find it when you need it.",
      subtitle:
        "Links, prompts, and code snippets. Your own place to collect good discoveries and come back to them when the time is right.",
      assetTitle: "Your library, in one picture.",
      assetDescription:
        "A screenshot of the dark library with a curated selection of links, prompts, and tags.",
    },
    intro: {
      label: "A place of your own",
      title:
        "The internet is a beautiful mess. Your saved discoveries don't have to be.",
      body: "A reference for your next project. An article to read later. That prompt that worked just right. Muvuca brings it all into a visual library, organized your way and easy to find again.",
      signature: "FEWER OPEN TABS. MORE IDEAS WITHIN REACH.",
    },
    features: {
      label: "Inside Muvuca",
      title: "Keep it close. Give it a place.",
      subtitle:
        "From your first reference to an entire collection: a library to save, organize, and rediscover.",
      tabsLabel: "Muvuca features",
      items: [
        {
          id: "library",
          number: "01",
          label: "Library",
          assetTitle: "Your library, in one picture.",
          assetDescription:
            "An overview of the dark library, with real cards and thumbnails.",
          caption:
            "Links, prompts, and code live together in one visual library.",
        },
        {
          id: "tags",
          number: "02",
          label: "Tags",
          assetTitle: "Connections that make sense.",
          assetDescription:
            "A screenshot or video of tags, subtags, and their related items.",
          caption:
            "An item can belong to more than one tag. Your organization follows your thinking.",
        },
        {
          id: "search",
          number: "03",
          label: "Search",
          assetTitle: "From a thought to a result.",
          assetDescription:
            "A screenshot or video of a search, showing the query and its results.",
          caption:
            "Find things by title, domain, description, or prompt content.",
        },
        {
          id: "prompts",
          number: "04",
          label: "Prompts",
          assetTitle: "Ready to use again.",
          assetDescription:
            "A screenshot or video of an open prompt and the copy action.",
          caption:
            "Save what worked. Copy the full prompt whenever you need it.",
        },
        {
          id: "import",
          number: "05",
          label: "Import",
          assetTitle: "Bring your discoveries along.",
          assetDescription:
            "A screenshot of the import preview, including folders and the bookmark summary.",
          caption:
            "Import browser bookmarks. Folders and subfolders become tags.",
        },
      ],
    },
    details: {
      label: "Made for your way of thinking",
      title: "Saving is just the beginning.",
      subtitle:
        "The value is in coming back to an idea. With context, without retracing every step.",
      items: [
        {
          number: "02",
          label: "Connected organization",
          title: "One idea can belong in more than one place.",
          body: "Group your references with tags and subtags. Open a tag to find its items and everything in its descendants, without duplicates.",
          note: "Different paths to the same discovery.",
          assetTitle: "Tags in context.",
          assetDescription:
            "A close-up of the tag tree and related items. Reuse asset 02.",
        },
        {
          number: "03",
          label: "Find it again",
          title: "Remember a word. Let search do the rest.",
          body: "Search for what you remember and narrow it down by tag or item type. The right reference stays within reach, even as your library grows.",
          note: "Less searching. More creating.",
          assetTitle: "One search, useful results.",
          assetDescription:
            "A short search recording or a close-up of the results. Reuse asset 03.",
        },
        {
          number: "05",
          label: "Bring what's already yours",
          title: "A new home for your bookmarks.",
          body: "Import your browser's bookmarks file and review the preview before confirming. Your folder structure becomes a tree of tags.",
          note: "Start with the collection you've already built.",
          assetTitle: "From bookmarks to library.",
          assetDescription:
            "A close-up of the import preview, with folders and counts. Reuse asset 05.",
        },
      ],
    },
    faq: {
      label: "Frequently asked questions",
      title: "Before you save your first idea.",
      subtitle: "A few answers to help you get to know Muvuca.",
      items: [
        {
          question: "What can I save in Muvuca?",
          answer:
            "Links to web pages, prompts, and code snippets. Add descriptions and tags to keep the context behind each discovery.",
        },
        {
          question: "How are tags different from folders?",
          answer:
            "An item can have several tags. Tags can also have subtags: opening a parent tag shows its own items and those of its descendants, without duplicate results.",
        },
        {
          question: "Can I bring my browser bookmarks?",
          answer:
            "Yes. Export your bookmarks as an HTML file from your browser and import it into Muvuca. Review a preview before confirming, and your folders and subfolders become tags.",
        },
        {
          question: "Is my library public?",
          answer:
            "No. Your library is private and linked to your account. Muvuca does not offer public sharing of your items.",
        },
        {
          question: "Does it work on mobile and in other languages?",
          answer:
            "Yes. Muvuca works in desktop and mobile browsers, with a Brazilian Portuguese and English interface. The content you save stays in its original language.",
        },
      ],
    },
    cta: {
      title: "Your next idea might be in what you've already saved.",
      subtitle:
        "Give your discoveries a place. And yourself an easy way back to them.",
    },
    footer: {
      tagline: "What you save stays easy to find.",
      navAriaLabel: "Footer",
      language: "Language",
      copyright: (year: number) => `© ${year} Muvuca. All rights reserved.`,
    },
  },
};
