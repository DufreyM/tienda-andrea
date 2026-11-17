// Optimiza fotos en el navegador antes de subirlas: corrige orientación, reduce tamaño y
// genera dos versiones (detalle y miniatura). Así se ahorra almacenamiento y transferencia
// del plan gratuito y las páginas cargan más rápido.
import { IMAGE_LIMITS } from '../config';

export class ImageError extends Error {}

export interface ProcessedImage {
  large: Blob;
  thumb: Blob;
  width: number;
  height: number;
  ext: 'webp' | 'jpg';
  type: 'image/webp' | 'image/jpeg';
}

const MB = 1024 * 1024;

export function validateFile(file: File): void {
  const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!looksLikeImage) {
    throw new ImageError(`«${file.name}» no es una imagen. Usa fotos JPG, PNG o WebP.`);
  }
  if (file.size > IMAGE_LIMITS.maxInputBytes) {
    throw new ImageError(
      `«${file.name}» pesa ${(file.size / MB).toFixed(1)} MB. El máximo es ${IMAGE_LIMITS.maxInputBytes / MB} MB.`,
    );
  }
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    // Alternativa para navegadores que no decodifican con createImageBitmap.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new ImageError(`No pudimos leer «${file.name}». Prueba con una foto JPG, PNG o WebP.`);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function render(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxSide: number,
  preferWebp: boolean,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number; webp: boolean }> {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('Tu navegador no permite procesar imágenes.');
  // Fondo blanco: las tarjetas son blancas y JPEG no admite transparencia.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  if (preferWebp) {
    const webp = await toBlob(canvas, 'image/webp', quality);
    if (webp && webp.type === 'image/webp') return { blob: webp, width, height, webp: true };
  }
  const jpg = await toBlob(canvas, 'image/jpeg', quality);
  if (!jpg) throw new ImageError('No pudimos optimizar la imagen.');
  return { blob: jpg, width, height, webp: false };
}

export async function processImage(
  file: File,
  opts: { largeSide?: number; thumbSide?: number; minSide?: number } = {},
): Promise<ProcessedImage> {
  validateFile(file);
  const largeSide = opts.largeSide ?? IMAGE_LIMITS.largeSide;
  const thumbSide = opts.thumbSide ?? IMAGE_LIMITS.thumbSide;
  const minSide = opts.minSide ?? IMAGE_LIMITS.minSide;

  const decoded = await decode(file);
  try {
    if (Math.min(decoded.width, decoded.height) < minSide) {
      throw new ImageError(
        `«${file.name}» es muy pequeña (${decoded.width}×${decoded.height} px). Usa una foto de al menos ${minSide} px por lado.`,
      );
    }
    let large = await render(decoded.source, decoded.width, decoded.height, largeSide, true, 0.82);
    if (large.blob.size > IMAGE_LIMITS.maxUploadBytes) {
      large = await render(decoded.source, decoded.width, decoded.height, Math.round(largeSide * 0.75), large.webp, 0.7);
    }
    if (large.blob.size > IMAGE_LIMITS.maxUploadBytes) {
      throw new ImageError(`«${file.name}» sigue pesando más de 2 MB después de optimizarla. Prueba con otra foto.`);
    }
    const thumb = await render(decoded.source, decoded.width, decoded.height, thumbSide, large.webp, 0.8);
    return {
      large: large.blob,
      thumb: thumb.blob,
      width: large.width,
      height: large.height,
      ext: large.webp ? 'webp' : 'jpg',
      type: large.webp ? 'image/webp' : 'image/jpeg',
    };
  } finally {
    decoded.close();
  }
}

export function newId(): string {
  return crypto.randomUUID();
}
