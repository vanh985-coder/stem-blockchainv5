/** Parse only complete decimal integers in the page-code domain. */
export function parsePageCodeInput(text: string): number | null {
  const value = text.trim();
  return /^\d{1,2}$/.test(value) ? Number(value) : null;
}
