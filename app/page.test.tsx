import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOptionalUserMock, redirectMock, connectionMock } = vi.hoisted(
  () => ({
    getOptionalUserMock: vi.fn(),
    redirectMock: vi.fn().mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT: ${url}`);
    }),
    connectionMock: vi.fn(),
  }),
);

vi.mock("next/server", () => ({
  connection: connectionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/require-user", () => ({
  getOptionalUser: getOptionalUserMock,
}));

vi.mock("@/components/landing/LandingClientWrapper", () => ({
  LandingClientWrapper: () => <div data-testid="landing" />,
}));

vi.mock("@/components/landing/LandingCTA", () => ({
  LandingCTA: () => <div data-testid="landing-cta" />,
}));

vi.mock("@/components/landing/LandingFooter", () => ({
  LandingFooter: () => <div data-testid="landing-footer" />,
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para /library quando há sessão, sem renderizar a landing", async () => {
    getOptionalUserMock.mockResolvedValue({
      id: "user-1",
      email: "dev@muvuca.local",
    });

    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT: /library");

    expect(redirectMock).toHaveBeenCalledWith("/library");
  });

  it("renderiza a landing sem redirecionar quando não há sessão", async () => {
    getOptionalUserMock.mockResolvedValue(null);

    const element = await HomePage();

    expect(redirectMock).not.toHaveBeenCalled();
    expect(element).toBeDefined();
  });
});
