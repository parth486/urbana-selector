import React, { useEffect } from 'react';
import SecureImage, { prefetchImage } from './SecureImage';
import { Icon } from '@iconify/react';

interface LightboxProps {
  images: string[];
  productCode?: string;
  open: boolean;
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, productCode = '', open, initialIndex = 0, onClose, onIndexChange }) => {
  const [index, setIndex] = React.useState<number>(initialIndex);

  // Diagnostic: always log props and lifecycle info so we can see why lightbox isn't visible
  try {
    const isDebug = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;
    if (isDebug) console.warn('[Lightbox] props', { open, initialIndex, imagesLength: images?.length, productCode });
  } catch (e) {}

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    // Prefetch adjacent images for snappy navigation
    if (!open) return;
    try {
      if (images[index + 1]) prefetchImage(images[index + 1], productCode).catch(()=>{});
      if (images[index - 1]) prefetchImage(images[index - 1], productCode).catch(()=>{});
    } catch (e) {}
  }, [open, index, images, productCode]);

  useEffect(() => {
    const isDebug = (window as any).urbanaDebugMode || (window as any).urbanaAdmin?.debugMode || (window as any).urbanaPublic?.debugMode || false;
    if (isDebug) console.warn('[Lightbox] effect open changed', { open, index, imagesLength: images.length });
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      console.warn('[Lightbox] keydown', e.key);
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(images.length - 1, i + 1));
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onClose]);

  useEffect(() => {
    if ((window as any).urbanaDebugMode) console.log(`[Lightbox] open: ${open}, index: ${index}, images: ${images.length}`);
  }, [open, index, images.length]);

  useEffect(() => {
    if (onIndexChange) onIndexChange(index);
  }, [index]);

  if (!open) return null;

  const prev = () => { if ((window as any).urbanaDebugMode) console.log('[Lightbox] prev clicked'); setIndex((i) => Math.max(0, i - 1)); };
  const next = () => { if ((window as any).urbanaDebugMode) console.log('[Lightbox] next clicked'); setIndex((i) => Math.min(images.length - 1, i + 1)); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-6xl mx-auto">
        <button
          aria-label="Close"
          onClick={() => { if ((window as any).urbanaDebugMode) console.log('[Lightbox] close clicked'); onClose(); }}
          className="absolute right-2 top-2 z-50 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white"
        >
          <Icon icon="lucide:x" width={18} />
        </button>

        <div className="flex items-center justify-center">
          {/* Prev */}
          <button
            aria-label="Previous"
            onClick={prev}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white mr-4"
          >
            <Icon icon="lucide:chevron-left" width={20} />
          </button>

          <div className="flex-1 flex items-center justify-center"> 
            <div className="max-h-[85vh] w-full flex items-center justify-center">
              <SecureImage
                imagePath={images[index]}
                productCode={productCode}
                className="max-w-full max-h-[85vh] object-contain"
                alt={`Image ${index + 1} of ${images.length}`}
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>

          {/* Next */}
          <button
            aria-label="Next"
            onClick={next}
            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 text-white ml-4"
          >
            <Icon icon="lucide:chevron-right" width={20} />
          </button>
        </div>

        {/* Thumbnails on small / medium screens */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto px-2">
                {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                onMouseEnter={() => prefetchImage(img, productCode).catch(()=>{})}
                className={`flex-shrink-0 w-20 h-20 rounded-small overflow-hidden border-2 ${i === index ? 'border-primary' : 'border-transparent'}`}
                aria-label={`View image ${i + 1}`}
              >
                <SecureImage imagePath={img} productCode={productCode} className="w-full h-full object-cover" alt={`Thumb ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
