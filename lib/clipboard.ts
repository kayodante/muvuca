/**
 * Reusable clipboard copy utility with modern Clipboard API support
 * and legacy fallback via textarea + document.execCommand('copy').
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to execCommand fallback
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
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
