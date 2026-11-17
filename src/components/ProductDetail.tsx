import { useState } from 'preact/hooks';
import { publicImageUrl } from '../lib/config';
import { AVAILABILITY_LABEL, formatPrice, productInquiryMessage, whatsappLink } from '../lib/format';
import type { ProductDetailData, Settings } from '../lib/types';
import Icon from './Icon';
import ProductImage from './ProductImage';

interface Props {
  product: ProductDetailData;
  settings: Pick<Settings, 'whatsapp' | 'business_name'>;
  /** URL pública del producto, incluida en el mensaje de WhatsApp. */
  url: string;
  /** En la vista previa del administrador se usan URLs locales de imágenes aún no subidas. */
  imageUrls?: { large: string; thumb: string }[];
  preview?: boolean;
}

/**
 * Detalle del producto. Se usa en la página pública y en la vista previa del administrador,
 * para que lo que se revisa antes de publicar sea exactamente lo que verá la clientela.
 */
export default function ProductDetail({ product, settings, url, imageUrls, preview = false }: Props) {
  const [active, setActive] = useState(0);
  const images = product.images.map((img, i) => ({
    ...img,
    large: imageUrls?.[i]?.large ?? publicImageUrl(img.path),
    thumb: imageUrls?.[i]?.thumb ?? publicImageUrl(img.thumb_path),
  }));
  const current = images[Math.min(active, images.length - 1)];
  const price = formatPrice(product.price, product.currency);
  const wa = whatsappLink(settings, productInquiryMessage(product.name, url));
  const paragraphs = product.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div class="detail">
      <div class="detail__gallery">
        <div class="detail__main">
          {current ? (
            <ProductImage
              key={current.id}
              src={current.large}
              alt={current.alt}
              width={current.width}
              height={current.height}
              eager
            />
          ) : (
            <ProductImage src={null} alt={product.name} />
          )}
        </div>
        {images.length > 1 && (
          <ul class="detail__thumbs" aria-label="Fotos del producto">
            {images.map((img, i) => (
              <li key={img.id}>
                <button
                  type="button"
                  class="detail__thumb"
                  aria-pressed={i === active}
                  aria-label={`Ver foto ${i + 1} de ${images.length}: ${img.alt}`}
                  onClick={() => setActive(i)}
                >
                  <ProductImage src={img.thumb} alt="" width={120} height={120} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div class="detail__info">
        {product.category && (
          <p class="detail__category">
            {preview ? (
              <span>{product.category.name}</span>
            ) : (
              <a href={`/catalogo?categoria=${product.category.slug}`}>{product.category.name}</a>
            )}
          </p>
        )}
        {product.brand && <p class="detail__brand">{product.brand}</p>}
        <h1 class="detail__title">{product.name || 'Sin nombre'}</h1>

        <div class="detail__facts">
          {product.availability === 'disponible' ? (
            <span class="badge badge--ok">
              <Icon name="check" size={14} /> {AVAILABILITY_LABEL.disponible}
            </span>
          ) : (
            <span class="badge badge--warn">
              <Icon name="alert" size={14} /> {AVAILABILITY_LABEL.agotado}
            </span>
          )}
          {product.presentation && (
            <span class="badge badge--info">
              <Icon name="box" size={14} /> {product.presentation}
            </span>
          )}
        </div>

        {price && <p class="detail__price">{price}</p>}

        <div class="detail__desc">
          {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p class="muted">Sin descripción.</p>}
        </div>

        {wa && (
          <div class="detail__cta">
            <a
              class="btn btn--whatsapp btn--block"
              href={preview ? undefined : wa}
              target="_blank"
              rel="noopener"
              aria-disabled={preview ? 'true' : undefined}
            >
              <Icon name="whatsapp" /> Consultar por WhatsApp
            </a>
            <p class="detail__hint muted">
              Se abrirá WhatsApp con un mensaje que incluye el nombre y el enlace de este producto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
