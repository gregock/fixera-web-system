// @ts-check

/**
 * @typedef {Window & typeof globalThis & {
 *   __fixeraLeadTrackBound?: boolean;
 * }} ServiceSiteWindow
 */
const fixeraWindow = /** @type {ServiceSiteWindow} */ (window);
const LEAD_API_URL = "https://example-crm.invalid/api/leads";

function getHrefAttribution(href) {
  try {
    const url = new URL(href);
    const params = new URLSearchParams(url.search);

    return {
      cta_source: params.get("utm_source") || null,
      cta_medium: params.get("utm_medium") || null,
      cta_campaign: params.get("utm_campaign") || null,
    };
  } catch {
    return {
      cta_source: null,
      cta_medium: null,
      cta_campaign: null,
    };
  }
}

function getSessionTestFlag() {
  try {
    return sessionStorage.getItem("fixera_test") === "true";
  } catch {
    return false;
  }
}

function persistTestTrafficFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get("fixera_test") || "").trim().toLowerCase();

    if (value === "1" || value === "true" || value === "yes") {
      sessionStorage.setItem("fixera_test", "true");
      return true;
    }

    return getSessionTestFlag();
  } catch {
    return false;
  }
}

function isTestTraffic() {
  return persistTestTrafficFromUrl();
}

function getPersistedAttribution() {
  try {
    const raw = sessionStorage.getItem("fixera_last_touch");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getLeadContext() {
  const params = new URLSearchParams(window.location.search);
  const persisted = getPersistedAttribution();

  return {
    landing_page: persisted?.landing_page || window.location.pathname,
    source:
      persisted?.utm_source ||
      persisted?.source ||
      params.get("utm_source") ||
      "direct",
    medium:
      persisted?.utm_medium ||
      persisted?.medium ||
      params.get("utm_medium") ||
      null,
    campaign:
      persisted?.utm_campaign ||
      persisted?.campaign ||
      params.get("utm_campaign") ||
      null,
    referrer: document.referrer || null,
    timestamp: new Date().toISOString(),
  };
}

export function initLeadAttributionTracking() {
  if (fixeraWindow.__fixeraLeadTrackBound) return;
  fixeraWindow.__fixeraLeadTrackBound = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = /** @type {Element | null} */ (
        event.target instanceof Element ? event.target : null
      );
      const link = /** @type {HTMLAnchorElement | null} */ (
        target?.closest('a[href*="wa.me"]') || null
      );
      if (!link) return;

      event.preventDefault();

      const href = link.href;
      const openInNewTab = link.target === "_blank";
      const pendingWindow = openInNewTab
        ? window.open("", "_blank", "noopener,noreferrer")
        : null;

      const data = {
        type: "whatsapp_click",
        ...getLeadContext(),
        ...getHrefAttribution(href),
        ...(isTestTraffic() ? { is_test: true } : {}),
        href,
      };

      navigator.sendBeacon(LEAD_API_URL, JSON.stringify(data));

      window.setTimeout(() => {
        if (pendingWindow && !pendingWindow.closed) {
          pendingWindow.location.href = href;
          return;
        }

        if (openInNewTab) {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }

        window.location.href = href;
      }, 150);
    },
    { capture: true }
  );
}
