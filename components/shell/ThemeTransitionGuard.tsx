"use client";

import { useEffect } from "react";

/**
 * Suspende toda transição durante a troca de tema (`data-theme-switching`,
 * regra em app/globals.css). Dois gatilhos: a classe `light`/`dark` em
 * <html>, que chega pelo re-render do root layout depois do Server Action
 * `setTheme`, e a preferência do SO, que no tema "system" troca as cores sem
 * tocar na classe.
 *
 * O MutationObserver roda como microtask logo após o commit, antes do
 * próximo frame; ler `offsetHeight` força o recálculo de estilo já com o
 * atributo, então nenhuma transição começa -- e uma que um layout effect
 * tenha disparado antes é cancelada quando `transition` vira `none`. O
 * atributo sai dois frames depois, com o tema novo já pintado.
 */
export function ThemeTransitionGuard() {
  useEffect(() => {
    const root = document.documentElement;

    function suspendTransitions() {
      root.setAttribute("data-theme-switching", "");
      void root.offsetHeight;
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          root.removeAttribute("data-theme-switching"),
        ),
      );
    }

    const observer = new MutationObserver(suspendTransitions);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", suspendTransitions);

    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", suspendTransitions);
    };
  }, []);

  return null;
}
