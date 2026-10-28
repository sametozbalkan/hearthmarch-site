/**
 * The fallback for browsers without CSS scroll-driven animations.
 *
 * Elements marked `data-scroll-range` get a `--p` property from 0 to 1 as they pass the
 * screen, which the CSS under `.motion-js` turns into motion:
 * - "cover": from the element's top entering at the bottom to its bottom leaving at the top;
 * - "contain": from the element fully entering at the bottom to it starting to leave at the top.
 *
 * It watches only what is on screen, stops under reduced motion, and does nothing where
 * CSS drives the motion itself.
 */

type Range = 'cover' | 'contain';

function progress(rect: DOMRect, viewHeight: number, range: Range): number {
  let p: number;
  if (range === 'contain') {
    const span = viewHeight - rect.height;
    p = span > 0 ? (viewHeight - rect.bottom) / span : 0.5;
  } else {
    p = (viewHeight - rect.top) / (viewHeight + rect.height);
  }
  return Math.min(1, Math.max(0, p));
}

export function startMotionFallback(): void {
  if (typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()')) {
    return;
  }
  const root = document.documentElement;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-range]'));
  if (items.length === 0 || typeof IntersectionObserver === 'undefined') {
    return;
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set<HTMLElement>();
  let frame = 0;
  let running = false;

  const update = (): void => {
    frame = 0;
    const viewHeight = window.innerHeight;
    for (const el of visible) {
      const range: Range = el.dataset.scrollRange === 'contain' ? 'contain' : 'cover';
      el.style.setProperty('--p', progress(el.getBoundingClientRect(), viewHeight, range).toFixed(4));
    }
  };

  const schedule = (): void => {
    if (frame === 0) {
      frame = window.requestAnimationFrame(update);
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          visible.add(el);
        } else {
          visible.delete(el);
        }
      }
      schedule();
    },
    { rootMargin: '25% 0px' },
  );

  const start = (): void => {
    if (running) return;
    running = true;
    root.classList.add('motion-js');
    for (const el of items) observer.observe(el);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  };

  const stop = (): void => {
    if (!running) return;
    running = false;
    root.classList.remove('motion-js');
    observer.disconnect();
    visible.clear();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    for (const el of items) el.style.removeProperty('--p');
  };

  const apply = (): void => {
    if (reduce.matches) {
      stop();
    } else {
      start();
    }
  };

  reduce.addEventListener('change', apply);
  apply();
}
