/**
 * Enhances image performance by setting decoding and loading attributes.
 */
export function initImageHygiene() {
  const imgs = Array.from(document.images || []);
  for (const img of imgs) {
    const critical =
      img.hasAttribute("data-hero") ||
      img.getAttribute("fetchpriority") === "high" ||
      (typeof img.closest === "function" && img.closest('header[role="banner"]'));
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    if (!critical && !img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
  }
}
