import { useEffect, useRef, useState } from 'preact/hooks';
import Icon from './Icon';

interface Props {
  src: string | null;
  alt: string;
  width?: number | null;
  height?: number | null;
  eager?: boolean;
  sizes?: string;
}

/**
 * Imagen de producto con espacio reservado (evita saltos) y un marcador accesible
 * cuando la imagen falta o no se puede cargar. El atributo data-product-img permite que
 * un script global cubra también las páginas que no se hidratan.
 */
export default function ProductImage({ src, alt, width, height, eager = false, sizes }: Props) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Si la imagen falló antes de hidratar el componente, el evento onError ya pasó.
  useEffect(() => {
    const img = ref.current;
    setFailed(Boolean(img && img.complete && img.naturalWidth === 0));
  }, [src]);
  if (!src || failed) {
    return (
      <div class="img-placeholder" role="img" aria-label={alt ? `${alt} (imagen no disponible)` : 'Imagen no disponible'}>
        <Icon name="image" size={28} />
        <span aria-hidden="true">Imagen no disponible</span>
      </div>
    );
  }
  return (
    <img
      ref={ref}
      class="product-img"
      data-product-img=""
      src={src}
      alt={alt}
      width={width ?? 600}
      height={height ?? 600}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={eager ? 'high' : undefined}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
