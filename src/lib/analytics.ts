export type AnalyticsEvent =
  'project_open' | 'external_link' | 'resume_complete' | 'arcade_game_start' | 'lab_action';

type EventData = Record<string, string | number | boolean>;
type Payload = Record<string, unknown>;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventData) => unknown };
    portfolioAnalyticsBeforeSend?: (type: string, payload: Payload) => Payload | false;
  }
}

const WEBSITE_ID = '87805ca6-9b88-42c4-8507-e153aae9515e';
const HOSTS = ['jake-costello.com', 'www.jake-costello.com'];
const DISABLED_KEY = 'umami.disabled';
const DESTINATIONS: Record<string, string> = {
  'linkedin.com': 'linkedin',
  'github.com': 'github',
  'revision-marine.com': 'revision-marine',
};

// Injecting the tracker only on the published domain keeps previews and CI out
// of the real dashboard. Analytics is optional and never blocks an interaction.
export function createAnalytics(browser: Window) {
  let initialized = false;
  let failed = false;
  const pending: { name: AnalyticsEvent; data: EventData }[] = [];

  function allowed() {
    try {
      return (
        HOSTS.includes(browser.location.hostname) && !browser.localStorage.getItem(DISABLED_KEY)
      );
    } catch {
      // If storage cannot be read, we cannot verify the visitor's exclusion choice.
      return false;
    }
  }

  function send(name: AnalyticsEvent, data: EventData) {
    try {
      Promise.resolve(browser.umami?.track(name, data)).catch(() => {});
    } catch {
      // Blocked or failed analytics must not affect navigation or gameplay.
    }
  }

  function track(name: AnalyticsEvent, data: EventData = {}) {
    if (!initialized || failed || !allowed()) return;
    const payload = {
      source: browser.location.pathname.includes('/arcade') ? 'arcade' : 'home',
      ...data,
    };
    if (browser.umami) send(name, payload);
    else if (pending.length < 20) pending.push({ name, data: payload });
  }

  function externalLink(event: Event) {
    const click = event as MouseEvent;
    if (
      click.defaultPrevented ||
      (click.type === 'click' ? click.button !== 0 : click.button !== 1)
    )
      return;
    const anchor = (click.target as Element | null)?.closest?.('a[href]');
    if (!anchor) return;
    try {
      const host = new URL(anchor.getAttribute('href')!, browser.location.href).hostname.replace(
        /^www\./,
        '',
      );
      const destination = DESTINATIONS[host];
      if (destination) track('external_link', { destination });
    } catch {
      // Ignore non-URL links; only the named public destinations are recorded.
    }
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    if (!allowed()) return;
    try {
      browser.portfolioAnalyticsBeforeSend = (_type, payload) => allowed() && payload;
      const script = browser.document.createElement('script');
      script.src = 'https://cloud.umami.is/script.js';
      script.async = true;
      script.dataset.websiteId = WEBSITE_ID;
      script.dataset.domains = HOSTS.join(',');
      script.dataset.excludeSearch = 'true';
      script.dataset.excludeHash = 'true';
      script.dataset.beforeSend = 'portfolioAnalyticsBeforeSend';
      script.addEventListener('load', () => {
        const queued = pending.splice(0);
        if (allowed()) for (const event of queued) send(event.name, event.data);
      });
      script.addEventListener('error', () => {
        failed = true;
        pending.length = 0;
      });
      browser.document.addEventListener('click', externalLink);
      browser.document.addEventListener('auxclick', externalLink);
      browser.document.head.append(script);
    } catch {
      failed = true;
      pending.length = 0;
    }
  }

  return { initialize, track };
}

let analytics: ReturnType<typeof createAnalytics> | undefined;

export function initializeAnalytics() {
  if (typeof window === 'undefined') return;
  analytics ??= createAnalytics(window);
  analytics.initialize();
}

export function trackEvent(name: AnalyticsEvent, data?: EventData) {
  analytics?.track(name, data);
}
