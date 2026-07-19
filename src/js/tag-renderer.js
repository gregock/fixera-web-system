// @ts-check

/**
 * Renders a list of tags into a container element safely, preventing XSS.
 * Replaces unsafe innerHTML usage with DOM methods while keeping tags non-crawlable.
 *
 * @param {HTMLElement} container - The container to render tags into.
 * @param {Array<{ slug: string; label: string }>} tags - List of tags to render.
 * @param {{ ariaPrefix: string }} config - Configuration for accessibility.
 */
export function renderTags(container, tags, config) {
  // Clear existing content safely
  container.textContent = "";

  if (!tags || !tags.length) return;

  const { ariaPrefix } = config;
  const fragment = document.createDocumentFragment();

  // Limit to 8 tags as per original logic
  const visibleTags = tags.slice(0, 8);

  for (const tag of visibleTags) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.setAttribute("aria-label", `${ariaPrefix} ${tag.label}`);
    chip.textContent = tag.label;
    fragment.appendChild(chip);
  }

  container.appendChild(fragment);
}
