// Pure: special character groups (searchable by name or group), and caret insertion of plain text.
const parse = (s) => s.split('|').map((e) => { const c = Array.from(e)[0]; return [c, e.slice(c.length + 1)]; });
const LATIN = parse('à a grave|á a acute|â a circumflex|ã a tilde|ä a diaeresis|å a ring|æ ae ligature|ç c cedilla|è e grave|é e acute|ê e circumflex|ë e diaeresis|ì i grave|í i acute|î i circumflex|ï i diaeresis|ð eth|ñ n tilde|ò o grave|ó o acute|ô o circumflex|õ o tilde|ö o diaeresis|ø o stroke|œ oe ligature|ù u grave|ú u acute|û u circumflex|ü u diaeresis|ý y acute|ÿ y diaeresis|ß sharp s|þ thorn|ā a macron|ă a breve|ą a ogonek|ć c acute|č c caron|ď d caron|đ d stroke|ē e macron|ę e ogonek|ě e caron|ğ g breve|ī i macron|ı dotless i|ł l stroke|ń n acute|ň n caron|ő o double acute|ř r caron|ś s acute|š s caron|ş s cedilla|ť t caron|ū u macron|ů u ring|ű u double acute|ź z acute|ż z dot|ž z caron|ə schwa');
const upper = LATIN.flatMap(([c, n]) => { const u = c.toUpperCase(); return u.length === 1 && u.codePointAt(0) > 127 ? [[u, `capital ${n}`]] : []; });

export const GROUPS = [
  ['Punctuation', parse('… ellipsis|– en dash|— em dash|‘ left single quote|’ right single quote|“ left double quote|” right double quote|« left guillemet|» right guillemet|‹ left single guillemet|› right single guillemet|¡ inverted exclamation|¿ inverted question|• bullet|· middle dot|§ section|¶ pilcrow|† dagger|‡ double dagger|′ prime|″ double prime|‑ non-breaking hyphen|※ reference mark|‽ interrobang')],
  ['Arrows', parse('← left arrow|→ right arrow|↑ up arrow|↓ down arrow|↔ left right arrow|↕ up down arrow|⇐ double left arrow|⇒ double right arrow|⇑ double up arrow|⇓ double down arrow|⇔ double left right arrow|↖ north west arrow|↗ north east arrow|↘ south east arrow|↙ south west arrow|↩ return arrow|↪ right hook arrow|↦ maps to|⟵ long left arrow|⟶ long right arrow|➜ heavy right arrow|↻ clockwise arrow|↺ anticlockwise arrow')],
  ['Maths', parse('± plus minus|× multiplication|÷ division|− minus|≠ not equal|≈ approximately equal|≡ identical|≤ less or equal|≥ greater or equal|∞ infinity|√ square root|∑ sum|∏ product|∫ integral|∂ partial differential|∆ increment|∇ nabla|∈ element of|∉ not element of|∩ intersection|∪ union|⊂ subset|⊃ superset|⊆ subset or equal|⊇ superset or equal|∅ empty set|∀ for all|∃ there exists|¬ not|∧ and|∨ or|∝ proportional|∴ therefore|∵ because|∠ angle|⊥ perpendicular|⊕ circled plus|⊗ circled times|° degree|² squared|³ cubed|½ one half|¼ one quarter|¾ three quarters|ℕ natural numbers|ℤ integers|ℚ rationals|ℝ reals|ℂ complex numbers')],
  ['Currency', parse('$ dollar|€ euro|£ pound|¥ yen|¢ cent|₹ rupee|₽ ruble|₩ won|₺ lira|₪ shekel|₫ dong|₿ bitcoin|₴ hryvnia|₦ naira|₱ peso|฿ baht|₣ franc|¤ generic currency')],
  ['Greek', parse('α alpha|β beta|γ gamma|δ delta|ε epsilon|ζ zeta|η eta|θ theta|ι iota|κ kappa|λ lambda|μ mu|ν nu|ξ xi|ο omicron|π pi|ρ rho|σ sigma|ς final sigma|τ tau|υ upsilon|φ phi|χ chi|ψ psi|ω omega|Γ capital gamma|Δ capital delta|Θ capital theta|Λ capital lambda|Ξ capital xi|Π capital pi|Σ capital sigma|Φ capital phi|Ψ capital psi|Ω capital omega')],
  ['Latin extended', [...LATIN, ...upper]],
  ['Arabic', parse('ء hamza|ا alef|أ alef hamza above|إ alef hamza below|آ alef madda|ب beh|ة teh marbuta|ت teh|ث theh|ج jeem|ح hah|خ khah|د dal|ذ thal|ر reh|ز zain|س seen|ش sheen|ص sad|ض dad|ط tah|ظ zah|ع ain|غ ghain|ف feh|ق qaf|ك kaf|ل lam|م meem|ن noon|ه heh|و waw|ى alef maksura|ي yeh|ـ tatweel|؟ arabic question mark|، arabic comma|؛ arabic semicolon|٠ arabic-indic digit 0|١ arabic-indic digit 1|٢ arabic-indic digit 2|٣ arabic-indic digit 3|٤ arabic-indic digit 4|٥ arabic-indic digit 5|٦ arabic-indic digit 6|٧ arabic-indic digit 7|٨ arabic-indic digit 8|٩ arabic-indic digit 9')],
  ['Symbols', parse('© copyright|® registered|™ trademark|℗ sound recording|№ numero|✓ check mark|✔ heavy check mark|✗ ballot x|✘ heavy ballot x|☑ checked box|☐ empty box|☒ crossed box|★ black star|☆ white star|♥ heart|♦ diamond|♣ club|♠ spade|☀ sun|☁ cloud|☂ umbrella|☎ telephone|✉ envelope|✂ scissors|⚠ warning|⚑ flag|✎ pencil|☺ smiling face|☹ frowning face|♪ eighth note|♫ beamed notes|℃ degree celsius|℉ degree fahrenheit|♻ recycling|⚙ gear')],
];

const ALL = GROUPS.flatMap(([g, items]) => items.map(([c, n]) => [c, n, g.toLowerCase()]));
const NAMES = new Map(ALL.map(([c, n]) => [c, n]));
export const nameOf = (c) => NAMES.get(c);
export const find = (q) => { const t = q.trim().toLowerCase(); return ALL.filter(([c, n, g]) => c === q.trim() || n.includes(t) || g.includes(t)).map(([c, n]) => [c, n]); };

// Replaces every selection with `t`, caret after it -> { changes, selections }
export function insertText({ selections }, t) {
  let d = 0;
  const changes = [], out = [];
  for (const { anchor, head } of selections) {
    const from = Math.min(anchor, head), to = Math.max(anchor, head), p = from + t.length + d;
    changes.push({ from, to, insert: t });
    out.push({ anchor: p, head: p });
    d += t.length - (to - from);
  }
  return { changes, selections: out };
}
