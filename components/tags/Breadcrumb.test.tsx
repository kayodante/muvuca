import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/tags/Breadcrumb";

describe("Breadcrumb", () => {
  it("keeps collapsed ancestors available to screen readers", () => {
    const markup = renderToStaticMarkup(
      <Breadcrumb
        currentName="Artigos"
        ancestors={[
          { id: "1", name: "Biblioteca", depth: 1 },
          { id: "2", name: "Tecnologia", depth: 2 },
          { id: "3", name: "Frontend", depth: 3 },
          { id: "4", name: "React", depth: 4 },
        ]}
      />,
    );

    expect(markup).toContain("Tags intermediárias: Biblioteca");
    expect(markup).toContain("Tecnologia");
  });
});
