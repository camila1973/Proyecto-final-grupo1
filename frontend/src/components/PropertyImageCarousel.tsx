import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface Props {
  images: string[];
  fallbackImage?: string;
  alt: string;
}

/**
 * Async image carousel for the property detail view.
 *
 * Images are lazy-loaded with `loading="lazy"` and decoded off the main thread
 * so the HTML shell paints quickly (acceptance criterion: detail view must
 * render within 800ms p95). Only adjacent thumbnails are eagerly loaded.
 */
export default function PropertyImageCarousel({ images, fallbackImage, alt }: Props) {
  const { t } = useTranslation();
  const resolved = useMemo(() => {
    if (images.length > 0) return images;
    if (fallbackImage) return [fallbackImage];
    return [];
  }, [images, fallbackImage]);

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const trackRef = useRef<HTMLDivElement>(null);

  const clampIndex = useCallback(
    (i: number) => {
      if (resolved.length === 0) return 0;
      return (i + resolved.length) % resolved.length;
    },
    [resolved.length],
  );

  const goTo = useCallback(
    (i: number) => setIndex(clampIndex(i)),
    [clampIndex],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const el = trackRef.current?.children[index] as HTMLElement | undefined;
    // scrollIntoView is absent in some test runtimes (jsdom)
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [index]);

  if (resolved.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-sm">
        {t('property_detail.carousel.no_images')}
      </div>
    );
  }

  return (
    <section
      className="relative w-full rounded-2xl overflow-hidden bg-gray-100"
      aria-roledescription="carousel"
      aria-label={alt}
    >
      <div
        ref={trackRef}
        className="relative aspect-[16/9] w-full overflow-hidden"
      >
        {resolved.map((src, i) => {
          // Only eager-load the current and adjacent slides; the rest lazy.
          const eager =
            i === index ||
            i === clampIndex(index - 1) ||
            i === clampIndex(index + 1);
          const isCurrent = i === index;
          return (
            <img
              key={src + i}
              src={src}
              alt={`${alt} (${i + 1}/${resolved.length})`}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={isCurrent ? 'high' : 'low'}
              onLoad={() =>
                setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }))
              }
              onError={() =>
                setLoaded((prev) => (prev[i] ? prev : { ...prev, [i]: true }))
              }
              className={
                `absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ` +
                (isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0')
              }
              aria-hidden={!isCurrent}
            />
          );
        })}

        {!loaded[index] && (
          <div
            className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 z-20"
            aria-hidden="true"
          />
        )}
      </div>

      {resolved.length > 1 && (
        <>
          <IconButton
            aria-label={t('property_detail.carousel.previous')}
            size="small"
            onClick={prev}
            sx={{
              position: 'absolute',
              top: '50%',
              left: 8,
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)',
              zIndex: 30,
              '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label={t('property_detail.carousel.next')}
            size="small"
            onClick={next}
            sx={{
              position: 'absolute',
              top: '50%',
              right: 8,
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(255,255,255,0.85)',
              zIndex: 30,
              '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
            }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30"
            role="tablist"
            aria-label={t('property_detail.carousel.selector')}
          >
            {resolved.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={t('property_detail.carousel.go_to', { index: i + 1 })}
                onClick={() => goTo(i)}
                className={
                  'w-2 h-2 rounded-full transition-all ' +
                  (i === index ? 'bg-white w-6' : 'bg-white/60 hover:bg-white/80')
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}