"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { cssDurationToMs } from "@/lib/motion/duration";
import { swatchClassFor } from "@/lib/tags/colors";
import { indentClassFor } from "@/lib/tags/indent";
import {
  buildTagTree,
  filterTagTree,
  flattenTreeWithDepth,
  type FlatTag,
} from "@/lib/tags/tree";
import type { Tag } from "@/lib/database/queries/tags";
import type { ActionResult } from "@/lib/utils/result";
import { TAG_NAME_MAX_LENGTH } from "@/lib/validation/tag";
import { useDictionary } from "@/lib/i18n/client";
import { ShimmerText } from "@/components/ui/shimmer-text";

interface TagSelectFieldProps {
  id?: string;
  name?: string;
  tags: Tag[] | FlatTag[];
  defaultValue?: string[];
  value?: string[];
  onChange?: (selectedIds: string[]) => void;
  disabled?: boolean;
  error?: string;
  ariaDescribedBy?: string;
  placeholder?: string;
  className?: string;
  /**
   * Trigger label shown when `tags` is empty. `tags=[]` is ambiguous on its
   * own (no tags exist yet vs. still loading vs. load failed) — callers that
   * pass an empty array for a reason other than "no tags exist" must supply
   * an accurate label here.
   */
  emptyLabel?: string;
  /**
   * Whether `emptyLabel` describes a loading state (renders as `ShimmerText`
   * instead of static text). Explicit flag, not a string match on
   * `emptyLabel` -- matching against a fixed Portuguese prefix broke the
   * shimmer for any other locale's loading copy.
   */
  emptyLoading?: boolean;
  /**
   * Creates a root tag named after the search query and resolves with its
   * id once `tags` already includes it. When provided, the popup offers
   * "create" for a query no existing tag matches, and the field stays
   * usable with zero tags.
   */
  onCreateTag?: (name: string) => Promise<ActionResult<{ id: string }>>;
}

export function TagSelectField({
  id: explicitId,
  name = "tagIds",
  tags,
  defaultValue,
  value,
  onChange,
  disabled = false,
  error,
  ariaDescribedBy,
  placeholder,
  className,
  emptyLabel,
  emptyLoading = false,
  onCreateTag,
}: TagSelectFieldProps) {
  const t = useDictionary();
  const resolvedPlaceholder = placeholder ?? t.items.tagSelect.placeholder;
  const resolvedEmptyLabel = emptyLabel ?? t.items.tagSelect.emptyLabel;
  const generatedId = useId();
  const id = explicitId ?? generatedId;
  const listboxId = `${id}-listbox`;
  const searchInputId = `${id}-search`;

  const isControlled = value !== undefined;
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(
    defaultValue ?? [],
  );
  const selectedIds = isControlled ? value : internalSelectedIds;

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Map of tags by ID for instant O(1) lookup
  const tagsById = useMemo(() => {
    const map = new Map<string, Tag | FlatTag>();
    for (const tag of tags) {
      map.set(tag.id, tag);
    }
    return map;
  }, [tags]);

  // Selected tags array in current order
  const selectedTags = useMemo(() => {
    return selectedIds
      .map((tagId) => tagsById.get(tagId))
      .filter((tag): tag is Tag | FlatTag => tag !== undefined);
  }, [selectedIds, tagsById]);

  // Filtered & hierarchically flattened tags for listbox
  const flattenedOptions = useMemo(() => {
    if (tags.length === 0) return [];
    const tree = buildTagTree(tags as FlatTag[]);
    const filteredTree = searchQuery.trim()
      ? filterTagTree(tree, searchQuery)
      : tree;
    return flattenTreeWithDepth(filteredTree);
  }, [tags, searchQuery]);

  // Mesma normalização de `tags.name_normalized` (lower(btrim(name))): com um
  // nome idêntico já na lista, criar só produziria DUPLICATE ou um homônimo
  // em outro nível -- quem quiser isso cria em /tags.
  const createName = searchQuery.trim();
  const canCreate =
    onCreateTag !== undefined &&
    createName !== "" &&
    !tags.some(
      (tag) => tag.name.trim().toLowerCase() === createName.toLowerCase(),
    );

  const updateSelection = (newIds: string[]) => {
    if (!isControlled) {
      setInternalSelectedIds(newIds);
    }
    onChange?.(newIds);
  };

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      updateSelection(selectedIds.filter((item) => item !== tagId));
    } else {
      updateSelection([...selectedIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    updateSelection(selectedIds.filter((item) => item !== tagId));
  };

  const createTag = async () => {
    if (!onCreateTag || !canCreate || creating) return;
    setCreating(true);
    setCreateError(null);
    let result: ActionResult<{ id: string }>;
    try {
      result = await onCreateTag(createName);
    } catch {
      // Server Action rejeita em falha de rede; sem isso o pending nunca sai.
      result = {
        ok: false,
        code: "UNKNOWN",
        message: t.errors.operationFailed,
      };
    } finally {
      setCreating(false);
    }
    if (!result.ok) {
      setCreateError(result.message);
      return;
    }
    updateSelection([...selectedIds, result.data.id]);
    setSearchQuery("");
    // A opção de criar some junto com a busca; o foco volta para o filtro em
    // vez de cair no body.
    searchInputRef.current?.focus();
  };

  // As opções ficam fora da ordem de Tab (tabIndex -1): o popup inteiro é uma
  // parada só, e as setas andam entre as opções. ArrowDown no filtro entra na
  // lista; ArrowUp na primeira opção volta para o filtro.
  const optionElements = () =>
    Array.from(
      listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ??
        [],
    );

  const moveOptionFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    const options = optionElements();
    const index = options.indexOf(event.currentTarget);
    const targets: Record<string, HTMLElement | null | undefined> = {
      ArrowDown: options[index + 1],
      ArrowUp: options[index - 1] ?? searchInputRef.current,
      Home: options[0],
      End: options.at(-1),
    };
    if (!(event.key in targets)) return;
    // Na última opção, ArrowDown não tem destino, mas ainda não deve rolar a página.
    event.preventDefault();
    targets[event.key]?.focus();
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setIsClosing(true);
    setSearchQuery("");
    setCreateError(null);
    const duration = cssDurationToMs(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--dropdown-close-dur",
      ),
      120,
    );
    closeTimerRef.current = window.setTimeout(
      () => setIsClosing(false),
      duration,
    );
  };

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close when pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const isDisabled = disabled || (tags.length === 0 && !onCreateTag);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col gap-2", className)}
    >
      {/* Hidden inputs to pass data via standard FormData */}
      {selectedIds.map((tagId) => (
        <input key={tagId} type="hidden" name={name} value={tagId} />
      ))}

      {/* Selected tags chips area */}
      {selectedTags.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5"
          role="list"
          aria-label={t.items.tagSelect.selectedTagsLabel}
        >
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              role="listitem"
              className="text-label-md inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-secondary pr-1.5 pl-2.5 text-secondary-foreground"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  swatchClassFor(tag.colorToken),
                )}
              />
              <span className="truncate">{tag.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeTag(tag.id)}
                aria-label={t.items.tagSelect.removeTag(tag.name)}
                className="relative inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca after:absolute after:-inset-1 after:content-[''] hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed motion-reduce:transition-none"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Combobox Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        id={id}
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-invalid={!!error || undefined}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
          } else {
            if (closeTimerRef.current !== null) {
              window.clearTimeout(closeTimerRef.current);
            }
            setIsClosing(false);
            setIsOpen(true);
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors duration-(--motion-fast) ease-out-muvuca outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none",
          error &&
            "border-destructive focus-visible:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        )}
      >
        <span
          className={
            selectedIds.length === 0
              ? "text-muted-foreground"
              : "text-foreground"
          }
        >
          {tags.length === 0 ? (
            emptyLoading ? (
              <ShimmerText text={resolvedEmptyLabel} />
            ) : (
              resolvedEmptyLabel
            )
          ) : selectedIds.length === 0 ? (
            resolvedPlaceholder
          ) : (
            t.items.tagSelect.selectedCount(selectedIds.length)
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast)",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Popover */}
      {(isOpen || isClosing) && !isDisabled && (
        <div
          aria-hidden={isClosing || undefined}
          inert={isClosing}
          className={cn(
            "t-dropdown z-50 mt-1 flex max-h-64 w-full flex-col overflow-hidden rounded-lg border border-border bg-popover text-sm text-popover-foreground shadow-overlay [--transform-origin:top_left]",
            isOpen ? "is-open" : "is-closing",
          )}
        >
          {/* Search filter input */}
          {/* O input não tem anel próprio (ficaria cortado pelo
              overflow-hidden do popup); o foco aparece como a borda de baixo
              engrossando na cor de foco, sem deslocar o layout. */}
          <div className="flex items-center border-b border-border px-2.5 py-1.5 has-[input:focus-visible]:border-ring has-[input:focus-visible]:shadow-[inset_0_-1px_0_var(--color-ring)]">
            <SearchIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              id={searchInputId}
              type="text"
              aria-label={t.items.tagSelect.searchLabel}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  optionElements()[0]?.focus();
                }
                // Enter no filtro nunca envia o formulário do item; sem
                // nenhuma tag casando, cria a digitada.
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (flattenedOptions.length === 0) void createTag();
                }
              }}
              // Não é autofocus de carregamento de página (o caso que a regra
              // protege): este input só existe depois que o usuário abriu o
              // popup, e mover o foco para o filtro é o comportamento esperado
              // de um combobox. Sem isso o foco fica no trigger e digitar não
              // filtra nada.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              placeholder={t.items.tagSelect.searchPlaceholder}
              maxLength={TAG_NAME_MAX_LENGTH}
              // Congela o nome enquanto a criação está em voo: o rótulo
              // "Criando tag" mostra o que foi enviado, não o que foi digitado.
              readOnly={creating}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCreateError(null);
              }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options listbox */}
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label={t.items.tagSelect.availableTagsLabel}
            className="max-h-48 overflow-y-auto p-1"
          >
            {flattenedOptions.length === 0 && !canCreate ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                {t.items.tagSelect.noTagsFound}
              </div>
            ) : (
              flattenedOptions.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => toggleTag(tag.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleTag(tag.id);
                        return;
                      }
                      moveOptionFocus(e);
                    }}
                    className={cn(
                      "relative flex cursor-pointer items-center justify-between gap-2 rounded-md py-1.5 pr-2 text-sm transition-colors duration-(--motion-fast) ease-out-muvuca outline-none select-none hover:bg-accent/70 focus:bg-accent focus:text-accent-foreground motion-reduce:transition-none",
                      tag.depth > 0 ? indentClassFor(tag.depth) : "pl-2",
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          swatchClassFor(tag.colorToken),
                        )}
                      />
                      <span className="truncate">{tag.name}</span>
                    </div>
                    {isSelected && (
                      <CheckIcon className="size-4 shrink-0 text-primary" />
                    )}
                  </div>
                );
              })
            )}
            {canCreate && (
              <div
                role="option"
                aria-selected={false}
                aria-disabled={creating || undefined}
                tabIndex={-1}
                onClick={() => void createTag()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void createTag();
                    return;
                  }
                  moveOptionFocus(e);
                }}
                className="relative flex cursor-pointer items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-sm transition-colors duration-(--motion-fast) ease-out-muvuca outline-none select-none hover:bg-accent/70 focus:bg-accent focus:text-accent-foreground aria-disabled:cursor-wait motion-reduce:transition-none"
              >
                <PlusIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="truncate">
                  {creating ? (
                    <ShimmerText
                      text={t.items.tagSelect.creatingTag(createName)}
                    />
                  ) : (
                    t.items.tagSelect.createTag(createName)
                  )}
                </span>
              </div>
            )}
          </div>
          {createError !== null && (
            <p
              role="alert"
              className="border-t border-border px-2.5 py-2 text-xs text-destructive"
            >
              {createError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
