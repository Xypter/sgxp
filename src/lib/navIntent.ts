// How the most recent in-site navigation happened, for pages that want to
// behave differently when they're returned to vs. freshly opened (e.g. the
// Smack Jeeves archive keeps its shuffle order, page and filters on "back").
//
// Astro's ClientRouter fires `astro:before-preparation` on the page being
// left, so this has to be listening before any page that cares is even
// loaded - it's imported by the Navbar, which is on every page and persists
// across navigations. A full page load (refresh, typed URL) resets the
// module, so `lastNavigation()` is null then.

export interface LastNavigation {
  /** 'traverse' = browser back/forward; 'push' = a link was clicked. */
  type: 'push' | 'replace' | 'traverse';
  /** Destination path. */
  to: string;
  /** The clicked link asked the destination to restore its previous state. */
  restore: boolean;
}

let last: LastNavigation | null = null;

if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-preparation', (event) => {
    const e = event as Event & { navigationType: LastNavigation['type']; to: URL; sourceElement?: Element };
    last = {
      type: e.navigationType,
      to: e.to.pathname,
      restore: !!e.sourceElement?.closest?.('[data-restore-state]'),
    };
  });
}

export function lastNavigation(): LastNavigation | null {
  return last;
}

/** True when `path` was reached by browser back/forward, or by a link marked `data-restore-state`. */
export function isReturnVisit(path: string): boolean {
  return !!last && last.to === path && (last.type === 'traverse' || last.restore);
}
