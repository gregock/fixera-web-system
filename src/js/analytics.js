// @ts-check

/**
 * @typedef {Window & typeof globalThis & {
 *   sendGA4?: (name: string, params?: Record<string, any>) => void;
 *   sendPixel?: (name: string, params?: Record<string, any>) => void;
 *   gtag?: (...args: any[]) => void;
 *   fbq?: (...args: any[]) => void;
 * }} ServiceSiteWindow
 */
const northstarWindow = /** @type {ServiceSiteWindow} */ (window);

export function initAnalytics() {
  function getLanguage() {
    return /\.da\.html$/i.test(location.pathname || "") ? "da" : "en";
  }

  /** @param {string} value */
  function stripPageExtension(value) {
    return (value || "").replace(/\.da\.html$/i, "").replace(/\.html$/i, "");
  }

  function getPageSlug() {
    var path = location.pathname || "/";
    if (path === "/" || path === "/index.da") return "home";

    var trimmed = path.replace(/\/+$/, "");
    if (!trimmed) return "home";

    var parts = trimmed.replace(/^\//, "").split("/");
    var last = parts[parts.length - 1] || "";

    if (last === "index") return parts[parts.length - 2] || "home";
    if (last === "index.html" || last === "index.da") return parts[parts.length - 2] || "home";

    return stripPageExtension(last);
  }

  function getPageType() {
    var path = location.pathname || "/";

    if (path === "/" || path === "/index.da") return "home";
    if (/^\/services(?:\/|\.|$)/i.test(path)) return "service";
    if (/^\/areas(?:\/|\.|$)/i.test(path)) return "area";
    if (/^\/projects(?:\/|\.|$)/i.test(path)) return "project";
    if (/^\/blog(?:\/|\.|$)/i.test(path)) return "blog";
    if (/^\/contact(?:\.|$)/i.test(path)) return "contact";
    if (/^\/gallery(?:\.|$)/i.test(path)) return "gallery";

    var bodyPage = (document.body && document.body.getAttribute("data-page")) || "";
    if (bodyPage === "index") return "home";
    if (bodyPage === "blog" || bodyPage === "blog-article") return "blog";
    if (bodyPage === "contact") return "contact";
    if (bodyPage === "gallery") return "gallery";

    return "other";
  }

  /** @param {string} sectionName */
  function getSlugForSection(sectionName) {
    var path = location.pathname || "/";
    var match = path.match(new RegExp("^/" + sectionName + "/([^/]+)$", "i"));
    if (!match) return "";
    return stripPageExtension(match[1]);
  }

  function getPageContext() {
    var context = /** @type {{
      page_type: string;
      page_slug: string;
      language: string;
      service_slug?: string;
      area_slug?: string;
    }} */ ({
      page_type: getPageType(),
      page_slug: getPageSlug(),
      language: getLanguage(),
    });

    var serviceSlug = getSlugForSection("services");
    if (serviceSlug) context.service_slug = serviceSlug;

    var areaSlug = getSlugForSection("areas");
    if (areaSlug) context.area_slug = areaSlug;

    return context;
  }

  /** @param {string} key */
  function getStoredAttribution(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function getAttributionContext() {
    var firstTouch = getStoredAttribution("northstar_first_touch");
    var lastTouch = getStoredAttribution("northstar_last_touch");
    if (!firstTouch && !lastTouch) return {};

    return {
      first_touch_source: firstTouch
        ? firstTouch.source || firstTouch.utm_source || undefined
        : undefined,
      first_touch_medium: firstTouch ? firstTouch.utm_medium || undefined : undefined,
      first_touch_campaign: firstTouch ? firstTouch.utm_campaign || undefined : undefined,
      first_touch_landing_page: firstTouch ? firstTouch.landing_page || undefined : undefined,
      first_touch_referrer: firstTouch ? firstTouch.referrer || undefined : undefined,
      last_touch_source: lastTouch
        ? lastTouch.source || lastTouch.utm_source || undefined
        : undefined,
      last_touch_medium: lastTouch ? lastTouch.utm_medium || undefined : undefined,
      last_touch_campaign: lastTouch ? lastTouch.utm_campaign || undefined : undefined,
      last_touch_landing_page: lastTouch ? lastTouch.landing_page || undefined : undefined,
      last_touch_referrer: lastTouch ? lastTouch.referrer || undefined : undefined,
    };
  }

  /** @param {Element | null | undefined} el */
  function getCtaPosition(el) {
    if (!el || !el.closest) return "";
    if (el.id === "cta-wa-float" || el.closest("#cta-wa-float")) return "floating";
    if (el.closest("#contact-form") || el.closest("form")) return "contact_form";
    if (el.closest("#site-footer, footer")) return "footer";
    if (el.closest("header, #site-drawer, .drawer-nav, .drawer-cta, .header-base")) return "nav";
    if (el.closest("#hero")) return "hero";
    if (el.closest("main")) return "inline";
    return "unknown";
  }

  /** @param {Element | null | undefined} el */
  function getCtaMetadata(el) {
    if (!el) return {};
    var ctaId =
      el.getAttribute("data-cta-id") ||
      el.id ||
      el.getAttribute("data-cta") ||
      el.getAttribute("data-track") ||
      "";
    var ctaText = (el.textContent || "").replace(/\s+/g, " ").trim();
    return {
      cta_id: ctaId ? ctaId.slice(0, 100) : undefined,
      cta_text: ctaText ? ctaText.slice(0, 100) : undefined,
    };
  }

  /**
   * @param {Record<string, any>=} params
   * @param {Element | null=} sourceEl
   * @returns {Record<string, any>}
   */
  function buildEventParams(params, sourceEl) {
    var context = getPageContext();
    var attributionContext = getAttributionContext();
    var merged = /** @type {Record<string, any>} */ ({});
    /** @type {keyof typeof context} */
    var contextKey;
    /** @type {string} */
    var key;

    var inputParams = /** @type {Record<string, any>} */ (params || {});

    for (contextKey in context) merged[contextKey] = context[contextKey];
    for (key in attributionContext) merged[key] = attributionContext[key];
    for (key in inputParams) merged[key] = inputParams[key];

    var ctaPosition = merged.cta_position || getCtaPosition(sourceEl);
    if (ctaPosition) merged.cta_position = ctaPosition;

    if (!merged.page_path) merged.page_path = location.pathname;
    return merged;
  }

  /**
   * @param {string} name
   * @param {Record<string, any>=} params
   * @param {Element | null=} sourceEl
   */
  function sendGA4(name, params, sourceEl) {
    try {
      if (typeof northstarWindow.gtag === "function") {
        var p = buildEventParams(params, sourceEl || null);
        var isTestTraffic = false;
        try {
          isTestTraffic = sessionStorage.getItem("northstar_test") === "true";
        } catch (_) {}
        if (/** @type {any} */ (northstarWindow).__northstarInternalTraffic || isTestTraffic) {
          p.debug_mode = true;
        }
        northstarWindow.gtag("event", name, p);
      }
    } catch (_) {}
  }
  /**
   * @param {string} name
   * @param {Record<string, any>=} params
   */
  function sendPixel(name, params) {
    try {
      if (typeof northstarWindow.fbq === "function") {
        northstarWindow.fbq("track", name, params || {});
      }
    } catch (_) {}
  }

  northstarWindow.sendGA4 = sendGA4;
  northstarWindow.sendPixel = sendPixel;

  // Outbound y canales específicos
  document.addEventListener(
    "click",
    function (e) {
      var _t = /** @type {any} */ (e.target);
      var a = _t && _t.closest ? _t.closest("a") : null;
      if (!a) return;

      var href = a.getAttribute("href") || "";
      var isWhatsApp = /(?:wa\.me|api\.whatsapp\.com)/i.test(href);
      var isTel = /^tel:/i.test(href);
      var isMail = /^mailto:/i.test(href);
      var isExternal = /^https?:/i.test(href) && a.origin !== location.origin && !isWhatsApp;

      if (isWhatsApp) {
        var whatsappMetadata = getCtaMetadata(a);
        sendGA4(
          "whatsapp_click",
          {
            link_url: href,
            link_text: (a.textContent || "").trim(),
            cta_position: getCtaPosition(a) || undefined,
            cta_id: whatsappMetadata.cta_id,
            cta_text: whatsappMetadata.cta_text,
          },
          a
        );
        sendPixel("Contact", { method: "WhatsApp", link_url: href });
        return;
      }
      if (isTel) {
        var phoneMetadata = getCtaMetadata(a);
        sendGA4("phone_click", {
          link_url: href,
          link_text: (a.textContent || "").trim(),
          cta_id: phoneMetadata.cta_id,
          cta_text: phoneMetadata.cta_text,
        }, a);
        sendPixel("Contact", { method: "Phone", link_url: href });
        return;
      }
      if (isMail) {
        var emailMetadata = getCtaMetadata(a);
        sendGA4("email_click", {
          link_url: href,
          link_text: (a.textContent || "").trim(),
          cta_id: emailMetadata.cta_id,
          cta_text: emailMetadata.cta_text,
        }, a);
        sendPixel("Contact", { method: "Email", link_url: href });
        return;
      }
      if (isExternal) {
        if (/g\.page|maps\.google/.test(href)) {
          sendGA4("review_click", {
            link_url: href,
            review_action: /\/review/.test(href) ? "leave_review" : "profile",
          }, a);
          return;
        }
        sendGA4("outbound_click", { link_url: href }, a);
        return;
      }
    },
    { passive: true }
  );

  document.addEventListener("click", function (e) {
    var _t = /** @type {any} */ (e.target);
    var el = _t && _t.closest ? _t.closest(".btn-primary, .btn-outline, .btn-dark") : null;
    if (!el) return;
    if (el.getAttribute("data-analytics") === "cta-micro") return;
    var rawHref = el.getAttribute("href") || "";
    var destinationUrl = "";
    try {
      destinationUrl = rawHref ? new URL(rawHref, location.href).href : "";
    } catch (_) {
      destinationUrl = rawHref;
    }
    /** @type {string | undefined} */
    var destinationType = undefined;
    if (/(?:wa\.me|whatsapp)/i.test(destinationUrl) || /(?:wa\.me|whatsapp)/i.test(rawHref)) {
      destinationType = "whatsapp";
    } else if (/^tel:/i.test(rawHref)) {
      destinationType = "tel";
    } else if (/^mailto:/i.test(rawHref)) {
      destinationType = "email";
    } else if (/^https?:/i.test(destinationUrl || rawHref)) {
      try {
        destinationType = new URL(destinationUrl || rawHref, location.href).origin === location.origin
          ? "internal"
          : "external";
      } catch (_) {
        destinationType = "external";
      }
    }
    var ctaPosition = getCtaPosition(el) || "content";
    var ctaMetadata = getCtaMetadata(el);

    sendGA4(
      "cta_click",
      {
        cta_type: el.classList.contains("btn-primary")
          ? "primary"
          : el.classList.contains("btn-outline")
            ? "outline"
            : "dark",
        link_text: (el.textContent || "").trim(),
        destination_url: destinationUrl || undefined,
        destination_type: destinationType,
        cta_position: ctaPosition,
        cta_id: ctaMetadata.cta_id,
        cta_text: ctaMetadata.cta_text,
      },
      el
    );
  });

  document.addEventListener("click", function (e) {
    var _t = /** @type {any} */ (e.target);
    var a = _t && _t.closest ? _t.closest("a") : null;
    if (!a) return;

    if (a.closest("nav") || a.closest("[data-nav]")) {
      sendGA4(
        "nav_click",
        {
          nav_label: (a.textContent || "").trim(),
          destination_url: a.href,
        },
        a
      );
    }
  });

  var scroll50 = false;
  var scroll75 = false;
  window.addEventListener(
    "scroll",
    function () {
      var h = document.documentElement;
      var scroll = h.scrollTop + window.innerHeight;
      var height = h.scrollHeight;
      if (!height) return;

      var ratio = scroll / height;

      if (!scroll50 && ratio > 0.5) {
        scroll50 = true;
        sendGA4("scroll_50");
      }

      if (!scroll75 && ratio > 0.75) {
        scroll75 = true;
        sendGA4("scroll_75");
      }
    },
    { passive: true }
  );

  // Eventos personalizados desde el markup: data-ga-event="name"
  document.addEventListener(
    "click",
    function (e) {
      var _t = /** @type {any} */ (e.target);
      var el = _t && _t.closest ? _t.closest("[data-ga-event]") : null;
      if (!el) return;
      var name = el.getAttribute("data-ga-event");
      var label = el.getAttribute("data-ga-label");
      if (name)
        sendGA4(name, {
          label: label || (el.textContent || "").trim(),
        }, el);
    },
    { passive: true }
  );

  // Micro-CTAs tracking (cards): data-analytics="cta-micro"
  document.addEventListener(
    "click",
    function (e) {
      var _t = /** @type {any} */ (e.target);
      var el = _t && _t.closest ? _t.closest('[data-analytics="cta-micro"]') : null;
      if (!el) return;
      try {
        var id = el.id || "";
        var txt = (el.textContent || "").trim();
        sendGA4("cta_micro_click", {
          element_id: id || "cta-micro",
          element_text: txt,
        }, el);
        // CTA Micro is not a real contact -> do not send to Pixel
      } catch (_) {}
    },
    { passive: true }
  );

  // Explicit Lead Generation tracking: data-gtag-lead="label"
  document.addEventListener(
    "click",
    function (e) {
      var _t = /** @type {any} */ (e.target);
      var el = _t && _t.closest ? _t.closest("[data-gtag-lead]") : null;
      if (!el) return;
      var label = el.getAttribute("data-gtag-lead") || "lead_click";
      sendGA4("generate_lead", {
        event_category: "engagement",
        event_label: label,
        value: 1,
      }, el);
    },
    { passive: true }
  );
}
