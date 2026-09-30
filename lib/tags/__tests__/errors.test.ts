import { describe, expect, it } from "vitest";

import { tagP0001ErrorKey } from "@/lib/tags/errors";

describe("tagP0001ErrorKey", () => {
  it("mapeia frase conhecida para a chave", () => {
    expect(tagP0001ErrorKey("tag não encontrada")).toBe("tagNotFound");
  });

  it("devolve undefined para frase desconhecida", () => {
    expect(tagP0001ErrorKey("algo inesperado")).toBeUndefined();
  });
});
