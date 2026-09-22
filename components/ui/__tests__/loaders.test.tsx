import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { MatrixLoader } from "../matrix-loader";
import { ShimmerText } from "../shimmer-text";
import { NumberPopIn } from "../number-pop-in";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

async function renderComponent(element: React.ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(element);
  });
  return container;
}

describe("MatrixLoader", () => {
  it("renders 16 dots with rounded gaps and orbit variant", async () => {
    const dom = await renderComponent(
      <MatrixLoader variant="orbit" rounded aria-label="Carregando dados" />,
    );
    const matrix = dom.querySelector(
      '.t-matrix[data-variant="orbit"][data-rounded="true"]',
    );
    expect(matrix).not.toBeNull();
    const dots = dom.querySelectorAll(".t-matrix i");
    expect(dots).toHaveLength(16);

    // 4 corners (0, 3, 12, 15) must have is-gap
    const gaps = dom.querySelectorAll(".t-matrix i.is-gap");
    expect(gaps).toHaveLength(4);

    const statusEl = dom.querySelector('[role="status"][aria-label="Carregando dados"]');
    expect(statusEl).not.toBeNull();
  });

  it("renders scan variant correctly", async () => {
    const dom = await renderComponent(
      <MatrixLoader variant="scan" rounded={false} />,
    );
    const matrix = dom.querySelector('.t-matrix[data-variant="scan"]');
    expect(matrix).not.toBeNull();
    const gaps = dom.querySelectorAll(".t-matrix i.is-gap");
    expect(gaps).toHaveLength(0);
  });
});

describe("ShimmerText", () => {
  it("renders text with t-shimmer and data-text attribute", async () => {
    const dom = await renderComponent(<ShimmerText text="Carregando item…" />);
    const span = dom.querySelector(".t-shimmer");
    expect(span).not.toBeNull();
    expect(span?.getAttribute("data-text")).toBe("Carregando item…");
    expect(span?.textContent).toBe("Carregando item…");
  });
});

describe("NumberPopIn", () => {
  it("renders digits with data-stagger attributes on the last characters", async () => {
    const dom = await renderComponent(<NumberPopIn value="42%" />);
    const group = dom.querySelector(".t-digit-group");
    expect(group).not.toBeNull();
    const digits = dom.querySelectorAll(".t-digit");
    expect(digits).toHaveLength(3);
    // last two digits have data-stagger="1" and "2"
    expect(digits[1]?.getAttribute("data-stagger")).toBe("1");
    expect(digits[2]?.getAttribute("data-stagger")).toBe("2");
  });
});

describe("Button with pendingIndicator", () => {
  it("renders MatrixLoader when pendingIndicator is matrix", async () => {
    const { Button } = await import("../button");
    const dom = await renderComponent(
      <Button pending pendingIndicator="matrix" pendingLabel="Processando...">
        Salvar
      </Button>,
    );
    const button = dom.querySelector('button[aria-busy="true"]');
    expect(button).not.toBeNull();
    const matrix = button?.querySelector(".t-matrix");
    expect(matrix).not.toBeNull();
  });
});
