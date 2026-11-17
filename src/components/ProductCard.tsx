import { publicImageUrl } from '../lib/config';
import { formatPrice } from '../lib/format';
import type { ProductSummary } from '../lib/types';
import Icon from './Icon';
import ProductImage from './ProductImage';

interface Props {
  product: ProductSummary;
  eager?: boolean;
  headingLevel?: 'h2' | 'h3';
}

export default function ProductCard({ product, eager = false, headingLevel = 'h3' }: Props) {
  const Heading = headingLevel;
  const price = formatPrice(product.price, product.currency);
  return (
    <article class="card">
      <div class="card__media">
        <ProductImage
          src={publicImageUrl(product.image_thumb)}
          alt={product.image_alt ?? product.name}
          width={600}
          height={600}
          eager={eager}
        />
      </div>
      <div class="card__body">
        {product.brand && <span class="card__brand">{product.brand}</span>}
        <Heading class="card__title">
          <a href={`/producto/${product.slug}`}>{product.name}</a>
        </Heading>
        {product.presentation && <span class="card__meta">{product.presentation}</span>}
        <div class="card__foot">
          {price ? <span class="price">{price}</span> : <span class="card__meta">Consultar precio</span>}
          {product.availability === 'agotado' && (
            <span class="badge badge--warn">
              <Icon name="alert" size={14} /> Agotado
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
