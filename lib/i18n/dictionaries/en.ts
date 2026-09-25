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
    deleteDialog: {
      title: (name: string) => `Delete “${name}”?`,
      description: (name: string) =>
        `Direct child tags move under “${name}”'s own parent (or become root tags, if “${name}” was already a root). Associated items aren't deleted -- they only lose the association with this tag.`,
      confirm: "Delete tag",
      deleting: "Deleting...",
      deleted: "Tag deleted.",
    },
    tree: {
      collapse: (name: string) => `Collapse ${name}`,
      expand: (name: string) => `Expand ${name}`,
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
    inspector: {
      emptyTitle: "No tag selected",
      emptyDescription:
        "Pick a tag in the tree to edit its name, color, parent and description.",
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
      openSpotlight: "Open quick search (Spotlight)",
      clear: "Clear search",
      searching: "Searching…",
    },
    tagNav: {
      heading: "Tags",
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
        title: "Toggle theme (Light / Dark / System)",
        description: "Change the interface appearance",
        keywords: ["theme", "dark", "light", "appearance", "mode"],
      },
    },
    themeChangedDark: "Theme changed to dark.",
    themeChangedLight: "Theme changed to light.",
    searchPlaceholder: "Search links, prompts, code, or actions...",
    searchInputLabel: "Type to search",
    dialogLabel: "Muvuca Spotlight — Quick search",
    closeSpotlight: "Close quick search",
    filterByTag: "Filter by tag:",
    allTag: "All",
    noResults: (query: string) => `No results found for "${query}".`,
    execute: "Run",
    navigate: "navigate",
    select: "select",
    peek: "peek",
    close: "close",
    spaceKey: "space",
    resultCount: (n: number) => `${n} ${n === 1 ? "result" : "results"}`,
    quickLookAria: "Peek item (Quick Look)",
    quickLookTitle: "Peek item (Space)",
    open: "Open",
    copyShort: "Copy",
    copiedShort: "Copied",
    invalidUrl: "Invalid or unsafe URL.",
    promptCopiedMessage: "Prompt copied to clipboard.",
    codeCopiedMessage: "Code copied to clipboard.",
    copyContentFailed: "Couldn't copy the content.",
    badges: {
      link: "LINK",
      prompt: "PROMPT",
      code: "CODE",
    },
    quickLook: {
      regionLabel: "Item preview (Quick Look)",
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
      getStarted: "Get started",
      seeHow: "See how it works",
      login: "Log in",
      library: "Library",
    },
    nav: {
      home: "Home",
      overview: "Overview",
      tags: "Tags",
      search: "Search",
      import: "Import",
    },
    header: {
      navAriaLabel: "Main navigation",
      mobileNavAriaLabel: "Mobile navigation",
      openSpotlight: "Open Spotlight",
      openSearchMobile: "Open quick search",
      openMenu: "Open navigation menu",
      menuTitle: "Navigation menu",
      menuDescription: "Links and actions for the landing page",
    },
    demo: {
      promptCopied: "Prompt copied.",
      copyPrompt: "Copy prompt",
      copy: "Copy",
      copied: "Copied",
      promptBadge: "PROMPT",
      openItem: (title: string) => `Open ${title}`,
      openItemNewTab: (title: string) => `Open ${title} in a new tab`,
      tags: {
        skills: "Skills",
        design: "Design",
        branding: "Branding",
        productDesign: "Product Design",
        desenvolvimento: "Development",
        frontend: "Front-end",
        ia: "AI & Prompts",
        produtividade: "Productivity",
        referencias: "References",
        artigos: "Articles",
      },
      items: {
        item1: {
          title: "Linear — Issue tracking for high-velocity teams",
          description:
            "A dense interface reference with keyboard navigation and millisecond response times.",
        },
        item2: {
          title: "System Prompt: Senior Code Reviewer",
          description:
            "Audit focused on database integrity, RLS, and no any types.",
          contentPreview:
            "Act as a Senior Code Reviewer. Review the diff prioritizing: 1. Security and RLS; 2. Strict typing, no any; 3. WCAG AA accessibility; 4. Parameterized queries.",
        },
        item3: {
          title: "Minimal Gallery — Curated web design inspiration",
          description:
            "A curated directory focused on editorial grids, precise typography, and elegant micro-interactions.",
        },
        item4: {
          title: "Refactoring Accessible Components",
          description:
            "Best-practice guide for keyboard navigation and WCAG 2.2 AA compliance.",
          contentPreview:
            "Replace clickable divs with <button>, add aria-label to icon buttons, and link error messages with aria-describedby.",
        },
        item5: {
          title: "Tailwind CSS v4 Documentation",
          description:
            "Complete guide to the new CSS engine built on native variables and cascade layers.",
        },
        item6: {
          title: "Token Terminal — Financial metrics for crypto",
          description:
            "A grid reference with 1px hairlines, Geist Mono typography, and a dense, calm composition.",
        },
        item7: {
          title: "Pure Bookmark DTO Extractor",
          description:
            "Safe algorithm for parsing a Netscape Bookmarks file client-side with an inert DOMParser.",
          contentPreview:
            "function parseBookmarksHtml(rawHtml: string): BookmarkFolderTree {\n  const parser = new DOMParser();\n  const doc = parser.parseFromString(rawHtml, 'text/html');\n  // strictly extracts textContent and href attributes\n}",
        },
      },
    },
    hero: {
      title: "Organize the muvuca you save on the internet.",
      subtitle:
        "Links and prompts organized in a visual library built to help you find again what you decided to keep.",
      openSearchAria: "Open the demo's quick search",
      searchPlaceholder: "Search your library...",
      gridView: "Grid view",
      listView: "List view",
      clearFilter: "Clear",
      allItems: "All items",
      itemsShown: (count: number, filtered: boolean) =>
        `(${count} ${count === 1 ? "item shown" : "items shown"}${filtered ? " by the filter" : ""})`,
      activeFilter: (tagName: string) => `Active filter: ${tagName}`,
    },
    problem: {
      title:
        "The real work starts when you forget where you saved something and have to find it again.",
      subtitle:
        "Most bookmarking tools treat your links as one endless, unsorted list.",
      steps: {
        scattered: {
          title: "Bookmarks scattered everywhere",
          description:
            "Links end up trapped across dozens of tabs, notes, and different tools, with no central place to retrieve them later.",
        },
        rigid: {
          title: "Folders that don't match how you think",
          description:
            "A technical or visual reference almost always makes sense in more than one context. Traditional folders force you to pick just one drawer.",
        },
        lost: {
          title: "Searching takes more effort than the content is worth",
          description:
            "As the library grows, remembering which folder or device you saved something in takes more work than just finding what you need.",
        },
        solution: {
          title: "Instant retrieval from any angle",
          description:
            "Hierarchical tags and automatic rollup power an instant search that scans titles, descriptions, and prompts in milliseconds.",
        },
      },
      visuals: {
        scattered: {
          tabsOpen: "28 tabs open",
          mobileNotes: "Phone notes",
          codeReviewTitle: "System Prompt: Code Review",
          desktopTabs: "Browser tabs (desktop)",
          uiPatternsTitle: "Linear UI Patterns & Architecture",
          bookmarksOther: "Bookmarks / Other",
          tailwindDocsTitle: "Tailwind CSS v4 Documentation",
          fragmented: "Fragmented across 3 different devices",
        },
        rigid: {
          treeLabel: "Traditional Rigid Tree",
          oneFolderPerItem: "1 folder per item",
          bookmarksRoot: "📁 Bookmarks",
          work: "├── 📁 Work",
          design: "│ └── 📁 Design",
          designSystemTitle: "📄 Design System & Tokens",
          stuckInDesign: "Stuck in Design",
          personal: "└── 📁 Personal",
          frontendEngineering: " └── 📁 Front-end Engineering",
          caption:
            "This link is both design and code, but the folder only accepts one of the two.",
        },
        lost: {
          searchAttempt: "Search attempt",
          noMatch: "No match",
          queryExample: '"typescript refactor prompt"',
          untitledGist: "Untitled (1), https://gist.github.com/...",
          linkSavedOn: "Link saved on 12/04/2024",
          newTabAiTool: "New tab - AI Tool",
          caption: "The prompt is saved somewhere, but search can't reach it.",
        },
        muvuca: {
          tagRollupActive: "Tag Rollup Active",
          instantRetrieval: "Instant retrieval",
          searchQuery: "refactor",
          itemsFound: (n: number) => `${n} items found`,
          readyToCopy: "Ready to copy",
          iaTagShort: "AI",
          caption: "Found through any child tag or the parent tag.",
        },
      },
    },
    galleryOverview: {
      title: "A library that stays readable as it grows.",
      subtitle:
        "Muvuca gathers your items in a visual gallery, keeps search close at hand, and uses tags for context without turning your collection into a tree you can't navigate.",
      heading: "Featured Collection",
      itemsCount: (count: number) => `(${count} items)`,
      filterAriaLabel: "Filter collection by type",
      filters: {
        all: "All",
        links: "Links",
        prompts: "Prompts",
      },
    },
    tagRollup: {
      title: "Organize once, find it any way after.",
      subtitle:
        "Tags can have children, and an item can belong to more than one. Open a parent tag and Muvuca automatically gathers the items from the whole hierarchy, without duplicating content.",
      treeLabel: "Tag Tree (Click to try it)",
      activeTagLabel: "Active tag:",
      itemsAggregated: (count: number, subtagCount: number) =>
        `${count} items aggregated ${subtagCount > 0 ? `(from ${subtagCount} subtags)` : ""}`,
      filterByTag: (name: string) => `Filter by ${name}`,
    },
    searchDemo: {
      title: "You don't need to remember where you saved it.",
      subtitle:
        "Search by title, domain, description, or content, and combine search with your tags to quickly narrow your library down to what matters.",
      inputAriaLabel: "Interactive search demo",
      placeholder: "Search by title, domain, description, or prompt...",
      tryQueries: "Try these searches:",
      openSpotlightShortcut: "Open Spotlight (⌘K)",
      resultsCount: (count: number) =>
        `${count} ${count === 1 ? "result found" : "results found"}`,
      noResults: (query: string) => `No item matches the search "${query}".`,
    },
    itemTypes: {
      title: "Links and prompts live in the same collection.",
      subtitle:
        "Each item type has its own visual identity and contextual actions, without breaking the library's grid.",
      linkCardLabel: "Reference Link",
      linkCardDescription:
        "A dense interface reference with keyboard navigation and millisecond response times.",
      linkCaption:
        "The domain stands alone, in Geist Mono. The tag inherits the item's hierarchy. Opening the link always uses",
      promptCardLabel: "AI Prompt & Instruction",
      copyPromptDemoAria: "Copy demo prompt",
      promptCardDescription:
        "System instruction for OWASP security audits and type consistency.",
      promptContent:
        "Act as a Senior Code Reviewer. Review the diff prioritizing:\n1. Data security and RLS integrity;\n2. Strict TypeScript typing with no any;\n3. WCAG 2.2 AA accessibility (keyboard and contrast);\n4. No concatenated SQL queries.\n\nReturn objective findings categorized by severity.",
      collapse: "Collapse preview",
      expand: "View full prompt",
      promptCardCaption:
        "The preview keeps the original formatting, and copying goes to the clipboard in one click. Expanding shows the full prompt.",
    },
    import: {
      title: "Bring in your bookmarks without losing your folder structure.",
      subtitle:
        "Import your browser bookmarks and turn folders and subfolders into a tag hierarchy before confirming what enters your library.",
      stagesLabel: "Migration steps:",
      stage1: "1. Bookmarks File",
      stage2: "2. Safe Analysis in the Browser",
      stage3: "3. Muvuca Tag Tree",
      sourceHeading: "Browser Bookmarks (.html)",
      sourceCount: "114 links",
      folderDesign: "📁 Design",
      folderInspiration: "↳ 📁 Inspiration (54 links)",
      folderTools: "↳ 📁 Tools (18 links)",
      folderDev: "📁 Development",
      folderReact: "↳ 📁 React & Next.js (24 links)",
      folderAi: "↳ 📁 AI & LLMs (18 links)",
      conversion: "1:1 conversion",
      targetHeading: "Muvuca Tag Structure",
      tagsCreated: "6 tags created",
      tagDesign: "# Design",
      tagInspiration: "# Inspiration [child tag]",
      tagTools: "# Tools [child tag]",
      tagDev: "# Development",
      tagReact: "# React & Next.js [child tag]",
      tagAi: "# AI & LLMs [child tag]",
      parserNote: "Inert client-side parser (no SSRF, no raw HTML sent)",
      parserCode:
        "const parser = new DOMParser();\nconst doc = parser.parseFromString(rawHtml, 'text/html');\n// Pure extraction of textContent and validated href attributes (http/https only)\n// The server only receives the structured DTO of tags and links.",
      caption:
        "The file is processed locally. Before saving, you see how many items are valid and how many are duplicates.",
    },
    collections: {
      title: "Organize every collection your own way.",
      subtitle:
        "Build the taxonomy that makes sense to you and group any kind of interest. Muvuca shapes itself around your personal collection.",
      items: {
        skills: {
          title: "Skills & Engineering",
          countHint: "128 items",
          tags: ["Front-end", "Next.js", "Security"],
          description:
            "Technical articles, docs, and snippets essential to your daily coding flow.",
        },
        design: {
          title: "Design & Art Direction",
          countHint: "94 items",
          tags: ["Typography", "Branding", "Design System"],
          description:
            "Visual references, editorial catalogs, and high-fidelity components.",
        },
        prompts: {
          title: "AI Prompts",
          countHint: "42 items",
          tags: ["Code Review", "Writing", "Refactoring"],
          description:
            "System instructions, agent templates, and reusable commands ready to copy.",
        },
        wishlist: {
          title: "Wishlist",
          countHint: "31 items",
          tags: ["Books", "Hardware", "Gifts"],
          description:
            "Things to buy and recommendations, without the mess of lists scattered across notes.",
        },
        videos: {
          title: "Videos & Talks",
          countHint: "56 items",
          tags: ["Talks", "Tutorials", "Podcasts"],
          description: "Recordings you want to watch calmly over the weekend.",
        },
        articles: {
          title: "Articles & Essays",
          countHint: "67 items",
          tags: ["Philosophy", "Product", "Web History"],
          description:
            "Long reads and essays saved for future reference and research.",
        },
      },
    },
    cta: {
      title: "Turn your muvuca into a library.",
      subtitle: "Keep what matters without relying on memory to find it later.",
    },
    commandPalette: {
      dialogAriaLabel: "Quick search in the demo library",
      placeholder: "Search links, prompts, domains, or tags...",
      inputAriaLabel: "Type a search",
      closeAria: "Close quick search",
      filterByTagLabel: "Filter by tag:",
      allTags: (count: number) => `All (${count})`,
      noResults: (query: string) => `No item found for "${query}".`,
      open: "Open",
      navigateHint: "navigate",
      selectHint: "select",
      closeHint: "close",
      itemCount: (count: number) =>
        `${count} ${count === 1 ? "item" : "items"}`,
    },
    footer: {
      tagline: "What you save stays easy to find.",
      navAriaLabel: "Footer",
      copyright: (year: number) => `© ${year} Muvuca. All rights reserved.`,
    },
  },
};
