// @ts-check

/**
 * Validates the contact form data.
 * @param {{
 *   requestType: string;
 *   name: string;
 *   email: string;
 *   phone: string;
 *   address: string;
 *   message: string;
 *   consent: boolean;
 * }} data
 * @returns {{
 *   requestTypeOk: boolean;
 *   nameOk: boolean;
 *   emailOk: boolean;
 *   contactOk: boolean;
 *   addressOk: boolean;
 *   msgOk: boolean;
 *   consentOk: boolean;
 *   isValid: boolean;
 * }}
 */
export function validateContactForm({ requestType, name, email, phone, address, message, consent }) {
  const requestTypeOk = (requestType || "").trim().length > 0;
  const nameOk = (name || "").trim().length >= 2;
  const emailValue = (email || "").trim();
  const phoneValue = (phone || "").trim();
  const hasEmail = emailValue.length > 0;
  const hasPhone = phoneValue.length > 0;
  const validEmail = /\S+@\S+\.\S+/.test(emailValue);
  const emailOk = !hasEmail || validEmail;
  const contactOk = (hasEmail && validEmail) || hasPhone;
  const addressOk = (address || "").trim().length >= 2;
  const msgOk = (message || "").trim().length >= 5;
  const consentOk = !!consent;

  return {
    requestTypeOk,
    nameOk,
    emailOk,
    contactOk,
    addressOk,
    msgOk,
    consentOk,
    isValid: requestTypeOk && nameOk && emailOk && contactOk && addressOk && msgOk && consentOk,
  };
}
