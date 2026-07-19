// @ts-nocheck
(function (win, doc) {
  var INTERNAL_STORAGE_KEY = "northstar_internal_traffic";
  var params = new URLSearchParams(win.location.search);

  if (params.get("internal") === "true") {
    try {
      win.localStorage.setItem(INTERNAL_STORAGE_KEY, "1");
    } catch (e) {}
    win.__northstarInternalTraffic = true;
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
    win.__northstarInternalTraffic = true;
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
      win.northstarWindow = win.northstarWindow || {};
      win.northstarWindow.gtag = gtagStub;
    }
    return;
  }

  var GA_ID = "G-RP3M5GM5F2";

  // 1. load GA script first
  var s = doc.createElement("script");
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
  s.async = true;
  doc.head.appendChild(s);

  // 2. initialize dataLayer and gtag
  win.dataLayer = win.dataLayer || [];
  function gtag() {
    win.dataLayer.push(arguments);
  }
  win.gtag = gtag;

  // 3. configure GA AFTER script load
  s.onload = function () {
    gtag("js", new Date());
    gtag("config", GA_ID, { transport_type: "beacon" });
  };
})(window, document);
