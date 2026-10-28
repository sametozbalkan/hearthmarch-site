/**
 * The stage's script. The page scrolls natively; this reads the scroll position and:
 * - marks the scene on the stage (`is-current`), the chapter rail's mark (`aria-current`) and
 *   the stage's tone, and tells the sound which scene is on;
 * - lays out only the scenes near the stage (`is-near`), so pictures load as the tale nears them;
 * - in browsers without scroll-driven animations (`html.motion-js`), plays the tale's tracks
 *   itself, the same keyframes the CSS plays elsewhere;
 * - checks that every scene fits its screen: a chapter that does not shows its second
 *   paragraph as a second step (`data-steps="2"`), and if even that fails the page falls back
 *   to the stacked layout;
 * - turns links to a scene (the rail, or `/#night`) into a jump to that scene.
 */
import {
  ENTRY,
  FINALE,
  FORMATS,
  SCENES,
  CUTS,
  TOTAL,
  type FinaleMoment,
  type SceneId,
  type Track,
  anchorTime,
  fullTracks,
  isCutNear,
  isNear,
  reducedTracks,
  sceneIndexAt,
  valueAt,
} from '../tale.ts';

/** What is on the stage: a scene, or the hero above the tale. */
export type OnStage = SceneId | 'hero';

export interface Stage {
  /** Whether the page runs as a stage (false: the stacked page). */
  readonly staged: () => boolean;
  /** What is on the stage now. */
  readonly current: () => OnStage;
  /** The element of a scene. */
  readonly sceneElement: (id: SceneId) => HTMLElement | null;
  /** Calls back whenever another scene takes the stage. */
  readonly onScene: (listener: (id: OnStage) => void) => void;
  /** Calls back when the finale reaches a moment, once per visit. */
  readonly onMoment: (listener: (moment: FinaleMoment) => void) => void;
}

interface BoundTrack {
  track: Track;
  els: HTMLElement[];
  last: string[];
}

export function startStage(): Stage {
  const root = document.documentElement;
  const tale = document.querySelector<HTMLElement>('.tale');
  const stageEl = document.querySelector<HTMLElement>('[data-stage]');
  const sceneListeners: Array<(id: OnStage) => void> = [];
  const momentListeners: Array<(moment: FinaleMoment) => void> = [];
  let current: OnStage = 'hero';

  const api: Stage = {
    staged: () => root.classList.contains('stage'),
    current: () => current,
    sceneElement: (id) => stageEl?.querySelector<HTMLElement>(`[data-scene="${id}"]`) ?? null,
    onScene: (listener) => sceneListeners.push(listener),
    onMoment: (listener) => momentListeners.push(listener),
  };
  if (!tale || !stageEl) {
    root.classList.remove('stage', 'sda', 'motion-js');
    return api;
  }

  // The markup marks the first scene near, so the page's first frames need no script.
  const scenes = SCENES.map((times) => {
    const el = stageEl.querySelector<HTMLElement>(`[data-scene="${times.id}"]`);
    return { times, el, near: el?.classList.contains('is-near') ?? false };
  });
  const cuts = CUTS.map((cut) => {
    const el = stageEl.querySelector<HTMLElement>(`[data-cut="${cut.id}"]`);
    return { cut, el, near: el?.classList.contains('is-near') ?? false };
  });
  const railLinks = Array.from(stageEl.querySelectorAll<HTMLAnchorElement>('a[data-rail]'));
  const finale = scenes.find((s) => s.times.id === 'finale');
  const finaleCta = finale?.el?.querySelector<HTMLAnchorElement>('.finale-cta a') ?? null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canStage = root.classList.contains('stage');
  const jsDriven = root.classList.contains('motion-js');
  const driver = jsDriven ? 'motion-js' : 'sda';

  let taleTop = 0;
  let taleHeight = 1;
  let viewHeight = window.innerHeight;
  let frame = 0;
  let bound: BoundTrack[] = [];
  const moments = new Set<FinaleMoment>();

  /** Whether the tale's place on the page is known; measured lazily, since measuring lays
      out the whole page. */
  let measured = false;
  const measure = (): void => {
    const rect = tale.getBoundingClientRect();
    taleTop = rect.top + window.scrollY;
    taleHeight = Math.max(1, rect.height);
    viewHeight = window.innerHeight;
    measured = true;
  };

  /** The tale's time at the current scroll position, mapped as the CSS timeline maps it. */
  const timeNow = (): number => {
    const share = (window.scrollY - taleTop + viewHeight) / taleHeight;
    return share * (TOTAL + ENTRY) - ENTRY;
  };

  /** The scroll position at which the tale shows time t. */
  const scrollFor = (t: number): number => ((t + ENTRY) / (TOTAL + ENTRY)) * taleHeight + taleTop - viewHeight;

  /* ---------- The JavaScript engine for the tracks ---------- */

  const clearBound = (): void => {
    for (const b of bound) {
      for (const el of b.els) {
        for (const p of b.track.props) el.style.removeProperty(p.prop);
      }
    }
    bound = [];
  };

  const bind = (): void => {
    clearBound();
    if (!jsDriven || !api.staged()) return;
    const tracks = reduce.matches ? reducedTracks() : fullTracks();
    bound = tracks
      .map((track) => ({
        track,
        els: Array.from(stageEl.querySelectorAll<HTMLElement>(track.sel)),
        last: track.props.map(() => ''),
      }))
      .filter((b) => b.els.length > 0);
  };

  const play = (t: number): void => {
    for (const b of bound) {
      b.track.props.forEach((p, i) => {
        const css = FORMATS[p.fmt](valueAt(p, t));
        if (css !== b.last[i]) {
          b.last[i] = css;
          for (const el of b.els) el.style.setProperty(p.prop, css);
        }
      });
    }
  };

  /* ---------- What is on the stage ---------- */

  const setCurrent = (id: OnStage): void => {
    if (id === current) return;
    current = id;
    for (const s of scenes) s.el?.classList.toggle('is-current', s.times.id === id);
    for (const link of railLinks) {
      if (link.dataset.rail === id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    const el = id === 'hero' ? null : api.sceneElement(id);
    stageEl.dataset.tone = el?.classList.contains('tone-light') ? 'light' : 'dark';
    if (id !== 'finale') moments.clear();
    for (const listener of sceneListeners) listener(id);
  };

  const updateFinale = (t: number): void => {
    if (!finale?.el) return;
    const local = t - finale.times.dwell[0];
    const live = current === 'finale' && !document.hidden && !reduce.matches;
    finale.el.classList.toggle('is-live', live);
    const ctaLive = !api.staged() || reduce.matches || (current === 'finale' && local >= FINALE.ctaFrom);
    finale.el.classList.toggle('cta-live', ctaLive);
    if (finaleCta) {
      if (ctaLive) finaleCta.removeAttribute('tabindex');
      else finaleCta.setAttribute('tabindex', '-1');
    }
    if (current !== 'finale') return;
    const reached: Array<[FinaleMoment, number]> = [
      ['moonClear', FINALE.moonClear],
      ['outroVoice', FINALE.outroVoice],
    ];
    for (const [moment, at] of reached) {
      if (local >= at && !moments.has(moment)) {
        moments.add(moment);
        for (const listener of momentListeners) listener(moment);
      }
    }
  };

  /** The stacked page: the scene whose box holds the middle of the screen. */
  const stackedCurrent = (): OnStage => {
    const middle = window.innerHeight / 2;
    let found: OnStage = 'hero';
    for (const s of scenes) {
      const rect = s.el?.getBoundingClientRect();
      if (rect && rect.top <= middle && rect.bottom > middle) found = s.times.id;
    }
    return found;
  };

  const update = (): void => {
    frame = 0;
    if (!api.staged()) {
      setCurrent(stackedCurrent());
      if (finale?.el) {
        finale.el.classList.toggle('cta-live', true);
        finaleCta?.removeAttribute('tabindex');
      }
      if (current === 'finale') {
        for (const moment of ['moonClear', 'outroVoice'] as const) {
          if (!moments.has(moment)) {
            moments.add(moment);
            for (const listener of momentListeners) listener(moment);
          }
        }
      }
      return;
    }
    if (!measured) measure();
    const t = timeNow();
    for (const s of scenes) {
      const near = isNear(s.times, t);
      if (near !== s.near) {
        s.near = near;
        s.el?.classList.toggle('is-near', near);
        if (near) predecode(s.el);
      }
    }
    for (const c of cuts) {
      const near = isCutNear(c.cut, t);
      if (near !== c.near) {
        c.near = near;
        c.el?.classList.toggle('is-near', near);
        if (near) predecode(c.el);
      }
    }
    const index = sceneIndexAt(t);
    setCurrent(index < 0 ? 'hero' : (SCENES[index]?.id ?? 'hero'));
    updateFinale(t);
    if (jsDriven) play(t);
  };

  const schedule = (): void => {
    if (frame === 0) frame = window.requestAnimationFrame(update);
  };

  /** Decodes a scene's pictures as it nears the stage, so they are ready before they show. */
  const decoded = new WeakSet<HTMLImageElement>();
  function predecode(el: HTMLElement | null): void {
    for (const img of el?.querySelectorAll('img') ?? []) {
      if (decoded.has(img)) continue;
      decoded.add(img);
      void img.decode().catch(() => decoded.delete(img));
    }
  }

  /* ---------- Does every scene fit its screen? ---------- */

  /** An element's layout box inside a scene's body, without the motion's transforms. */
  const layoutBox = (el: HTMLElement, body: HTMLElement): { top: number; bottom: number } => {
    let top = 0;
    let node: HTMLElement | null = el;
    while (node && node !== body) {
      top += node.offsetTop;
      node = node.offsetParent instanceof HTMLElement ? node.offsetParent : null;
    }
    return { top, bottom: top + el.offsetHeight };
  };

  const PARTS = '.panel, .frame, .work figcaption, .kilim-band, .prologue-line, .finale-mark, .finale-outro, .finale-cta';

  const overflows = (el: HTMLElement): boolean => {
    const body = el.querySelector<HTMLElement>('.scene-body');
    if (!body) return false;
    // Every part of the scene lies within the body's padding: nothing under the controls at
    // the top, nothing past the bottom edge.
    const style = getComputedStyle(body);
    const top = parseFloat(style.paddingTop) - 2;
    const bottom = body.clientHeight - parseFloat(style.paddingBottom) + 2;
    for (const part of el.querySelectorAll<HTMLElement>(PARTS)) {
      const box = layoutBox(part, body);
      if (box.top < top || box.bottom > bottom) return true;
    }
    const art = el.querySelector<HTMLElement>('.frame, .kilim-band');
    // The work must keep a fair share of the screen; text never covers it. The whole kilim,
    // hung still under reduced motion, is long and low by nature.
    if (!art || (reduce.matches && art.classList.contains('kilim-band'))) return false;
    return art.offsetHeight < Math.min(150, window.innerHeight * 0.2);
  };

  const fit = (): void => {
    if (!canStage) return;
    // Try the stage again on every check: a screen that was too small may have grown. Reads
    // and writes are batched, so the whole check costs two layouts.
    root.classList.add('stage', driver);
    const els = scenes.map((s) => s.el).filter((el): el is HTMLElement => el !== null);
    for (const el of els) delete el.dataset.steps;
    const over = els.filter((el) => overflows(el));
    const chapters = over.filter((el) => el.classList.contains('chapter'));
    for (const el of chapters) el.dataset.steps = '2';
    const fails = over.length > chapters.length || chapters.some((el) => overflows(el));
    if (fails) {
      // Even two steps do not fit (a very short screen, or very large text): read it stacked.
      clearBound();
      root.classList.remove('stage', 'sda', 'motion-js');
      for (const s of scenes) {
        s.near = false;
        s.el?.classList.remove('is-near');
        delete s.el?.dataset.steps;
      }
      for (const c of cuts) {
        c.near = false;
        c.el?.classList.remove('is-near');
      }
    }
    measure();
    bind();
    update();
  };

  /* ---------- Links to a scene ---------- */

  const isSceneId = (id: string): id is SceneId => SCENES.some((s) => s.id === id);

  const goTo = (id: string, focus: boolean): boolean => {
    if (!api.staged() || !isSceneId(id)) return false;
    if (!measured) measure();
    window.scrollTo({ top: Math.round(scrollFor(anchorTime(id))), behavior: 'instant' });
    if (focus) {
      const heading = api.sceneElement(id)?.querySelector<HTMLElement>('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
    schedule();
    return true;
  };

  stageEl.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-rail]');
    const id = link?.dataset.rail;
    if (!id || !api.staged()) return;
    event.preventDefault();
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    goTo(id, true);
  });

  window.addEventListener('popstate', () => {
    goTo(decodeURIComponent(location.hash.slice(1)), false);
  });

  // The rail shows only once the stage has pinned: focus moving onto it pins the stage first.
  stageEl.querySelector('.rail')?.addEventListener('focusin', () => {
    if (!api.staged()) return;
    if (!measured) measure();
    if (timeNow() < 0) window.scrollTo({ top: Math.ceil(scrollFor(0.5)), behavior: 'instant' });
  });

  // The browser's own jump to a link's target may land after this script; set it right.
  const hashScene = (): string => decodeURIComponent(location.hash.slice(1));
  window.addEventListener('load', () => {
    const id = hashScene();
    if (isSceneId(id) && current !== id) goTo(id, false);
  });

  /* ---------- Start ---------- */

  let resizeTimer = 0;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', () => {
    measured = false;
    schedule();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fit, 180);
  });
  reduce.addEventListener('change', fit);
  document.addEventListener('visibilitychange', schedule);

  const whenIdle = (fn: () => void): void => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 1500 });
    else window.setTimeout(fn, 200);
  };

  // Nothing here reads the layout, which would lay out the whole page before its first frame:
  // the markup marks the first scene near, a scroll updates the stage, and so does an idle
  // moment; a link to a scene lands once the first frame is drawn. The fit check waits for
  // the fonts and an idle moment too.
  bind();
  if (location.hash.length > 1) {
    window.requestAnimationFrame(() => window.setTimeout(() => goTo(decodeURIComponent(location.hash.slice(1)), false), 0));
  }
  whenIdle(update);
  void (document.fonts?.ready ?? Promise.resolve()).then(() =>
    whenIdle(() => {
      fit();
      if (location.hash.length > 1 && window.scrollY < taleTop) goTo(decodeURIComponent(location.hash.slice(1)), false);
    }),
  );

  return api;
}
