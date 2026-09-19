/**
 * Reusable clipboard copy utility with modern Clipboard API support
 * and legacy fallback via textarea + document.execCommand('copy').
 *
 * Accepts a pending `Promise<string>` because a copy action may only learn
 * the text after a round trip (a card copies the item's full body, which the
 * list never loaded). WebKit invalidates the click's transient activation
 * across an await, so writing the resolved string would be refused -- and the
 * execCommand fallback is gesture-gated too, leaving no path at all. The
 * promise form hands the still-pending value to `ClipboardItem`, which keeps
 * the activation alive until it settles.
 */
export async function copyToClipboard(
  text: string | Promise<string>,
): Promise<boolean> {
  if (typeof text !== "string" && supportsDeferredWrite()) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": text.then(
            (value) => new Blob([value], { type: "text/plain" }),
          ),
        }),
      ]);
      return true;
    } catch {
      // Either the text never arrived or the write was refused; the paths
      // below decide whether anything is still worth trying.
    }
  }

  let resolved: string;
  try {
    resolved = typeof text === "string" ? text : await text;
  } catch {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(resolved);
      return true;
    } catch {
      // Continue to execCommand fallback
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = resolved;
      textarea.readOnly = true;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }

  return false;
}

function supportsDeferredWrite() {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}
