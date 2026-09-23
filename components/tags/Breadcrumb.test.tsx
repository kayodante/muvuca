import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/tags/Breadcrumb";

describe("Breadcrumb", () => {
  it("keeps collapsed ancestors available to screen readers", () => {
    const markup = renderToStaticMarkup(
      <Breadcrumb
        currentName="Artigos"
        ancestors={[
          { id: "1", name: "Biblioteca", path: "biblioteca" },
          { id: "2", name: "Tecnologia", path: "biblioteca/tecnologia" },
          { id: "3", name: "Frontend", path: "biblioteca/tecnologia/frontend" },
          {
            id: "4",
            name: "React",
            path: "biblioteca/tecnologia/frontend/react",
          },
        ]}
      />,
    );

    expect(markup).toContain("Tags intermediárias: Biblioteca");
    expect(markup).toContain("Tecnologia");
  });

  it("links every ancestor to its own friendly path", () => {
    const markup = renderToStaticMarkup(
      <Breadcrumb
        currentName="Animados"
        ancestors={[
          { id: "1", name: "Design", path: "design" },
          {
            id: "2",
            name: "Recursos & Assets",
            path: "design/recursos-assets",
          },
          {
            id: "3",
            name: "Ícones",
            path: "design/recursos-assets/icones",
          },
        ]}
      />,
    );

    expect(markup).toContain('href="/t/design"');
    expect(markup).toContain('href="/t/design/recursos-assets"');
    expect(markup).toContain('href="/t/design/recursos-assets/icones"');
    expect(markup).not.toContain('href="/tags/');
    expect(markup).toContain("Animados");
  });
});
