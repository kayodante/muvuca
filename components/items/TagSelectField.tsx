"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { swatchClassFor } from "@/lib/tags/colors";
import { indentClassFor } from "@/lib/tags/indent";
import {
  buildTagTree,
  filterTagTree,
  flattenTreeWithDepth,
  type FlatTag,
} from "@/lib/tags/tree";
import type { Tag } from "@/lib/database/queries/tags";

export interface TagSelectFieldProps {
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
  placeholder = "Selecionar tags...",
  className,
}: TagSelectFieldProps) {
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
  const [searchQuery, setSearchQuery] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const closeDropdown = () => {
    setIsOpen(false);
    setSearchQuery("");
  };

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

  const isDisabled = disabled || tags.length === 0;

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
          aria-label="Tags selecionadas"
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
                aria-label={`Remover tag ${tag.name}`}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--motion-fast) ease-out-muvuca hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed motion-reduce:transition-none"
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
          {tags.length === 0
            ? "Nenhuma tag cadastrada ainda"
            : selectedIds.length === 0
              ? placeholder
              : `${selectedIds.length} tag${
                  selectedIds.length > 1 ? "s" : ""
                } selecionada${selectedIds.length > 1 ? "s" : ""}`}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-(--motion-fast)",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && !isDisabled && (
        <div className="z-50 mt-1 flex max-h-64 w-full flex-col overflow-hidden rounded-lg border border-border bg-popover text-sm text-popover-foreground shadow-overlay">
          {/* Search filter input */}
          <div className="flex items-center border-b border-border px-2.5 py-1.5">
            <SearchIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
            <input
              id={searchInputId}
              type="text"
              autoFocus
              placeholder="Buscar tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options listbox */}
          <div
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-label="Tags disponíveis"
            className="max-h-48 overflow-y-auto p-1"
          >
            {flattenedOptions.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                Nenhuma tag encontrada.
              </div>
            ) : (
              flattenedOptions.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => toggleTag(tag.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleTag(tag.id);
                      }
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
          </div>
        </div>
      )}
    </div>
  );
}
