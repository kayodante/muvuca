import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TagChip } from "./TagChip";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function render(node: React.ReactElement) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root?.render(node);
  });
  return container;
}

describe("TagChip", () => {
  it("button mode: renders a real button with aria-pressed and calls onClick", () => {
    const handleClick = vi.fn();
    const dom = render(
      <TagChip name="Dev" colorToken="lime" selected onClick={handleClick} />,
    );

    const button = dom.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.textContent).toContain("Dev");

    act(() => {
      button?.click();
    });
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("link mode: renders an anchor, not a button, when href is given", () => {
    const dom = render(
      <TagChip name="Dev" colorToken="lime" href="/tags/dev" />,
    );

    expect(dom.querySelector("a")).not.toBeNull();
    expect(dom.querySelector("button")).toBeNull();
  });

  it("span mode: renders inert markup when neither href nor onClick is given", () => {
    const dom = render(<TagChip name="Dev" colorToken="lime" />);

    expect(dom.querySelector("button")).toBeNull();
    expect(dom.querySelector("a")).toBeNull();
    expect(dom.querySelector("span[title]")).not.toBeNull();
  });
});
