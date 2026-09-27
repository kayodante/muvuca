"use client";

import { useMemo, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  buildTagTree,
  flattenTreeWithDepth,
  getNamePath,
  type FlatTag,
} from "@/lib/tags/tree";
import { indentClassFor } from "@/lib/tags/indent";
import { useDictionary } from "@/lib/i18n/client";
import { AncestorPath } from "./AncestorPath";
import { TagDot } from "./TagDot";

/** Value reserved for "no parent" (tag becomes/stays root). */
const ROOT_VALUE = "";

type Option = {
  id: string;
  name: string;
  colorToken: string | null;
  depth: number;
  /** Ancestor names root-first, not including the option's own name. */
  ancestorNames: string[];
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function pathLabel(option: Pick<Option, "name" | "ancestorNames">): string {
  return [...option.ancestorNames, option.name].join(" / ");
}

/**
 * Searchable single-select combobox for choosing a tag's parent, built
 * directly on `@base-ui/react/combobox` -- the only two consumers are
 * TagForm ("Tag pai") and MoveTagsDialog ("Destino"), so this stays a
 * one-off component rather than a generic `components/ui/combobox`.
 *
 * `value`/`onValueChange` follow the same `null` = nothing chosen yet,
 * `""` = root convention as the callers' own state (MoveTagsDialog's
 * `destination`); `defaultValue` is for TagForm's uncontrolled usage.
 * Fully controls the input's displayed text so it can show the resolved
 * value's full name path when idle and a blank field to search in while
 * open, independent of whatever Base UI would otherwise sync automatically.
 */
export function TagParentPicker({
  "aria-labelledby": ariaLabelledBy,
  name,
  flatTags,
  excludedIds,
  value,
  defaultValue,
  onValueChange,
  placeholder,
}: {
  "aria-labelledby": string;
  /** Forwarded to the root so the picked value still submits in FormData. */
  name?: string;
  flatTags: FlatTag[];
  excludedIds: ReadonlySet<string>;
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
}) {
  const t = useDictionary();

  const byId = useMemo(
    () => new Map(flatTags.map((tag) => [tag.id, tag])),
    [flatTags],
  );

  const options: Option[] = useMemo(() => {
    const rootOption: Option = {
      id: ROOT_VALUE,
      name: t.tags.editor.noParent,
      colorToken: null,
      depth: 0,
      ancestorNames: [],
    };
    const tagOptions = flattenTreeWithDepth(buildTagTree(flatTags))
      .filter((tag) => !excludedIds.has(tag.id))
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        colorToken: tag.colorToken,
        depth: tag.depth,
        ancestorNames: getNamePath(tag, byId).slice(0, -1),
      }));
    return [rootOption, ...tagOptions];
  }, [flatTags, excludedIds, byId, t]);

  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const labelFor = (id: string | null): string => {
    if (id === null) return "";
    return optionsById.get(id)?.name != null
      ? pathLabel(optionsById.get(id)!)
      : "";
  };

  const initialValue = value !== undefined ? value : (defaultValue ?? null);
  const [inputValue, setInputValueState] = useState(() =>
    labelFor(initialValue),
  );
  const [open, setOpen] = useState(false);
  const latestValueRef = useRef(initialValue);
  const isEditingRef = useRef(false);

  const normalizedQuery = normalize(inputValue.trim());
  const hasQuery = normalizedQuery.length > 0;
  const filtered = hasQuery
    ? options.filter((option) =>
        normalize(pathLabel(option)).includes(normalizedQuery),
      )
    : options;

  return (
    <Combobox.Root
      name={name}
      value={value}
      defaultValue={defaultValue}
      inputValue={inputValue}
      onInputValueChange={(next) => {
        isEditingRef.current = true;
        setInputValueState(next);
      }}
      onValueChange={(next) => {
        latestValueRef.current = next;
        isEditingRef.current = false;
        setInputValueState(labelFor(next));
        onValueChange?.(next);
      }}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          if (!isEditingRef.current) setInputValueState("");
        } else {
          isEditingRef.current = false;
          setInputValueState(labelFor(latestValueRef.current));
        }
      }}
      itemToStringLabel={labelFor}
      autoHighlight
    >
      {/*
        A plain div, not `Combobox.InputGroup`: that part renders its own
        `role="group"` landmark, which has no assistive value here (the
        Input already carries the accessible name via `aria-labelledby`)
        and would sit unlabeled among the page's real landmarks.
      */}
      <div className="flex w-full items-center gap-1.5 rounded-md border border-input bg-transparent py-2 pr-2 pl-3 transition-[color,background-color,border-color,box-shadow] duration-(--motion-fast) ease-out-muvuca has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50 motion-reduce:transition-none dark:bg-input/30">
        <Combobox.Input
          aria-labelledby={ariaLabelledBy}
          placeholder={placeholder}
          // Searching tag names, not writing prose: autocorrect/autocapitalize
          // would fight arbitrary user-chosen names on mobile keyboards.
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          inputMode="search"
          onKeyDown={(event) => {
            // The internal handler only stops Enter from submitting the
            // form when an item is highlighted; guard the case with no
            // highlight too (e.g. an empty query) -- Enter must never
            // leave the picker and submit the surrounding form while open.
            if (open && event.key === "Enter") event.preventDefault();
          }}
          // Typing a search query is not "changing the field" for the
          // caller's own dirty-tracking form -- only `onValueChange` (an
          // actual pick) should mark it dirty, same as the old `Select`.
          // The native `input` event otherwise bubbles straight through
          // this React tree to a wrapping `<form onChange>`.
          onChange={(event) => event.stopPropagation()}
          className="h-6 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Combobox.Trigger
          // Icon-only: needs its own accessible name, distinct from the
          // input's (reusing that name would announce it as a duplicate
          // of the field label instead of a discrete "open" control).
          aria-label={t.tags.parentPicker.toggleOptions}
          className="shrink-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Combobox.Icon
            render={
              <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
            }
          />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <Combobox.Popup className="t-dropdown relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
            <Combobox.List>
              {filtered.length === 0 ? (
                <div className="text-body-sm px-1.5 py-6 text-center text-muted-foreground">
                  {t.tags.parentPicker.noResults}
                </div>
              ) : (
                filtered.map((option) => (
                  <TagParentPickerItem
                    key={option.id}
                    option={option}
                    indent={!hasQuery}
                  />
                ))
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function TagParentPickerItem({
  option,
  indent,
}: {
  option: Option;
  indent: boolean;
}) {
  const fullLabel = pathLabel(option);

  return (
    <Combobox.Item
      value={option.id}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        indent && indentClassFor(option.depth),
      )}
    >
      <div
        title={fullLabel}
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
      >
        {option.colorToken && (
          <TagDot
            colorToken={option.colorToken}
            className="size-1.5 shrink-0"
          />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <AncestorPath
            names={option.ancestorNames}
            className="text-body-sm text-muted-foreground"
          />
          {/* Ancestors give way first (AncestorPath's own internal
              truncation); the name only shrinks/truncates once there's no
              room left, instead of overflowing uncut past this row's
              overflow-hidden. */}
          <span className="max-w-full min-w-0 truncate">{option.name}</span>
        </span>
      </div>
      <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <CheckIcon aria-hidden="true" className="pointer-events-none" />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  );
}
