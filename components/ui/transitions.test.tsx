import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toast } from "sonner";

import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }),
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  toast.dismiss();
  await act(async () => root.unmount());
  container.remove();
});

describe("UI transition hooks", () => {
  it("wires modal and panel hooks without replacing Base UI state", async () => {
    await act(async () => {
      root.render(
        <>
          <Dialog open>
            <DialogContent>Dialog</DialogContent>
          </Dialog>
          <AlertDialog open>
            <AlertDialogContent>Alert</AlertDialogContent>
          </AlertDialog>
          <Sheet open>
            <SheetContent>Sheet</SheetContent>
          </Sheet>
        </>,
      );
    });

    expect(
      document.body
        .querySelector('[data-slot="dialog-content"]')
        ?.classList.contains("t-modal"),
    ).toBe(true);
    expect(
      document.body
        .querySelector('[data-slot="alert-dialog-content"]')
        ?.classList.contains("t-modal"),
    ).toBe(true);
    expect(
      document.body
        .querySelector('[data-slot="sheet-content"]')
        ?.classList.contains("t-panel-slide"),
    ).toBe(true);
    expect(
      document.body
        .querySelector('[data-slot="sheet-content"]')
        ?.getAttribute("data-open"),
    ).toBe("true");
  });

  it("wires dropdown and tooltip hooks to the primitive popups", async () => {
    await act(async () => {
      root.render(
        <>
          <DropdownMenu open>
            <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem>Item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select defaultValue="one" open>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="center" side="top">
              <SelectItem value="one">One</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip open>
            <TooltipTrigger>Info</TooltipTrigger>
            <TooltipContent>Tooltip</TooltipContent>
          </Tooltip>
        </>,
      );
    });

    expect(
      document.body
        .querySelector('[data-slot="dropdown-menu-content"]')
        ?.classList.contains("t-dropdown"),
    ).toBe(true);
    expect(
      document.body
        .querySelector('[data-slot="dropdown-menu-content"]')
        ?.getAttribute("data-origin"),
    ).toBe("top-right");
    expect(
      document.body
        .querySelector('[data-slot="select-content"]')
        ?.classList.contains("t-dropdown"),
    ).toBe(true);
    expect(
      document.body
        .querySelector('[data-slot="select-content"]')
        ?.getAttribute("data-origin"),
    ).toBe("bottom-center");
    expect(
      document.body
        .querySelector('[data-slot="tooltip-content"]')
        ?.classList.contains("t-tt"),
    ).toBe(true);
  });

  it("applies the toast hook to Sonner's rendered toasts", async () => {
    await act(async () => {
      root.render(<Toaster />);
    });
    await act(async () => {
      toast("Saved");
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });

    expect(
      document.body
        .querySelector("[data-sonner-toast]")
        ?.classList.contains("t-toast"),
    ).toBe(true);
  });
});
