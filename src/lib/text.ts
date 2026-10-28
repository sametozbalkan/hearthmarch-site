/**
 * Splits a sentence of copy around a placeholder such as `{email}`, so a view can put a
 * link in its place wherever the language puts it.
 */
export function splitAround(text: string, placeholder: string): [string, string] {
  const at = text.indexOf(placeholder);
  if (at < 0) {
    throw new Error(`"${text}" has no ${placeholder}`);
  }
  return [text.slice(0, at), text.slice(at + placeholder.length)];
}
