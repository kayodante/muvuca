/**
 * Reusable clipboard copy utility built on the Clipboard API.
 *
 * Accepts a pending `Promise<string>` because a copy action may only learn
 * the text after a round trip (a card copies the item's full body, which the
 * list never loaded). WebKit invalidates the click's transient activation
 * across an await, so writing the resolved string would be refused. The
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
      // Either the text never arrived or the write was refused; the path
      // below decides whether anything is still worth trying.
    }
  }

  let resolved: string;
  try {
    resolved = typeof text === "string" ? text : await text;
  } catch {
    return false;
  }

  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(resolved);
    return true;
  } catch {
    return false;
  }
}

function supportsDeferredWrite() {
  return (
    typeof ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.write === "function"
  );
}
