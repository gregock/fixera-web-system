// @ts-nocheck
(function (win, doc) {
  var INTERNAL_STORAGE_KEY = "fixera_internal_traffic";
  var PORTFOLIO_GA_ID = "G-PORTFOLIO000";
  var params = new URLSearchParams(win.location.search);

  if (params.get("internal") === "true") {
    try {
      win.localStorage.setItem(INTERNAL_STORAGE_KEY, "1");
    } catch (e) {}
    win.__fixeraInternalTraffic = true;
  }

  if (params.get("internal") === "false") {
    try {
      win.localStorage.removeItem(INTERNAL_STORAGE_KEY);
    } catch (e) {}
  }

  var isInternal =
    win.location.hostname === "localhost" ||
    win.location.hostname === "127.0.0.1" ||
    win.location.hostname === "::1";

  try {
    isInternal = isInternal || win.localStorage.getItem(INTERNAL_STORAGE_KEY) === "1";
  } catch (e) {}

  if (isInternal) {
    win.__fixeraInternalTraffic = true;
    if (
      win.location.hostname === "localhost" ||
      win.location.hostname === "127.0.0.1" ||
      win.location.hostname === "::1"
    ) {
      win.dataLayer = win.dataLayer || [];
      var gtagStub = function () {
        win.dataLayer.push(arguments);
      };
      win.gtag = gtagStub;
      win.fixeraWindow = win.fixeraWindow || {};
      win.fixeraWindow.gtag = gtagStub;
    }
    return;
  }

  win.dataLayer = win.dataLayer || [];
  function gtag() {
    win.dataLayer.push(arguments);
  }
  win.gtag = gtag;
  win.fixeraWindow = win.fixeraWindow || {};
  win.fixeraWindow.gtag = gtag;

  // Portfolio edition: keep the integration shape but never load external tracking.
  gtag("js", new Date());
  gtag("config", PORTFOLIO_GA_ID, {
    transport_type: "beacon",
    public_safe: true,
    send_page_view: false,
  });
})(window, document);
