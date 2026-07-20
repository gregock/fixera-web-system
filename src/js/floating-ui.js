// @ts-check

/**
 * @typedef {Window & typeof globalThis & {
 *   sendGA4?: (name: string, params?: Record<string, any>, sourceEl?: Element | null) => void;
 * }} ServiceSiteWindow
 */
const fixeraWindow = /** @type {ServiceSiteWindow} */ (window);
const FLOATING_CTA_SHOW_Y = 320;
const FLOATING_CTA_HIDE_Y = 160;
const BACK_TO_TOP_SHOW_Y = 320;
const BACK_TO_TOP_HIDE_Y = 160;
const BUSINESS_HOURS_OPEN = 9;
const BUSINESS_HOURS_CLOSE = 22;

export function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  const hasScroll = document.documentElement.scrollHeight > window.innerHeight;

  let shown = false;
  let visible = false;
  let trackedShown = false;
  let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
  let showAnchorY = 0;
  let ticking = false;
  let showTimer = /** @type {number | null} */ (null);

  if (!hasScroll) {
    // Do nothing: keep it hidden
    return;
  }

  const applyVisibility = () => {
    btn.classList.toggle("is-visible", visible);
    if (!visible) {
      btn.setAttribute("aria-hidden", "true");
      return;
    }
    btn.removeAttribute("aria-hidden");
    if (!trackedShown) {
      trackedShown = true;
      try {
        if (typeof fixeraWindow.sendGA4 === "function") {
          fixeraWindow.sendGA4("back_to_top_shown", { link_text: (btn.textContent || "").trim() });
        }
      } catch (_) {}
    }
  };

  const toggleVisibility = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    const delta = scrollTop - lastScrollTop;
    const isScrollingUp = delta <= -10;
    const isScrollingDown = delta >= 10;

    if (!shown && isScrollingUp && scrollTop >= BACK_TO_TOP_SHOW_Y) {
      shown = true;
      showAnchorY = scrollTop;
    }

    if (shown && isScrollingUp) {
      showAnchorY = Math.min(showAnchorY || scrollTop, scrollTop);
    }

    if (shown && scrollTop <= BACK_TO_TOP_HIDE_Y) {
      shown = false;
    } else if (shown && isScrollingDown && scrollTop >= showAnchorY + 24) {
      shown = false;
    }

    if (!shown) {
      if (showTimer !== null) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      if (visible) {
        visible = false;
        applyVisibility();
      }
    } else if (!visible && showTimer === null) {
      showTimer = window.setTimeout(() => {
        showTimer = null;
        if (!shown) return;
        visible = true;
        applyVisibility();
      }, 140);
    }
    lastScrollTop = scrollTop;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      toggleVisibility();
      ticking = false;
    });
  };

  toggleVisibility();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", toggleVisibility);

  btn.addEventListener("click", (event) => {
    event.preventDefault();
    try {
      if (typeof fixeraWindow.sendGA4 === "function") {
        fixeraWindow.sendGA4("back_to_top_click", {
          link_text: (btn.textContent || "").trim(),
        });
      }
    } catch (_) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

export function initHomepageFloatingWhatsAppCTA() {
  const cta = /** @type {HTMLAnchorElement | null} */ (document.getElementById("cta-wa-float"));
  if (!cta) return;

  var footer = /** @type {HTMLElement | null} */ (document.getElementById("site-footer"));
  var footerVisible = false;
  var shown = false;
  var visible = false;
  var trackedShown = false;
  var ticking = false;

  var textEl = /** @type {HTMLElement | null} */ (cta.querySelector(".floating-cta__text"));
  var defaultHref = cta.getAttribute("href") || cta.href || "";

  var isOpenHoursCopenhagen = function () {
    try {
      var now = new Date();
      var formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Copenhagen",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      });
      var parts = formatter.formatToParts(now);
      var hourPart = parts.find(function (part) {
        return part.type === "hour";
      });
      var hour = Number((hourPart && hourPart.value) || "0");
      return hour >= BUSINESS_HOURS_OPEN && hour < BUSINESS_HOURS_CLOSE;
    } catch (_) {
      return true;
    }
  };

  var syncFloatingCtaCopy = function () {
    var open = isOpenHoursCopenhagen();
    var label = open
      ? cta.getAttribute("data-open-label") || "Chat now"
      : cta.getAttribute("data-closed-label") || "Send a message";
    var message = open
      ? cta.getAttribute("data-open-message") || "Hi team, I need help with..."
      : cta.getAttribute("data-closed-message") ||
        "Hi team, I need help with... Please reply during business hours.";
    var ariaLabel = open
      ? cta.getAttribute("data-open-aria-label") || label
      : cta.getAttribute("data-closed-aria-label") || label;

    if (textEl) textEl.textContent = label;
    cta.setAttribute("aria-label", ariaLabel);
    try {
      var parsed = new URL(defaultHref, window.location.href);
      var params = parsed.searchParams;
      params.set("text", message);
      parsed.search = params.toString();
      cta.setAttribute("href", parsed.toString());
    } catch (_) {}
  };

  var applyVisibility = function () {
    cta.classList.toggle("is-visible", visible);
    if (visible) {
      cta.removeAttribute("aria-hidden");
      if (!trackedShown) {
        trackedShown = true;
        try {
          if (typeof fixeraWindow.sendGA4 === "function") {
            fixeraWindow.sendGA4(
              "floating_cta_shown",
              {
                link_url: cta.getAttribute("href") || cta.href || "",
                link_text: (cta.textContent || "").trim(),
              },
              cta
            );
          }
        } catch (_) {}
      }
    } else cta.setAttribute("aria-hidden", "true");
  };

  var updateVisibility = function () {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    var currentHasScroll = document.documentElement.scrollHeight > window.innerHeight;

    if (!currentHasScroll) {
      visible = true;
    } else {
      if (!shown && scrollTop >= FLOATING_CTA_SHOW_Y) shown = true;
      if (shown && scrollTop <= FLOATING_CTA_HIDE_Y) shown = false;

      visible = shown && !footerVisible;
    }

    applyVisibility();
  };

  var onScroll = function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateVisibility();
      ticking = false;
    });
  };

  syncFloatingCtaCopy();
  updateVisibility();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateVisibility);

  if (footer && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          footerVisible = !!entry.isIntersecting;
        });
        updateVisibility();
      },
      { root: null, threshold: 0 }
    );
    io.observe(footer);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") syncFloatingCtaCopy();
  });
}
