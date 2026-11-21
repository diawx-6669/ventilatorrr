/**
 * Display type is wide (Science Gothic at 100-125% width, ~1.1em per letter).
 * Kazakh and English words are often longer than Russian ones, so every big
 * heading is capped by "container width / longest word". Pass the result as a
 * CSS variable and use it in a font-size calc.
 */
export function longestWord(text: string): number {
  return Math.max(4, ...text.split(/\s+/).map((w) => Array.from(w).length));
}

export const fitVar = (text: string) => ({ "--n": longestWord(text) }) as React.CSSProperties;
