// @ts-check
import { initAnalytics } from "./analytics.js";
import { initContact } from "./contact-form.js";
import { initBackToTop, initHomepageFloatingWhatsAppCTA } from "./floating-ui.js";
import { initLeadAttributionTracking } from "./lead-tracking.js";
import { renderTags } from "./tag-renderer.js";
import { initImageHygiene } from "./image-hygiene.js";

/**
 * @typedef {Window & typeof globalThis & {
 *   sendGA4?: (name: string, params?: Record<string, any>) => void;
 *   sendPixel?: (name: string, params?: Record<string, any>) => void;
 *   gtag?: (...args: any[]) => void;
 *   fbq?: (...args: any[]) => void;
 *   __fixeraFormTrackBound?: boolean;
 *   __fixeraFormSubmitted?: boolean;
 *   __fixeraLeadTrackBound?: boolean;
 * }} ServiceSiteWindow
 */
const fixeraWindow = /** @type {ServiceSiteWindow} */ (window);

// ===== Utilities =====
/**
 * @param {string} sel
 * @param {Document | DocumentFragment | Element} [root]
 * @returns {Element | null}
 */
const $$ = (sel, root = document) => root.querySelector(sel);

/**
 * @param {string} sel
 * @param {Document | DocumentFragment | Element} [root]
 * @returns {Element[]}
 */
const $$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ===== Data URL Helper =====
const SCRIPT_BASE = (() => {
  const script = /** @type {HTMLScriptElement | null} */ (
    document.currentScript || document.querySelector('script[src*="scripts.js"]')
  );
  try {
    if (script?.src) return new URL(".", script.src).href;
  } catch (_) {}
  return "/js/";
})();

/** @param {string} filename */
const getDataUrl = (filename) => new URL(filename, SCRIPT_BASE).href;

// ===== Hash Navigation (ensure focus lands on target) =====
function initHashNavigation() {
  const handleHash = () => {
    const hash = location.hash;
    if (!hash) return;
    /** @type {HTMLElement | null} */
    let target = null;
    try {
      target = document.querySelector(hash);
    } catch (_) {}

    if (!target && hash.length > 1) {
      target = document.getElementById(hash.slice(1));
    }

    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: false });
    }
  };

  if (location.hash) setTimeout(handleHash, 0);
  window.addEventListener("hashchange", handleHash);
}

// ===== Footer Year =====

// ===== Footer Year =====
function initYear() {
  const y = /** @type {HTMLElement | null} */ ($$("#year"));
  if (y) y.textContent = String(new Date().getFullYear());
}

function initFooterLogoSizing() {
  const logos = Array.from(document.querySelectorAll('footer img[src*="fixera-logo-reg.svg"]'));
  if (!logos.length) return;

  const applySize = () => {
    const viewport =
      window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
    const width = viewport >= 1024 ? 232 : viewport >= 768 ? 200 : 148;

    logos.forEach((node) => {
      const img = /** @type {HTMLImageElement} */ (node);
      img.style.display = "block";
      img.style.width = `${width}px`;
      img.style.height = "auto";
      img.style.maxWidth = "100%";
    });
  };

  applySize();
  window.addEventListener("resize", applySize, { passive: true });
}


// ===== FAQ (details + Expand/Collapse all) =====
function initFAQ() {
  const detailsList = $$$("details.faq");
  if (!detailsList || detailsList.length === 0) return;

  // Ensure aria-expanded reflects initial state
  detailsList.forEach((node) => {
    const d = /** @type {HTMLDetailsElement} */ (node);
    const sum = /** @type {HTMLElement | null} */ (d.querySelector("summary"));
    if (!sum) return;
    sum.setAttribute("aria-expanded", d.hasAttribute("open") ? "true" : "false");
    // Keep aria-expanded in sync when user toggles
    d.addEventListener("toggle", () => {
      sum.setAttribute("aria-expanded", d.open ? "true" : "false");
    });
  });

  // Buttons can be by id or data attribute
  const expandBtn =
    document.getElementById("expand-all") || document.querySelector('[data-faq="expand-all"]');
  const collapseBtn =
    document.getElementById("collapse-all") || document.querySelector('[data-faq="collapse-all"]');

  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      detailsList.forEach((d) => {
        d.setAttribute("open", "true");
        const sum = d.querySelector("summary");
        if (sum) sum.setAttribute("aria-expanded", "true");
      });
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      detailsList.forEach((d) => {
        d.removeAttribute("open");
        const sum = d.querySelector("summary");
        if (sum) sum.setAttribute("aria-expanded", "false");
      });
    });
  }
}

// ===== Gallery (updated, resto intacto) =====
async function initGallery() {
  const htmlLang = (document.documentElement.lang || "en").toLowerCase();
  const currentLang = htmlLang.startsWith("da") ? "da" : "en";

  try {

    // Support both Gallery page and sections embedded in other pages
    const hpGrid = /** @type {HTMLElement | null} */ (
      document.getElementById("hp-grid") || document.getElementById("gallery-grid")
    );
    const frGrid = /** @type {HTMLElement | null} */ (
      document.getElementById("fr-grid") ||
        document.getElementById("fix-repair-grid") ||
        document.getElementById("gallery-fix-grid")
    );
    const baGrid = /** @type {HTMLElement | null} */ (
      document.getElementById("ba-grid") || document.getElementById("before-after-grid")
    );

    // Optional load-more buttons (if present)
    const hpMore = /** @type {HTMLButtonElement | null} */ (
      document.getElementById("hp-more") || document.getElementById("gallery-more")
    );
    const frMore = /** @type {HTMLButtonElement | null} */ (document.getElementById("fr-more"));
    const baMore = /** @type {HTMLButtonElement | null} */ (document.getElementById("ba-more"));

    // If no grids exist, nothing to do
    if (!hpGrid && !frGrid && !baGrid) return;

    // Fetch data (via helper)
    const res = await fetch(getDataUrl("gallery-data.json"));
    if (!res.ok) throw new Error("Failed to load gallery-data.json");

    const data = await res.json();

    // Be flexible with keys to avoid schema drift
    const hp = Array.isArray(data?.homeProjects)
      ? data.homeProjects
      : Array.isArray(data?.gallery)
        ? data.gallery
        : Array.isArray(data?.hp)
          ? data.hp
          : [];

    const fr = Array.isArray(data?.fixAndRepair)
      ? data.fixAndRepair
      : Array.isArray(data?.repair)
        ? data.repair
        : Array.isArray(data?.fr)
          ? data.fr
          : [];

    const baRaw = Array.isArray(data?.beforeAndAfter)
      ? data.beforeAndAfter
      : Array.isArray(data?.beforeAfter)
        ? data.beforeAfter
        : Array.isArray(data?.ba)
          ? data.ba
          : [];

    // Flatten BA into single-image cards (before & after as individual entries)
    const baFlat = baRaw.flatMap(
      /** @param {unknown} it */
      (it) => {
        const item = /** @type {{
        before?: string;
        src?: string;
        thumbBefore?: string;
        thumb?: string;
        beforeAlt?: string;
        alt?: string;
        wBefore?: number;
        w?: number;
        hBefore?: number;
        h?: number;
        after?: string;
        thumbAfter?: string;
        afterAlt?: string;
        wAfter?: number;
        hAfter?: number;
      }} */ (it);
        const out = [];
        if (item.before || item.src) {
          out.push({
            src: item.before || item.src,
            thumb: item.thumbBefore || item.thumb,
            alt: item.beforeAlt || item.alt || "Before maintenance",
            w: item.wBefore || item.w,
            h: item.hBefore || item.h,
          });
        }
        if (item.after || item.src) {
          out.push({
            src: item.after || item.src,
            thumb: item.thumbAfter || item.thumb,
            alt: item.afterAlt || item.alt || "After maintenance",
            w: item.wAfter || item.w,
            h: item.hAfter || item.h,
          });
        }
        return out;
      }
    );

    // Remember which element opened the lightbox to restore focus on close
    /** @type {HTMLElement | null} */
    let lastTrigger = null;
    /** @type {HTMLElement | null} */
    let closeBtn = /** @type {HTMLElement | null} */ (document.getElementById("glight-close"));
    // Lightweight lightbox (only if dialog exists on the page)
    /** @param {string} src @param {string=} alt */
    const openLightbox = (src, alt) => {
      const dlg = /** @type {HTMLDialogElement | null} */ (document.getElementById("glight"));
      const img = /** @type {HTMLImageElement | null} */ (document.getElementById("glight-img"));
      const cap = /** @type {HTMLElement | null} */ (document.getElementById("glight-cap"));
      if (!dlg || !img) return; // No lightbox in this template
      img.src = src;
      if (alt) img.alt = alt;
      else img.removeAttribute("alt");
      if (cap) cap.textContent = alt || "";
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "true");
      if (closeBtn) closeBtn.focus();
    };

    // Close button & backdrop-close wiring (if dialog exists)
    closeBtn = /** @type {HTMLElement | null} */ (document.getElementById("glight-close"));
    closeBtn?.addEventListener("click", () => {
      const dlg = /** @type {HTMLDialogElement | null} */ (document.getElementById("glight"));
      if (dlg?.open) dlg.close();
    });
    const dlgEl = /** @type {HTMLDialogElement | null} */ (document.getElementById("glight"));
    if (dlgEl) {
      dlgEl.addEventListener("click", (e) => {
        if (e.target === dlgEl && dlgEl.open) dlgEl.close();
      });
      dlgEl.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && dlgEl.open) dlgEl.close();
      });
      dlgEl.addEventListener("close", () => {
        if (lastTrigger) lastTrigger.focus();
      });
    }

    // Helpers
    /**
     * @param {string} src
     * @param {string=} thumb
     * @param {string=} alt
     * @param {number=} w
     * @param {number=} h
     */
    const makeCard = (src, thumb, alt, w, h) => {
      const wrapper = document.createElement("div");
      wrapper.className = "gallery-card flex flex-col items-center";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "group block rounded-xl overflow-hidden relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fixera-blue)]";

      const picture = document.createElement("picture");

      const base = src.replace(/\.(webp|jpg|jpeg|png)$/i, "");
      const avif = base + ".avif";
      const webp = base + ".webp";

      const sAvif = document.createElement("source");
      sAvif.type = "image/avif";
      sAvif.srcset = avif;
      picture.appendChild(sAvif);

      const sWebp = document.createElement("source");
      sWebp.type = "image/webp";
      sWebp.srcset = webp;
      picture.appendChild(sWebp);

      const img = document.createElement("img");
      img.src = thumb || src;
      img.alt = alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "w-full h-full object-cover aspect-[4/3]";
      if (typeof w === "number" && typeof h === "number") {
        img.setAttribute("width", String(w));
        img.setAttribute("height", String(h));
      }
      picture.appendChild(img);

      btn.appendChild(picture);
      btn.addEventListener("click", () => {
        lastTrigger = btn;
        openLightbox(src, alt);
      });
      wrapper.appendChild(btn);

      // Per-card CTA removed
      return wrapper;
    };

    const BATCH =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 768px)").matches
        ? 3
        : 2;
    let iHP = 0,
      iFR = 0,
      iBA = 0;

    /**
     * @param {HTMLElement | null} grid
     * @param {Array<{src?: string; thumb?: string; alt?: string; w?: number; h?: number}>} items
     * @param {number} from
     * @param {number} count
     */
    const renderSimple = (grid, items, from, count) => {
      if (!grid) return from;
      if (!Array.isArray(items) || items.length === 0) return from;
      const next = Math.min(from + count, items.length);
      const frag = document.createDocumentFragment();
      for (let i = from; i < next; i++) {
        const { src, thumb, alt, w, h } = items[i];
        if (!src && !thumb) continue;
        frag.appendChild(makeCard(src || thumb || "", thumb, alt, w, h));
      }
      grid.appendChild(frag);
      return next;
    };

    // Enhance images in a grid (lazy/async/fade-in only once)
    /** @param {HTMLElement | null} grid */
    const enhanceGrid = (grid) => {
      if (!grid) return;
      grid.querySelectorAll("img:not([data-enhanced])").forEach((node) => {
        const img = /** @type {HTMLImageElement} */ (node);
        img.loading = "lazy";
        img.decoding = "async";
        img.classList.add("img-fade");
        img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
        img.setAttribute("data-enhanced", "");
      });
    };

    // aria-live helper for announcements on Gallery pages
    /** @param {string} msg */
    const announce = (msg) => {
      let live = document.getElementById("live-region");
      if (!live) {
        live = document.createElement("div");
        live.id = "live-region";
        live.className = "sr-only";
        live.setAttribute("aria-live", "polite");
        live.setAttribute("role", "status");
        document.body.appendChild(live);
      }
      live.textContent = msg || "";
    };

    // Finalize a "Show more" button when exhausted, move focus to grid if hidden
    /**
     * @param {HTMLButtonElement | null} btn
     * @param {string} [label]
     * @param {boolean} [hide]
     * @param {HTMLElement | null} [grid]
     */
    const finalizeMore = (btn, label = "All done", hide = true, grid = null) => {
      if (!btn) return;
      btn.textContent = label;
      btn.setAttribute("disabled", "true");
      btn.setAttribute("aria-disabled", "true");
      btn.dataset.loading = "false";
      if (btn.classList) {
        btn.classList.add("opacity-50", "cursor-not-allowed");
        if (hide) btn.classList.add("hidden");
      }
      btn.removeAttribute("aria-busy");
      // a11y: move focus to the grid if we hide the trigger
      if (hide && grid) {
        if (!grid.hasAttribute("tabindex")) grid.setAttribute("tabindex", "-1");
        if (typeof grid.focus === "function") grid.focus();
      }
      announce(label || "");
    };

    // Initial render + load-more wiring (if buttons exist)
    if (hpGrid) {
      iHP = renderSimple(hpGrid, hp, iHP, hpMore ? BATCH * 2 : Number.MAX_SAFE_INTEGER);
      enhanceGrid(hpGrid);
      if (iHP >= hp.length && hpMore)
        finalizeMore(hpMore, "All Home Projects loaded", true, hpGrid);
      if (hpMore) hpMore.dataset.loading = hpMore.dataset.loading || "false";
      hpMore?.addEventListener("click", () => {
        if (!hpMore || hpMore.dataset.loading === "true" || hpMore.disabled) return;
        hpMore.setAttribute("aria-busy", "true");
        hpMore.disabled = true;
        hpMore.setAttribute("aria-disabled", "true");
        hpMore.dataset.loading = "true";
        iHP = renderSimple(hpGrid, hp, iHP, BATCH);
        enhanceGrid(hpGrid);
        if (iHP >= hp.length && hpMore)
          finalizeMore(hpMore, "All Home Projects loaded", true, hpGrid);
        else
          setTimeout(() => {
            hpMore.removeAttribute("aria-busy");
            hpMore.disabled = false;
            hpMore.removeAttribute("aria-disabled");
            hpMore.dataset.loading = "false";
          }, 150);
      });
    }

    if (frGrid) {
      iFR = renderSimple(frGrid, fr, iFR, frMore ? BATCH * 2 : Number.MAX_SAFE_INTEGER);
      enhanceGrid(frGrid);
      if (iFR >= fr.length && frMore)
        finalizeMore(frMore, "All Fix and Repair photos loaded", true, frGrid);
      if (frMore) frMore.dataset.loading = frMore.dataset.loading || "false";
      frMore?.addEventListener("click", () => {
        if (!frMore || frMore.dataset.loading === "true" || frMore.disabled) return;
        frMore.setAttribute("aria-busy", "true");
        frMore.disabled = true;
        frMore.setAttribute("aria-disabled", "true");
        frMore.dataset.loading = "true";
        iFR = renderSimple(frGrid, fr, iFR, BATCH);
        enhanceGrid(frGrid);
        if (iFR >= fr.length && frMore)
          finalizeMore(frMore, "All Fix and Repair photos loaded", true, frGrid);
        else
          setTimeout(() => {
            frMore.removeAttribute("aria-busy");
            frMore.disabled = false;
            frMore.removeAttribute("aria-disabled");
            frMore.dataset.loading = "false";
          }, 150);
      });
    }

    if (baGrid) {
      iBA = renderSimple(baGrid, baFlat, iBA, baMore ? BATCH * 2 : Number.MAX_SAFE_INTEGER);
      enhanceGrid(baGrid);
      if (iBA >= baFlat.length && baMore)
        finalizeMore(baMore, "All Before and After photos loaded", true, baGrid);
      if (baMore) baMore.dataset.loading = baMore.dataset.loading || "false";
      baMore?.addEventListener("click", () => {
        if (!baMore || baMore.dataset.loading === "true" || baMore.disabled) return;
        baMore.setAttribute("aria-busy", "true");
        baMore.disabled = true;
        baMore.setAttribute("aria-disabled", "true");
        baMore.dataset.loading = "true";
        iBA = renderSimple(baGrid, baFlat, iBA, BATCH);
        enhanceGrid(baGrid);
        if (iBA >= baFlat.length && baMore)
          finalizeMore(baMore, "All Before and After photos loaded", true, baGrid);
        else
          setTimeout(() => {
            baMore.removeAttribute("aria-busy");
            baMore.disabled = false;
            baMore.removeAttribute("aria-disabled");
            baMore.dataset.loading = "false";
          }, 150);
      });
    }
  } catch (err) {
    console.error("[Gallery] init error:", err);
    // Show a friendly fallback if any grid exists
    const grids = /** @type {HTMLElement[]} */ (
      [
        document.getElementById("hp-grid") || document.getElementById("gallery-grid"),
        document.getElementById("fr-grid") ||
          document.getElementById("fix-repair-grid") ||
          document.getElementById("gallery-fix-grid"),
        document.getElementById("ba-grid") || document.getElementById("before-after-grid"),
      ].filter(Boolean)
    );
    grids.forEach((g) => {
      g.textContent = "";
      const p = document.createElement("p");
      p.className = "text-center text-sm text-gray-600";
      p.textContent =
        currentLang === "da"
          ? "Galleriet kunne ikke indlæses. Prøv igen senere."
          : "Unable to load gallery right now. Please try again later.";
      g.appendChild(p);
    });
  }
}

/* ===== Projects (list + detail) ===== */
async function initProjects() {
  try {
    const listEl = document.getElementById("projects-grid");
    const articleEl = document.getElementById("project-article");
    if (!listEl && !articleEl) return;

    const htmlLang = (document.documentElement.lang || "en").toLowerCase();
    const currentLang = htmlLang.startsWith("da") ? "da" : "en";

    const res = await fetch(getDataUrl("projects-data.json"));
    if (!res.ok) throw new Error("Failed to load projects-data.json");
    const data = await res.json();
    document.dispatchEvent(new CustomEvent("projects:data-ready", { detail: data }));
    const projects = /** @type {any[]} */ (Array.isArray(data?.projects) ? data.projects : []);

    /** @param {string} loc */
    const formatLocation = (loc) =>
      String(loc || "")
        .replace(/\s*\/\s*/g, " · ")
        .replace(/\s{2,}/g, " ")
        .trim();

    /** @param {string} str */
    const slugify = (str) =>
      String(str || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

    /**
     * @param {string | { slug?: string; label?: string | Record<string, string> }} tag
     * @returns {{ slug: string; label: string } | null}
     */
    const normalizeTag = (tag) => {
      if (!tag) return null;
      if (typeof tag === "string") {
        return { slug: slugify(tag), label: tag };
      }
      if (typeof tag === "object") {
        const label =
          typeof tag.label === "object"
            ? tag.label[currentLang] || tag.label.en || Object.values(tag.label)[0] || ""
            : tag.label || "";
        const slug = tag.slug || slugify(String(label || tag.label || ""));
        return { slug, label: label || slug };
      }
      return null;
    };

    /**
     * @param {string | null | undefined} slug
     * @param {string=} lang
     */
    const findBySlug = (slug, lang) =>
      projects.find((item) => {
        if (!item) return false;
        if (String(item.slug || "") !== String(slug || "")) return false;
        if (!lang) return true;
        return (item.locale || "en").toLowerCase() === lang;
      });

    const localizedProjects = projects.filter((p) => {
      const lang = (p.locale || "en").toLowerCase();
      return !p.locale || lang === currentLang;
    });
    const renderPool = localizedProjects.length
      ? localizedProjects
      : projects.filter((p) => (p.locale || "en").toLowerCase() === "en");
    /** @type {any[]} */
    const renderProjects = [];
    const seenProjectSlugs = new Set();
    renderPool.forEach((project) => {
      const slugKey = String(project?.slug || "").toLowerCase();
      if (slugKey && seenProjectSlugs.has(slugKey)) return;
      if (slugKey) seenProjectSlugs.add(slugKey);
      renderProjects.push(project);
    });

    if (listEl) {
      const placeholder = document.getElementById("projects-placeholder");
      placeholder?.remove();
      listEl.textContent = "";

      const ariaPrefix = currentLang === "da" ? "Filtrér efter" : "Filter by";

      if (!renderProjects.length) {
        const empty = document.createElement("p");
        empty.className = "text-center text-sm text-gray-600";
        empty.textContent =
          currentLang === "da"
            ? "Der er ingen projekter at vise endnu. Kig snart forbi igen."
            : "No projects published yet. Please check back soon.";
        listEl.appendChild(empty);
      } else {
        const frag = document.createDocumentFragment();
        renderProjects.forEach((project) => {
          const projectLang = (project.locale || "en").toLowerCase();
          const hrefSuffix = projectLang === "da" ? ".da" : "";
          const normalizedTags = Array.isArray(project.tags)
            ? project.tags.map(normalizeTag).filter(Boolean)
            : [];
          const tags = /** @type {Array<{ slug: string; label: string }>} */ (normalizedTags);
          const tagAttr = tags.map((t) => t.slug).join(",");

          const article = document.createElement("article");
          article.className =
            "project-card group rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden";
          article.setAttribute("role", "listitem");
          if (tagAttr) article.setAttribute("data-tags", tagAttr);

          const link = document.createElement("a");
          link.href = `/projects/${project.slug}${hrefSuffix}`;
          link.className =
            "block focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--fixera-blue)]";

          const figure = document.createElement("figure");
          figure.className = "aspect-[16/9] overflow-hidden rounded-t-2xl";

          const picture = document.createElement("picture");
          const base = (project.cover?.src || "").replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");
          const sAvif = document.createElement("source");
          sAvif.type = "image/avif";
          sAvif.srcset = base ? base + ".avif" : project.cover?.src || "";
          picture.appendChild(sAvif);
          const sWebp = document.createElement("source");
          sWebp.type = "image/webp";
          sWebp.srcset = base ? base + ".webp" : project.cover?.src || "";
          picture.appendChild(sWebp);

          const img = document.createElement("img");
          img.src = project.cover?.src || "";
          img.alt = project.cover?.alt || project.title || "Project cover";
          img.loading = "lazy";
          img.decoding = "async";
          img.className =
            "h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]";
          img.setAttribute("width", String(project.cover?.w || 1600));
          img.setAttribute("height", String(project.cover?.h || 900));
          picture.appendChild(img);

          const figcap = document.createElement("figcaption");
          figcap.className = "sr-only";
          figcap.textContent = project.title || "";

          figure.appendChild(picture);
          figure.appendChild(figcap);
          link.appendChild(figure);

          const body = document.createElement("div");
          body.className = "p-4";

          const heading = document.createElement("h3");
          heading.className = "text-lg font-semibold group-hover:underline";
          heading.textContent = project.title || "";
          body.appendChild(heading);

          if (project.summary) {
            const summary = document.createElement("p");
            summary.className = "text-sm text-gray-700 mt-2 line-clamp-2";
            summary.textContent = project.summary;
            body.appendChild(summary);
          }

          const micro = document.createElement("p");
          micro.className = "mt-3";
          const microLink = document.createElement("a");
          microLink.href = currentLang === "da" ? "/contact.da" : "/contact";
          microLink.className =
            "inline-flex items-center gap-1 text-sm font-semibold text-[var(--fixera-blue)] hover:opacity-80";
          microLink.setAttribute("data-gtag-lead", "contact_inline_projects");
          microLink.textContent =
            currentLang === "da"
              ? "Brug for noget lignende? Få et tilbud →"
              : "Need something similar? Get a quote →";
          micro.appendChild(microLink);
          body.appendChild(micro);

          if (project.location) {
            const displayLoc = formatLocation(project.location);
            const loc = document.createElement("div");
            loc.className = "mt-3 text-sm text-gray-600";
            loc.textContent = displayLoc;
            body.appendChild(loc);
          }

          if (tags.length) {
            const tagsWrap = document.createElement("div");
            tagsWrap.className = "mt-3 flex flex-wrap gap-2";
            tags.forEach((tag) => {
              const tagChip = document.createElement("span");
              tagChip.className = "chip";
              tagChip.setAttribute("aria-label", `${ariaPrefix} ${tag.label}`);
              tagChip.textContent = tag.label;
              tagsWrap.appendChild(tagChip);
            });
            body.appendChild(tagsWrap);
          }

          const cta = document.createElement("a");
          cta.href = `/projects/${project.slug}${hrefSuffix}`;
          cta.className =
            "card-cta inline-flex items-center gap-1 text-sm font-medium text-[var(--fixera-blue)] mt-4";
          cta.textContent = currentLang === "da" ? "Se projekt" : "View project";

          const arrow = document.createElement("span");
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = " →";
          cta.appendChild(arrow);
          body.appendChild(cta);

          article.appendChild(link);
          article.appendChild(body);
          frag.appendChild(article);
        });
        listEl.appendChild(frag);
      }
    }

    if (articleEl) {
      const main = articleEl.closest("main");
      const slug = main?.getAttribute("data-project-slug");
      let project = findBySlug(slug, currentLang);
      if (!project) {
        project = findBySlug(slug, "en") || findBySlug(slug);
      }
      if (!project) return;

      const projectLang = (project.locale || "en").toLowerCase();
      const ariaPrefix = projectLang === "da" ? "Filtrér efter" : "Filter by";

      const titleEl = document.getElementById("project-title");
      const sumEl = document.getElementById("project-summary");
      const dateEl = document.getElementById("project-date");
      const locEl = document.getElementById("project-location");
      const tagsEl = document.getElementById("project-tags");
      const crumbEl = document.getElementById("crumb-title");
      const coverEl = /** @type {HTMLImageElement | null} */ (
        document.getElementById("project-cover")
      );
      const storyEl = /** @type {HTMLElement | null} */ (document.getElementById("project-story"));
      const galEl = /** @type {HTMLElement | null} */ (document.getElementById("project-gallery"));

      if (titleEl) titleEl.textContent = project.title || "";
      if (crumbEl) crumbEl.textContent = project.title || "";
      if (sumEl) sumEl.textContent = project.summary || "";
      if (dateEl && project.date) {
        dateEl.setAttribute("datetime", project.date);
        dateEl.textContent = project.date;
      }
      if (locEl && project.location) {
        const displayLoc = formatLocation(project.location);
        locEl.textContent = displayLoc;
        locEl.className = "text-sm text-gray-600";
        locEl.removeAttribute("title");
        locEl.removeAttribute("aria-label");
      }

      if (tagsEl) {
        const tags = /** @type {Array<{ slug: string; label: string }>} */ (
          (Array.isArray(project.tags) ? project.tags.map(normalizeTag) : []).filter(Boolean)
        );
        renderTags(tagsEl, tags, { ariaPrefix });
      }

      if (coverEl && project.cover) {
        coverEl.src = project.cover.src || "";
        coverEl.alt = project.cover.alt || project.title || "Project cover";
        coverEl.setAttribute("width", String(project.cover.w || 1600));
        coverEl.setAttribute("height", String(project.cover.h || 900));
        coverEl.loading = "eager";
        coverEl.decoding = "async";
      }

      if (Array.isArray(project.story) && storyEl) {
        const story = /** @type {Array<string>} */ (project.story);
        storyEl.textContent = "";
        const frag = document.createDocumentFragment();
        story.forEach((para) => {
          const p = document.createElement("p");
          p.textContent = para;
          frag.appendChild(p);
        });
        storyEl.appendChild(frag);
      }

      if (Array.isArray(project.images) && galEl) {
        galEl.textContent = "";
        const frag = document.createDocumentFragment();
        const images =
          /** @type {Array<{ src?: string; alt?: string; w?: number; h?: number }>} */ (
            project.images
          );
        images.forEach((img) => {
          const figure = document.createElement("figure");
          figure.className = "rounded-xl overflow-hidden bg-white shadow-sm";

          const picture = document.createElement("picture");
          const base = (img.src || "").replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");
          const sAvif = document.createElement("source");
          sAvif.type = "image/avif";
          sAvif.srcset = base ? base + ".avif" : img.src || "";
          picture.appendChild(sAvif);
          const sWebp = document.createElement("source");
          sWebp.type = "image/webp";
          sWebp.srcset = base ? base + ".webp" : img.src || "";
          picture.appendChild(sWebp);

          const el = document.createElement("img");
          el.src = img.src || "";
          el.alt = img.alt || "";
          el.loading = "lazy";
          el.decoding = "async";
          el.className = "w-full h-auto object-cover";
          if (img.w && img.h) {
            el.setAttribute("width", String(img.w));
            el.setAttribute("height", String(img.h));
          }

          const cap = document.createElement("figcaption");
          cap.className = "text-sm text-gray-600 px-3 py-2";
          cap.textContent = img.alt || "";

          picture.appendChild(el);
          figure.appendChild(picture);
          figure.appendChild(cap);
          frag.appendChild(figure);
        });
        galEl.appendChild(frag);
      }

      const ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: project.title || "",
        datePublished: project.date || "",
        author: { "@type": "Person", name: "Portfolio Case Study" },
        publisher: { "@type": "Organization", name: "Fixera" },
        image: /** @type {Array<{ src?: string; w?: number; h?: number }>} */ (
          (project.images || []).slice(0, 6)
        ).map((im) => ({
          "@type": "ImageObject",
          contentUrl: im.src,
          width: im.w,
          height: im.h,
        })),
        articleBody: Array.isArray(project.story) ? project.story.join("\n\n") : "",
      };
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    }
  } catch (err) {
    console.error("[Projects] init error:", err);
  }
}
initAnalytics();

// ---- Boot ----
(function boot() {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        initYear();
        initFooterLogoSizing();
        initHashNavigation();
        initImageHygiene();
        initFAQ();
        initLeadAttributionTracking();
        initProjects();
        initBackToTop();
        initHomepageFloatingWhatsAppCTA();
        const page = document.body?.dataset?.page;
        if (page === "gallery") initGallery();
        if (page === "contact") initContact();
      },
      { once: true }
    );
  } else {
    initYear();
    initFooterLogoSizing();
    initHashNavigation();
    initImageHygiene();
    initFAQ();
    initLeadAttributionTracking();
    initProjects();
    initBackToTop();
    initHomepageFloatingWhatsAppCTA();
    const pageNow = document.body?.dataset?.page;
    if (pageNow === "gallery") initGallery();
    if (pageNow === "contact") initContact();
  }
})(); // === CLS fix for glight-img ===
(() => {
  const img = /** @type {HTMLImageElement | null} */ (document.getElementById("glight-img"));
  if (!img) return;

  const applyIntrinsicSize = () => {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (nw && nh) {
      img.setAttribute("width", String(nw));
      img.setAttribute("height", String(nh));
      // extra: mantener ratio incluso si el browser ignora attrs hasta pintar
      img.style.aspectRatio = `${nw} / ${nh}`;
    }
  };

  // aplicar si ya cargó
  if (img.complete) applyIntrinsicSize();

  // cuando cargue nueva imagen
  img.addEventListener("load", applyIntrinsicSize, { passive: true });

  // re-aplicar cuando cambie el src (lightbox navega)
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.attributeName === "src") {
        img.removeAttribute("width");
        img.removeAttribute("height");
        // puede no estar cargada aún; 'load' cubrirá el caso
        if (img.complete) applyIntrinsicSize();
      }
    }
  }).observe(img, { attributes: true, attributeFilter: ["src"] });
})();
// GA4: explicit Gallery CTA tracking (id or data-cta)
(function () {
  document.addEventListener(
    "click",
    function (e) {
      var _t = /** @type {any} */ (e.target);
      var el = _t && _t.closest ? _t.closest('#cta-gallery, [data-cta="gallery"]') : null;
      if (!el) return;
      try {
        if (typeof fixeraWindow.sendGA4 === "function") {
          fixeraWindow.sendGA4(
            "gallery_cta_click",
            {
              element_id: el.id || "data-cta:gallery",
              element_text: (el.textContent || "").trim(),
            }
          );
        }
      } catch (_) {}
    },
    { passive: true }
  );

})();


/* a11y: aria-live helper for contact form */
/* a11y: aria-live helper for contact form */
(function () {
  var el = document.getElementById("form-status");
  /** @type {any} */ (window).fxAnnounce = function (/** @type {string} */ m) {
    if (el) {
      el.textContent = m;
    }
  };
})();

// --- Language switch normalizer (header) ---
// Rebuilds language toggles using optional data-lang-en / data-lang-da hints on <body>.
(function () {
  /**
   * @param {string} p
   * @returns {string}
   */
  function normalizePath(p) {
    if (!p) return "/";
    if (/^https?:\/\//i.test(p)) return p.trim();
    var out = p.trim();
    if (!out.startsWith("/")) out = "/" + out;
    return out.replace(/\/{2,}/g, "/");
  }

  /**
   * @param {unknown} value
   * @param {string=} fallback
   * @returns {string | null}
   */
  function resolveTarget(value, fallback) {
    if (typeof value === "string") {
      var trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === "none") return null;
      return normalizePath(trimmed);
    }
    if (!fallback) return null;
    return normalizePath(fallback);
  }

  /**
   * @param {string} label
   * @param {string} lang
   * @param {string | null} href
   * @param {boolean} isCurrent
   * @param {boolean} available
   */
  function buildOption(label, lang, href, isCurrent, available) {
    var el;
    if (!available || !href) {
      el = document.createElement("span");
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("tabindex", "-1");
      el.className =
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 py-2 text-sm font-medium text-gray-500";
    } else {
      el = document.createElement("a");
      el.href = href;
      el.setAttribute("hreflang", lang);
      el.className =
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 py-2 text-sm font-medium text-[var(--fixera-blue)] hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--fixera-blue)]";
    }
    el.textContent = label;
    el.setAttribute("lang", lang);

    if (isCurrent) {
      el.setAttribute("aria-current", "true");
      el.classList.remove("text-[var(--fixera-blue)]");
      el.classList.add("text-gray-500");
      if (el.tagName === "A") {
        el.style.pointerEvents = "none";
        el.classList.remove("hover:opacity-80");
      }
    }

    return el;
  }

  /**
   * @param {{
   *   currentLang: string;
   *   enHref: string | null;
   *   daHref: string | null;
   *   enAvailable: boolean;
   *   daAvailable: boolean;
   * }} config
   */
  function buildSwitch(config) {
    var wrap = document.createElement("div");
    wrap.className = "flex items-center gap-1.5";
    wrap.setAttribute("aria-label", "Language");

    var en = buildOption(
      "EN",
      "en",
      config.enHref,
      config.currentLang === "en",
      config.enAvailable
    );
    var sep = document.createElement("span");
    sep.textContent = "|";
    sep.className = "px-0.5 text-gray-400 leading-none";
    sep.setAttribute("aria-hidden", "true");
    var da = buildOption(
      "DA",
      "da",
      config.daHref,
      config.currentLang === "da",
      config.daAvailable
    );

    wrap.appendChild(en);
    wrap.appendChild(sep);
    wrap.appendChild(da);
    return wrap;
  }

  function normalizeAll() {
    var htmlLang = (document.documentElement.lang || "en").toLowerCase();
    var currentLang = htmlLang.indexOf("da") === 0 ? "da" : "en";
    var dataset = document.body ? document.body.dataset || {} : {};

    // Strict mode: only use explicit data-lang-* attributes.
    // No automatic fallback or path guessing.
    var enHref = resolveTarget(dataset.langEn);
    var daHref = resolveTarget(dataset.langDa);

    var config = {
      currentLang: currentLang,
      enHref: enHref,
      daHref: daHref,
      enAvailable: !!enHref,
      daAvailable: !!daHref,
    };

    document.querySelectorAll('[aria-label="Language"]').forEach(function (node) {
      if (!node || !node.parentNode) return;
      node.parentNode.replaceChild(buildSwitch(config), node);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", normalizeAll, { once: true });
  } else {
    normalizeAll();
  }
})();

/* Note: Gallery “Show more” inline script was removed from gallery.html.
   Its behavior is implemented in initGallery() (finalizeMore, enhanceGrid, batching).
   Keep this file as the single source for Gallery logic. */


/* === Nav drawer (hamburger) logic === */
function initNavDrawer() {
  var toggleRaw =
    document.getElementById("site-nav-toggle") || document.getElementById("nav-toggle");
  var closeRaw = document.getElementById("site-nav-close") || document.getElementById("nav-close");
  var drawerRaw =
    document.getElementById("site-drawer") || document.getElementById("mobile-drawer");
  var overlayRaw =
    document.getElementById("site-nav-overlay") || document.getElementById("nav-overlay");
  if (!toggleRaw || !drawerRaw || !overlayRaw) return;

  var toggleEl = /** @type {HTMLElement} */ (toggleRaw);
  var closeBtnEl = closeRaw ? /** @type {HTMLElement} */ (closeRaw) : null;
  var drawerEl = /** @type {HTMLElement} */ (drawerRaw);
  var overlayEl = /** @type {HTMLElement} */ (overlayRaw);

  var root = document.documentElement;
  var body = document.body;
  var active = false;
  /** @type {HTMLElement|null} */ var lastFocus = null;
  var previousOverflow = "";
  var focusableSelector =
    'a[href]:not([tabindex="-1"]), button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var inertTargets = /** @type {HTMLElement[]} */ (
    Array.from(body.children).filter(function (node) {
      return node !== drawerEl && node !== overlayEl;
    })
  );

  if (!drawerEl.hasAttribute("tabindex")) drawerEl.setAttribute("tabindex", "-1");
  if (!overlayEl.hasAttribute("tabindex")) overlayEl.setAttribute("tabindex", "-1");
  if (!overlayEl.hasAttribute("aria-hidden")) overlayEl.setAttribute("aria-hidden", "true");
  if (!drawerEl.hasAttribute("aria-hidden")) drawerEl.setAttribute("aria-hidden", "true");

  /**
   * @param {boolean} disable
   */
  function setBackgroundDisabled(disable) {
    inertTargets.forEach(function (node) {
      if (!node || node.hasAttribute("data-nav-persist")) return;
      if (disable) {
        if (node.dataset.navInert === "true") return;
        node.dataset.navInert = "true";
        node.dataset.navPrevAriaHidden = node.hasAttribute("aria-hidden")
          ? node.getAttribute("aria-hidden") || ""
          : "";
        node.setAttribute("aria-hidden", "true");
        node.setAttribute("inert", "");
        if ("inert" in node) {
          try {
            node.inert = true;
          } catch (_) {}
        }
      } else if (node.dataset.navInert === "true") {
        if (node.dataset.navPrevAriaHidden) {
          node.setAttribute("aria-hidden", node.dataset.navPrevAriaHidden);
        } else {
          node.removeAttribute("aria-hidden");
        }
        node.removeAttribute("inert");
        if ("inert" in node) {
          try {
            node.inert = false;
          } catch (_) {}
        }
        delete node.dataset.navInert;
        delete node.dataset.navPrevAriaHidden;
      }
    });
  }

  /** @returns {HTMLElement[]} */
  function getFocusables() {
    return Array.from(drawerEl.querySelectorAll(focusableSelector))
      .map(function (node) {
        return /** @type {HTMLElement} */ (node);
      })
      .filter(function (node) {
        if (node.hasAttribute("disabled")) return false;
        if (node.getAttribute("aria-hidden") === "true") return false;
        var style = window.getComputedStyle(node);
        if (style.display === "none" || style.visibility === "hidden") return false;
        return true;
      });
  }

  /**
   * @param {KeyboardEvent} event
   */
  function trapFocus(event) {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.key !== "Tab") return;

    var focusables = getFocusables();
    if (!focusables.length) {
      event.preventDefault();
      drawerEl.focus();
      return;
    }

    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    var isShift = event.shiftKey;
    var activeEl = document.activeElement;

    if (!isShift && activeEl === last) {
      event.preventDefault();
      first.focus();
    } else if (isShift && activeEl === first) {
      event.preventDefault();
      last.focus();
    }
  }

  function openMenu() {
    if (active) return;
    active = true;
    lastFocus = /** @type {HTMLElement | null} */ (document.activeElement);
    previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    overlayEl.classList.add("is-open");
    drawerEl.classList.add("is-open");
    overlayEl.setAttribute("aria-hidden", "false");
    drawerEl.setAttribute("aria-hidden", "false");
    toggleEl.setAttribute("aria-expanded", "true");
    toggleEl.classList.add("open");
    setBackgroundDisabled(true);
    try {
      if (fixeraWindow.sendGA4)
        fixeraWindow.sendGA4(
          "nav_open",
          { placement: "hamburger", cta_position: "nav" }
        );
    } catch (_) {}

    var focusables = getFocusables();
    var first = focusables[0] || drawerEl;
    var focusTarget = overlayEl || first;
    setTimeout(function () {
      var target = focusTarget && typeof focusTarget.focus === "function" ? focusTarget : first;
      if (target && typeof target.focus === "function") target.focus();
    }, 40);

    document.addEventListener("keydown", trapFocus, true);
  }

  /** @param {boolean} [restoreFocus] */
  function closeMenu(restoreFocus) {
    if (restoreFocus === undefined) restoreFocus = true;
    if (!active) return;
    active = false;
    overlayEl.classList.remove("is-open");
    drawerEl.classList.remove("is-open");
    overlayEl.setAttribute("aria-hidden", "true");
    drawerEl.setAttribute("aria-hidden", "true");
    toggleEl.setAttribute("aria-expanded", "false");
    toggleEl.classList.remove("open");
    setBackgroundDisabled(false);
    root.style.overflow = previousOverflow;
    document.removeEventListener("keydown", trapFocus, true);
    try {
      if (fixeraWindow.sendGA4)
        fixeraWindow.sendGA4(
          "nav_close",
          { placement: "hamburger", cta_position: "nav" }
        );
    } catch (_) {}
    if (restoreFocus) {
      setTimeout(function () {
        var target = lastFocus && typeof lastFocus.focus === "function" ? lastFocus : toggleEl;
        if (target && typeof target.focus === "function") target.focus();
      }, 40);
    }
  }

  toggleEl.addEventListener("click", function (event) {
    event.preventDefault();
    if (active) closeMenu(true);
    else openMenu();
  });

  toggleEl.addEventListener("keydown", function (event) {
    var isSpace = event.key === " " || event.key === "Spacebar";
    if (event.key === "Enter" || isSpace) {
      event.preventDefault();
      if (active) closeMenu(true);
      else openMenu();
    }
  });

  if (closeBtnEl) {
    closeBtnEl.addEventListener("click", function (event) {
      event.preventDefault();
      closeMenu(true);
    });
  }

  overlayEl.addEventListener("click", function (event) {
    event.preventDefault();
    closeMenu(true);
  });

  drawerEl.addEventListener("click", function (event) {
    var _t = /** @type {any} */ (event.target);
    var tgt = _t && _t.closest ? _t.closest("a[href]") : null;
    if (tgt) closeMenu(true);
  });

  drawerEl.addEventListener("transitionend", function (event) {
    if (event.propertyName !== "transform") return;
    if (!active) {
      drawerEl.scrollTop = 0;
    }
  });

  return {
    open: openMenu,
    close: closeMenu,
  };
}

function initActiveNavLinks() {
  var body = document.body;
  if (!body || !body.dataset) return;
  var key = (body.dataset.page || "").toLowerCase();
  if (!key) return;

  var map = /** @type {Record<string, string>} */ ({
    index: "home",
    home: "home",
    services: "services",
    gallery: "gallery",
    about: "about",
    contact: "contact",
    ads: "ads",
    "projects-index": "projects",
    "projects-detail": "projects",
  });

  /** @type {string | undefined} */
  var target = map[key];
  if (!target) return;

  document.querySelectorAll("[data-nav]").forEach(function (link) {
    if (!(link instanceof HTMLElement)) return;
    if (link.dataset.nav === target) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

(function () {
  var header = document.querySelector('header[role="banner"]') || document.querySelector("header");
  if (!header) return;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    if (!header) return;
    if (y > 8) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

(function () {
  function initNav() {
    initNavDrawer();
    initActiveNavLinks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNav, { once: true });
  } else {
    initNav();
  }
})();

// ---- Gallery: inject project photos into Home Projects grid ----
(function () {
  const loader = /** @type {HTMLElement | null} */ (document.getElementById("projects-loader"));
  const grid = /** @type {HTMLElement | null} */ (document.getElementById("hp-grid"));
  if (!loader || !grid) return;

  // Insert images from projects (album: "hp") into the Home Projects grid
  /**
   * @param {{
   *   projects?: Array<{
   *     album?: string;
   *     title?: string;
   *     images?: Array<{ src?: string; alt?: string; w?: number; h?: number }>;
   *   }>;
   * }} data
   */
  const inject = (data) => {
    try {
      if (!data || !Array.isArray(data.projects)) {
        loader.remove();
        return;
      }
      const items = data.projects.filter((p) => {
        const project = /** @type {{ album?: string }} */ (p);
        return (project.album || "").toLowerCase() === "hp";
      });
      if (!items.length) {
        loader.remove();
        return;
      }
      const frag = document.createDocumentFragment();

      items.forEach((p) => {
        const project = /** @type {{
          title?: string;
          images?: Array<{ src?: string; alt?: string; w?: number; h?: number }>;
        }} */ (p);

        if (!Array.isArray(project.images)) return;

        project.images.forEach((img) => {
          const photo = /** @type {{
            src?: string;
            alt?: string;
            w?: number;
            h?: number;
          }} */ (img);

          if (!photo || !photo.src) return;

          const fig = document.createElement("figure");
          fig.className = "project";

          const el = document.createElement("img");
          el.src = photo.src;
          el.alt = photo.alt || project.title || "";
          el.loading = "lazy";
          el.decoding = "async";
          el.className = "w-full h-auto object-cover rounded-lg shadow-sm";
          if (photo.w) el.setAttribute("width", String(photo.w));
          if (photo.h) el.setAttribute("height", String(photo.h));

          fig.appendChild(el);
          frag.appendChild(fig);
        });
      });

      grid.appendChild(frag);
      loader.remove();
    } catch (err) {
      console.error("[Gallery inject]", err);
      loader.remove();
    }
  };

  // Prefer using the JSON already loaded by initProjects()
  document.addEventListener("projects:data-ready", (ev) => {
    const ce = /** @type {CustomEvent} */ (ev);
    inject(/** @type {any} */ (ce.detail));
  });

  // Fallback: fetch directly if the event didn't fire yet
  fetch(getDataUrl("projects-data.json"))
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => data && inject(data))
    .catch(() => loader.remove());
})();
