// Verifica el contraste WCAG 2.2 de la paleta definida en src/styles/tokens.css.
// Uso: node scripts/contraste.mjs
const hex = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h) => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const pairs = [
  // [texto, fondo, mínimo, descripción]
  ['#2E2724', '#FCF6F0', 4.5, 'Texto principal sobre crema'],
  ['#2E2724', '#FFFFFF', 4.5, 'Texto principal sobre superficie'],
  ['#62574F', '#FCF6F0', 4.5, 'Texto secundario sobre crema'],
  ['#62574F', '#FFFFFF', 4.5, 'Texto secundario sobre superficie'],
  ['#62574F', '#F7E6E3', 4.5, 'Texto secundario sobre rosa suave'],
  ['#B96F6D', '#FCF6F0', 3, 'Logotipo «Mímate» (texto grande) sobre crema'],
  ['#B96F6D', '#FFFFFF', 3, 'Logotipo «Mímate» (texto grande) sobre superficie'],
  ['#FFFFFF', '#9E5458', 4.5, 'Texto blanco sobre botón primario'],
  ['#FFFFFF', '#7A3840', 4.5, 'Texto blanco sobre primario (hover)'],
  ['#9E5458', '#FCF6F0', 4.5, 'Enlace primario sobre crema'],
  ['#9E5458', '#FFFFFF', 4.5, 'Enlace primario sobre superficie'],
  ['#7A3840', '#F7E6E3', 4.5, 'Texto rosa oscuro sobre rosa suave'],
  ['#55603F', '#FCF6F0', 4.5, '«by Andrea» y etiquetas oliva sobre crema'],
  ['#55603F', '#ECEEDF', 4.5, 'Texto oliva sobre oliva suave'],
  ['#55603F', '#FFFFFF', 4.5, 'Texto oliva sobre superficie'],
  ['#1E6B3A', '#E3F1E7', 4.5, 'Éxito sobre fondo de éxito'],
  ['#7A4D00', '#FCF0D6', 4.5, 'Advertencia sobre fondo de advertencia'],
  ['#B3261E', '#FBE5E3', 4.5, 'Error sobre fondo de error'],
  ['#B3261E', '#FFFFFF', 4.5, 'Error sobre superficie'],
  ['#FFFFFF', '#1E6B3A', 4.5, 'Texto blanco sobre botón de WhatsApp'],
  ['#8C7F79', '#FFFFFF', 3, 'Borde de campos sobre superficie (no texto)'],
  ['#8C7F79', '#FCF6F0', 3, 'Borde de campos sobre crema (no texto)'],
  ['#8A8F5A', '#FCF6F0', 3, 'Hojas de la ilustración sobre crema (gráfico)'],
  ['#9E5458', '#FCF6F0', 3, 'Anillo de foco sobre crema'],
  ['#9E5458', '#FFFFFF', 3, 'Anillo de foco sobre superficie'],
];
let ok = true;
for (const [fg, bg, min, desc] of pairs) {
  const r = ratio(fg, bg);
  if (r < min) ok = false;
  console.log(`${r >= min ? 'OK ' : 'NO '} ${r.toFixed(2).padStart(5)}:1 (mín ${min}) ${fg} / ${bg}  ${desc}`);
}
process.exit(ok ? 0 : 1);
