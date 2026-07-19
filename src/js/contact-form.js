// @ts-check
import { validateContactForm } from "./contact-validation.js";
import { getLeadContext } from "./lead-tracking.js";

/**
 * @typedef {Window & typeof globalThis & {
 *   sendGA4?: (name: string, params?: Record<string, any>) => void;
 *   sendPixel?: (name: string, params?: Record<string, any>) => void;
 * }} ServiceSiteWindow
 */
const northstarWindow = /** @type {ServiceSiteWindow} */ (window);
const LEAD_API_URL = "https://example-crm.invalid/api/leads";

function getSessionTestFlag() {
  try {
    return sessionStorage.getItem("northstar_test") === "true";
  } catch {
    return false;
  }
}

function persistTestTrafficFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get("northstar_test") || "").trim().toLowerCase();

    if (value === "1" || value === "true" || value === "yes") {
      sessionStorage.setItem("northstar_test", "true");
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

// ===== Contact form + a11y =====
export function initContact() {
  const form = /** @type {HTMLFormElement | null} */ (document.getElementById("contact-form"));
  if (!form) return;

  const status = /** @type {HTMLElement | null} */ (
    document.getElementById("form-feedback") || document.getElementById("form-status")
  );
  const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById("submit-btn"));
  const spinner = /** @type {HTMLElement | null} */ (document.getElementById("submit-spinner"));
  let sent = false;
  let formStarted = false;
  let formViewed = false;
  const isDanish = document.documentElement.lang === "da";
  const messages = isDanish
    ? {
        invalid: "Ret venligst de markerede felter.",
        successTitle: "Besked modtaget",
        successBody: "Jeg har modtaget din besked og vender tilbage hurtigst muligt, normalt inden for få timer.",
        successNote: "Hvis det haster, er WhatsApp den hurtigste måde at få fat i mig på.",
        failure: "Noget gik galt. Prøv igen eller skriv til hello@northstar-services.example.",
        network: "Netværksfejl. Prøv igen om et øjeblik.",
        sent: "Sendt",
      }
    : {
        invalid: "Please fix the highlighted fields.",
        successTitle: "Request received",
        successBody: "I’ve got your message and will reply shortly, usually within a few hours.",
        successNote: "If it’s urgent, WhatsApp is the fastest way to reach me.",
        failure: "Something went wrong. Please try again or email hello@northstar-services.example.",
        network: "Network error. Please try again in a moment.",
        sent: "Sent",
      };

  /**
   * @typedef {"request_type" | "name" | "email" | "phone" | "address_or_area" | "message" | "consent" | "contact" | "hp"} FieldKey
   */
  const fields = /** @type {{
    request_type: HTMLSelectElement | null;
    name: HTMLInputElement | null;
    email: HTMLInputElement | null;
    phone: HTMLInputElement | null;
    address_or_area: HTMLInputElement | null;
    business_type: HTMLSelectElement | null;
    units_managed: HTMLInputElement | null;
    main_pain: HTMLSelectElement | null;
    frequency: HTMLSelectElement | null;
    message: HTMLTextAreaElement | null;
    consent: HTMLInputElement | null;
    contact: null;
    hp: HTMLInputElement | null;
  }} */ ({
    request_type: /** @type {HTMLSelectElement | null} */ (document.getElementById("request-type")),
    name: /** @type {HTMLInputElement | null} */ (document.getElementById("name")),
    email: /** @type {HTMLInputElement | null} */ (document.getElementById("email")),
    phone: /** @type {HTMLInputElement | null} */ (document.getElementById("phone")),
    address_or_area: /** @type {HTMLInputElement | null} */ (document.getElementById("address-or-area")),
    business_type: /** @type {HTMLSelectElement | null} */ (document.getElementById("business-type")),
    units_managed: /** @type {HTMLInputElement | null} */ (document.getElementById("units-managed")),
    main_pain: /** @type {HTMLSelectElement | null} */ (document.getElementById("main-pain")),
    frequency: /** @type {HTMLSelectElement | null} */ (document.getElementById("frequency")),
    message: /** @type {HTMLTextAreaElement | null} */ (document.getElementById("message")),
    consent: /** @type {HTMLInputElement | null} */ (document.getElementById("consent")),
    contact: null,
    hp: /** @type {HTMLInputElement | null} */ (document.getElementById("_gotcha")),
  });

  const getB2BContext = () => ({
    business_type: fields.business_type?.value || "",
    units_managed: fields.units_managed?.value || "",
    main_pain: fields.main_pain?.value || "",
    frequency: fields.frequency?.value || "",
  });

  const trackFormView = () => {
    if (formViewed) return;
    formViewed = true;
    try {
      if (typeof northstarWindow.sendGA4 === "function") {
        northstarWindow.sendGA4("contact_form_view", {
          form_id: form.id || "contact-form",
          cta_position: "contact_form",
          form_source: "contact_page",
          ...getB2BContext(),
        });
      }
    } catch (_) {}
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          trackFormView();
          observer.disconnect();
          break;
        }
      }
    });
    observer.observe(form);
  } else {
    const checkView = () => {
      if (formViewed) return;
      const rect = form.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        trackFormView();
        window.removeEventListener("scroll", checkView);
        window.removeEventListener("resize", checkView);
      }
    };
    window.addEventListener("scroll", checkView, { passive: true });
    window.addEventListener("resize", checkView);
    checkView();
  }

  /**
   * @param {FieldKey} key
   * @param {boolean} show
   */
  const showError = (key, show) => {
    const p = form.querySelector(`[data-error="${key}"]`);
    const iconErr = form.querySelector(`[data-icon-error="${key}"]`);
    const iconOk = form.querySelector(`[data-icon-valid="${key}"]`);
    p && p.classList.toggle("hidden", !show);
    iconErr && iconErr.classList.toggle("hidden", !show);
    iconOk && iconOk.classList.toggle("hidden", show);
    const inputEl = fields[key];
    if (inputEl && "setAttribute" in inputEl) {
      if (show) inputEl.setAttribute("aria-invalid", "true");
      else inputEl.setAttribute("aria-invalid", "false");
    }
  };

  /**
   * @returns {{
   *   requestTypeOk: boolean;
   *   nameOk: boolean;
   *   emailOk: boolean;
   *   contactOk: boolean;
   *   addressOk: boolean;
   *   msgOk: boolean;
   *   consentOk: boolean;
   * }}
   */
  const computeValidity = () => {
    const emailValue = fields.email?.value || "";
    const phoneValue = fields.phone?.value || "";
    return validateContactForm({
      name: fields.name?.value || "",
      email: emailValue,
      phone: phoneValue,
      requestType: fields.request_type?.value || "",
      address: fields.address_or_area?.value || "",
      message: fields.message?.value || "",
      consent: !!fields.consent?.checked,
    });
  };

  const focusFirstInvalid = () => {
    const v = computeValidity();
    if (!v.requestTypeOk && fields.request_type) {
      fields.request_type.focus();
      return;
    }
    if (!v.nameOk && fields.name) {
      fields.name.focus();
      return;
    }
    if (!v.emailOk && fields.email) {
      fields.email.focus();
      return;
    }
    if (!v.contactOk) {
      if (fields.phone) {
        fields.phone.focus();
        return;
      }
      if (fields.email) {
        fields.email.focus();
        return;
      }
    }
    if (!v.addressOk && fields.address_or_area) {
      fields.address_or_area.focus();
      return;
    }
    if (!v.msgOk && fields.message) {
      fields.message.focus();
      return;
    }
    if (!v.consentOk && fields.consent) {
      fields.consent.focus();
      return;
    }
  };

  /** @returns {boolean} */
  const validate = () => {
    let ok = true;
    const v = computeValidity();

    showError("request_type", !v.requestTypeOk);
    ok = ok && v.requestTypeOk;
    showError("name", !v.nameOk);
    ok = ok && v.nameOk;
    showError("email", !v.emailOk);
    ok = ok && v.emailOk;
    showError("contact", !v.contactOk);
    ok = ok && v.contactOk;
    showError("address_or_area", !v.addressOk);
    ok = ok && v.addressOk;
    showError("message", !v.msgOk);
    ok = ok && v.msgOk;
    showError("consent", !v.consentOk);
    ok = ok && v.consentOk;

    return ok;
  };

  /** @param {boolean} busy */
  const setBusy = (busy) => {
    form.setAttribute("aria-busy", busy ? "true" : "false");
    if (btn) {
      btn.disabled = busy;
      btn.setAttribute("aria-disabled", busy ? "true" : "false");
    }
    if (spinner) spinner.classList.toggle("hidden", !busy);
  };

  /**
   * @param {string} msg
   * @param {boolean} ok
   */
  const setStatus = (msg, ok) => {
    if (!status) return;
    if (ok) {
      status.innerHTML = `
        <div class="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-left shadow-sm opacity-0 translate-y-1 transition-all duration-300 ease-out">
          <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700">
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">${msg.title}</p>
            <p class="mt-1 text-sm leading-relaxed text-slate-700">${msg.body}</p>
            <p class="mt-2 text-xs leading-relaxed text-slate-500">${msg.note}</p>
          </div>
        </div>
      `;
      const card = status.firstElementChild;
      requestAnimationFrame(() => {
        card?.classList.remove("opacity-0", "translate-y-1");
        card?.classList.add("opacity-100", "translate-y-0");
      });
    } else {
      status.textContent = msg;
    }
    status.classList.remove("hidden");
    status.className = "text-sm mt-4 font-medium " + (ok ? "text-green-700" : "text-red-700");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    status.setAttribute("tabindex", "-1");
    if (typeof status.focus === "function") status.focus();
  };

  // Live validation on input/blur
  /** @type {FieldKey[]} */
  const inputKeys = ["name", "email", "phone", "address_or_area", "message"];
  inputKeys.forEach((k) => {
    const el = fields[k];
    if (!el) return;
    el.addEventListener("input", () => {
      if (formStarted) return;
      formStarted = true;
      try {
      if (typeof northstarWindow.sendGA4 === "function") {
        northstarWindow.sendGA4("contact_form_start", {
          form_id: form.id || "contact-form",
          cta_position: "contact_form",
          form_source: "contact_page",
          ...getB2BContext(),
        });
      }
      } catch (_) {}
    });
    el.addEventListener("input", validate);
    el.addEventListener("blur", validate);
  });
  fields.request_type?.addEventListener("change", validate);
  fields.consent?.addEventListener("change", validate);

  form.addEventListener("submit", async (/** @type {SubmitEvent} */ e) => {
    e.preventDefault();
    if (fields.hp && fields.hp.value) return; // honeypot

    status && (status.textContent = "");
    const ok = validate();
    try {
      if (typeof northstarWindow.sendGA4 === "function") {
        northstarWindow.sendGA4("contact_form_submit_attempt", {
          form_id: form.id || "contact-form",
          cta_position: "contact_form",
          form_source: "contact_page",
          validation_status: ok ? "valid" : "invalid",
          ...getB2BContext(),
        });
      }
    } catch (_) {}
    if (!ok) {
      const validity = computeValidity();
      const invalidFields = [
        ["request_type", validity.requestTypeOk],
        ["name", validity.nameOk],
        ["email", validity.emailOk],
        ["contact", validity.contactOk],
        ["address_or_area", validity.addressOk],
        ["message", validity.msgOk],
        ["consent", validity.consentOk],
      ];
      invalidFields.forEach(([fieldName, fieldOk]) => {
        if (fieldOk) return;
        try {
          if (typeof northstarWindow.sendGA4 === "function") {
            northstarWindow.sendGA4("contact_form_field_error", {
              form_id: form.id || "contact-form",
              cta_position: "contact_form",
              form_source: "contact_page",
              field_name: fieldName,
            });
          }
        } catch (_) {}
      });
      setStatus(messages.invalid, false);
      focusFirstInvalid();
      return;
    }

    const data = {
      type: "form_submit",
      ...getLeadContext(),
      ...getB2BContext(),
      ...(isTestTraffic() ? { is_test: true } : {}),
    };

    navigator.sendBeacon(LEAD_API_URL, JSON.stringify(data));

    const formEl = /** @type {HTMLFormElement} */ (form);
    try {
      setBusy(true);
      const fd = new FormData(formEl);
      const res = await fetch(formEl.action, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        formEl.reset();
        ["request_type", "name", "email", "phone", "contact", "address_or_area", "message", "consent"].forEach((k) =>
          showError(/** @type {FieldKey} */ (k), false)
        );
        setStatus(
          {
            title: messages.successTitle,
            body: messages.successBody,
            note: messages.successNote,
          },
          true
        );
        try {
          if (typeof northstarWindow.sendGA4 === "function")
            northstarWindow.sendGA4(
              "contact_form_submit",
              {
                form_id: form.id || "contact-form",
                cta_position: "contact_form",
                form_source: "contact_page",
                ...getB2BContext(),
              }
            );
        } catch (_) {}
        try {
          if (typeof northstarWindow.sendGA4 === "function")
            northstarWindow.sendGA4("contact_form_submit_success", {
              form_id: form.id || "contact-form",
              cta_position: "contact_form",
              form_source: "contact_page",
              ...getB2BContext(),
            });
        } catch (_) {}
        try {
          if (typeof northstarWindow.sendPixel === "function") {
            northstarWindow.sendPixel("Lead", { method: "Form" });
          }
        } catch (_) {}
        // Deshabilitar botón tras envío exitoso
        sent = true;
        if (btn) {
          btn.disabled = true;
          btn.setAttribute("aria-disabled", "true");
          btn.textContent = messages.sent;
          // Asegurar una apariencia de confirmación más clara aunque falte regla CSS
          btn.classList.remove("btn-primary");
          btn.classList.add(
            "bg-emerald-600",
            "text-white",
            "cursor-default",
            "hover:bg-emerald-600",
            "shadow-sm"
          );
        }
        if (spinner) spinner.classList.add("hidden");
      } else {
        setStatus(messages.failure, false);
        try {
          if (typeof northstarWindow.sendGA4 === "function")
            northstarWindow.sendGA4("contact_form_submit_failure", {
              form_id: form.id || "contact-form",
              cta_position: "contact_form",
              form_source: "contact_page",
              ...getB2BContext(),
            });
        } catch (_) {}
      }
    } catch (err) {
      console.error("[Contact] submit error", err);
      setStatus(messages.network, false);
      try {
        if (typeof northstarWindow.sendGA4 === "function")
          northstarWindow.sendGA4("contact_form_submit_failure", {
            form_id: form.id || "contact-form",
            cta_position: "contact_form",
            form_source: "contact_page",
            ...getB2BContext(),
          });
      } catch (_) {}
    } finally {
      if (!sent) {
        setBusy(false);
      } else {
        // Mantener aria-busy en false pero sin re-habilitar el botón
        formEl.setAttribute("aria-busy", "false");
        if (spinner) spinner.classList.add("hidden");
      }
    }
  });
}
