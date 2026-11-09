// Fonts named in a PDF. Chromium embeds subsets as /BaseFont /ABCDEF+Name; names without that tag are not subset-embedded.
export function embeddedFonts(buf) {
  const s = typeof buf === 'string' ? buf : new TextDecoder('latin1').decode(buf), subset = new Set(), other = new Set();
  for (const m of s.matchAll(/\/BaseFont\s*\/([A-Z]{6}\+)?([^\s/[\]<>()]+)/g)) (m[1] ? subset : other).add(m[2]);
  return { subset: [...subset].sort(), other: [...other].sort() };
}
