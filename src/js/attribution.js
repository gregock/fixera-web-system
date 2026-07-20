(function () {
  try {
    const params = new URLSearchParams(window.location.search);

    const hasUtm =
      params.get("utm_source") ||
      params.get("utm_medium") ||
      params.get("utm_campaign");

    const attribution = {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_term: params.get("utm_term") || "",
      utm_content: params.get("utm_content") || "",
      landing_page: window.location.pathname,
      referrer: document.referrer || "",
      source: params.get("utm_source") || (document.referrer ? "referral" : "direct"),
      timestamp: new Date().toISOString(),
    };

    const existingLastTouch = sessionStorage.getItem("fixera_last_touch");
    if (hasUtm || !existingLastTouch) {
      sessionStorage.setItem("fixera_last_touch", JSON.stringify(attribution));
    }

    if (!sessionStorage.getItem("fixera_first_touch")) {
      sessionStorage.setItem("fixera_first_touch", JSON.stringify(attribution));
    }
  } catch {}
})();
