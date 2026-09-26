import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type scale in globals.css (`.text-label-md`, `.text-body-sm`, ...) is
 * unknown to tailwind-merge, which reads any `text-*` it can't place as a
 * text color -- so `cn("text-label-md", "text-muted-foreground")` silently
 * dropped the type class. Registering them as font sizes keeps both.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "headline-lg",
            "headline-md",
            "headline-sm",
            "body-lg",
            "body-md",
            "body-sm",
            "label-md",
            "metadata",
            "brand-pixel",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
