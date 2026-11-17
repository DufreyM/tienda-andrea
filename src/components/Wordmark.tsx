// Logotipo tipográfico «Mímate by Andrea»: «Mímate» protagonista y «by Andrea» como firma
// debajo. Es texto real (nítido en cualquier pantalla y legible por lectores de pantalla).

interface Props {
  name: string;
  variant?: 'header' | 'hero' | 'admin';
  sprig?: boolean;
}

/** Separa «Nombre by Firma» en dos líneas; si no hay «by», todo es el nombre principal. */
export function splitBrand(name: string): { main: string; sub: string | null } {
  const m = name.trim().match(/^(.+?)\s+(by\s+.+)$/i);
  return m ? { main: m[1], sub: m[2] } : { main: name.trim(), sub: null };
}

/** Ramita del logotipo (decorativa). */
export function Sprig({ class: className }: { class?: string }) {
  return (
    <svg class={className} viewBox="0 0 128 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--color-leaf)" stroke-width="2.2" stroke-linecap="round">
        <path d="M4 58c14-14 34-20 58-20 18 0 33-6 46-22" />
        <path d="M86 34c10-1 18-3 27-8" />
        <path d="M80 37c11 3 21 5 31 5" />
      </g>
      <g fill="var(--color-leaf)">
        <path d="M50 38c-1-15 9-28 25-33-1 15-10 27-25 33z" />
        <path d="M56 39c10 1 18 9 21 20-11-1-19-9-21-20z" />
      </g>
      <g fill="#d39a95">
        <ellipse cx="105" cy="9" rx="4.2" ry="6.5" transform="rotate(-25 105 9)" />
        <ellipse cx="113" cy="10" rx="4.2" ry="6.5" transform="rotate(25 113 10)" />
        <ellipse cx="116" cy="23" rx="4" ry="6" transform="rotate(70 116 23)" />
        <ellipse cx="121" cy="27" rx="3.6" ry="5.6" transform="rotate(110 121 27)" />
        <ellipse cx="114" cy="40" rx="4" ry="6" transform="rotate(80 114 40)" />
        <ellipse cx="120" cy="44" rx="3.6" ry="5.6" transform="rotate(120 120 44)" />
      </g>
    </svg>
  );
}

export default function Wordmark({ name, variant = 'header', sprig = false }: Props) {
  const { main, sub } = splitBrand(name);
  return (
    <span class={`wordmark wordmark--${variant}`}>
      {sprig && <Sprig class="wordmark__sprig" />}
      <span class="wordmark__main">{main}</span>
      {sub && <span class="wordmark__sub"> {sub}</span>}
    </span>
  );
}
