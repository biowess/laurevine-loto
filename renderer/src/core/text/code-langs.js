// Pure: fence language ids with labels, and extension lookup for Insert Code from File.
export const LANGS = [
  ['', 'Plain text'], ['bash', 'Bash'], ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['css', 'CSS'], ['dart', 'Dart'], ['diff', 'Diff'],
  ['dockerfile', 'Dockerfile'], ['elixir', 'Elixir'], ['go', 'Go'], ['graphql', 'GraphQL'], ['haskell', 'Haskell'], ['html', 'HTML'],
  ['ini', 'INI'], ['java', 'Java'], ['javascript', 'JavaScript'], ['json', 'JSON'], ['kotlin', 'Kotlin'], ['latex', 'LaTeX'], ['lua', 'Lua'],
  ['makefile', 'Makefile'], ['markdown', 'Markdown'], ['matlab', 'MATLAB'], ['perl', 'Perl'], ['php', 'PHP'], ['powershell', 'PowerShell'],
  ['python', 'Python'], ['r', 'R'], ['ruby', 'Ruby'], ['rust', 'Rust'], ['scala', 'Scala'], ['scss', 'SCSS'], ['shell', 'Shell'], ['sql', 'SQL'],
  ['swift', 'Swift'], ['toml', 'TOML'], ['tsx', 'TSX'], ['typescript', 'TypeScript'], ['xml', 'XML'], ['yaml', 'YAML'],
];

const EXT = {
  sh: 'bash', bash: 'bash', zsh: 'bash', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp', css: 'css', dart: 'dart', diff: 'diff', patch: 'diff',
  ex: 'elixir', exs: 'elixir', go: 'go', graphql: 'graphql', hs: 'haskell', html: 'html', htm: 'html', ini: 'ini', java: 'java', js: 'javascript', mjs: 'javascript',
  cjs: 'javascript', jsx: 'javascript', json: 'json', kt: 'kotlin', tex: 'latex', lua: 'lua', md: 'markdown', m: 'matlab', pl: 'perl', php: 'php', ps1: 'powershell',
  py: 'python', r: 'r', rb: 'ruby', rs: 'rust', scala: 'scala', scss: 'scss', sql: 'sql', swift: 'swift', toml: 'toml', ts: 'typescript', tsx: 'tsx', xml: 'xml',
  yml: 'yaml', yaml: 'yaml',
};

export const langFromPath = (path) => {
  const name = String(path).split(/[\\/]/).pop().toLowerCase();
  if (name === 'dockerfile' || name === 'makefile') return name;
  return EXT[name.slice(name.lastIndexOf('.') + 1)] || '';
};
