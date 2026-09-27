import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { AncestorPath } from "./AncestorPath";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function render(names: string[]) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(<AncestorPath names={names} />);
  });
  return container;
}

describe("AncestorPath", () => {
  it("renders nothing for a root tag (no ancestors)", () => {
    const dom = render([]);
    expect(dom.firstChild).toBeNull();
  });

  it("carries the full path in title and keeps the immediate parent readable", () => {
    const dom = render(["Trabalho", "Projetos", "Cliente X"]);
    const root = dom.firstElementChild as HTMLElement;
    expect(root.title).toBe("Trabalho / Projetos / Cliente X");
    // The immediate parent never sits inside the truncating (RTL) span --
    // it's the part that disambiguates and must stay visible regardless of
    // available width.
    expect(root.textContent).toContain("Cliente X");
  });

  it("still shows the sole ancestor when there is only one", () => {
    const dom = render(["Trabalho"]);
    const root = dom.firstElementChild as HTMLElement;
    expect(root.title).toBe("Trabalho");
    expect(root.textContent).toContain("Trabalho");
  });
});
