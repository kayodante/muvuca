import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/require-user";
import { LandingClientWrapper } from "@/components/landing/LandingClientWrapper";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function HomePage() {
  // Every route in this app is dynamic by design: the nonce-based CSP from
  // `proxy.ts` only applies to dynamically rendered pages.
  await connection();

  // Straight to the library when signed in: the landing is only relevant to
  // visitors. Identity comes from `getClaims()`; the target is a constant,
  // so no `safeRedirectTarget`.
  const user = await getOptionalUser();
  if (user) {
    redirect("/library");
  }

  return (
    // Landing page is dark-only (no light variant); `dark` here forces the
    // dark tokens regardless of OS preference or any user theme setting.
    <div className="dark flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30 selection:text-foreground">
      <LandingClientWrapper cta={<LandingCTA />} footer={<LandingFooter />} />
    </div>
  );
}
