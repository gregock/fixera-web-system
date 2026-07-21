// @ts-nocheck
(function (win) {
  if (win.fbq) return;

  var queue = [];
  var pixelId = "PORTFOLIO_PIXEL_000000";

  var fbq = function () {
    queue.push(Array.prototype.slice.call(arguments));
  };

  fbq.push = fbq;
  fbq.loaded = false;
  fbq.version = "portfolio-stub";
  fbq.queue = queue;
  fbq.pixelId = pixelId;

  win.fbq = fbq;
  if (!win._fbq) win._fbq = fbq;

  // Portfolio edition: preserve the event API without loading Facebook Pixel.
  fbq("init", pixelId);
})(window);
