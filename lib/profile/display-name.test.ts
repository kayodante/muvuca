import { describe, expect, it } from "vitest";

import { displayNameSchema, initialsOf } from "./display-name";

describe("displayNameSchema", () => {
  it("apara espaços e mantém o nome", () => {
    expect(displayNameSchema.parse("  Kayo Dante  ")).toBe("Kayo Dante");
  });

  it("vazio ou só espaço vira null (limpa o nome)", () => {
    expect(displayNameSchema.parse("")).toBeNull();
    expect(displayNameSchema.parse("   ")).toBeNull();
  });

  it("aceita 50 caracteres e rejeita 51", () => {
    expect(displayNameSchema.safeParse("a".repeat(50)).success).toBe(true);
    expect(displayNameSchema.safeParse("a".repeat(51)).success).toBe(false);
  });

  it("conta code points como o char_length do banco, não UTF-16", () => {
    // 50 emoji = 100 unidades UTF-16, mas 50 code points: válido no banco.
    expect(displayNameSchema.safeParse("🦊".repeat(50)).success).toBe(true);
    expect(displayNameSchema.safeParse("🦊".repeat(51)).success).toBe(false);
  });

  it("rejeita caractere de controle no meio do nome", () => {
    expect(displayNameSchema.safeParse("Kayo\nDante").success).toBe(false);
    expect(displayNameSchema.safeParse("Kayo\u0000").success).toBe(false);
  });

  it("rejeita o que não é string", () => {
    expect(displayNameSchema.safeParse(null).success).toBe(false);
    expect(displayNameSchema.safeParse(42).success).toBe(false);
  });
});

describe("initialsOf", () => {
  it("usa primeira e última palavra", () => {
    expect(initialsOf("Kayo Dante")).toBe("KD");
    expect(initialsOf("maria da silva")).toBe("MS");
  });

  it("uma palavra vira uma letra", () => {
    expect(initialsOf("kayodante@gmail.com")).toBe("K");
  });

  it("não parte emoji nem acento", () => {
    expect(initialsOf("🦊 Raposa")).toBe("🦊R");
    expect(initialsOf("élis")).toBe("É");
  });

  it("pega o grafema inteiro: bandeira, tom de pele, ZWJ, acento decomposto", () => {
    expect(initialsOf("🇧🇷 Brasil")).toBe("🇧🇷B");
    expect(initialsOf("👋🏽 Oi")).toBe("👋🏽O");
    expect(initialsOf("👩‍💻 Dev")).toBe("👩‍💻D");
    expect(initialsOf("élis")).toBe("É");
  });

  it("vazio vira ?", () => {
    expect(initialsOf("   ")).toBe("?");
  });
});
