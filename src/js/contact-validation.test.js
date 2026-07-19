import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateContactForm } from './contact-validation.js';

describe('validateContactForm', () => {
  it('should pass with valid data', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.nameOk, true);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.msgOk, true);
    assert.strictEqual(result.consentOk, true);
  });

  it('should fail if name is too short', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'J',
      email: 'john@example.com',
      phone: '',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.nameOk, false);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.msgOk, true);
    assert.strictEqual(result.consentOk, true);
  });

  it('should fail if email is invalid', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: 'john',
      phone: '',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.nameOk, true);
    assert.strictEqual(result.emailOk, false);
    assert.strictEqual(result.msgOk, true);
    assert.strictEqual(result.consentOk, true);
  });

  it('should fail if message is too short', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      address: 'Copenhagen',
      message: 'Hi',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.nameOk, true);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.msgOk, false);
    assert.strictEqual(result.consentOk, true);
  });

  it('should fail if consent is false', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: false,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.nameOk, true);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.msgOk, true);
    assert.strictEqual(result.consentOk, false);
  });

  it('should handle missing fields gracefully', () => {
    // @ts-ignore
    const result = validateContactForm({});
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.nameOk, false);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.contactOk, false);
    assert.strictEqual(result.msgOk, false);
    assert.strictEqual(result.consentOk, false);
  });

  it('should pass when a phone number is provided instead of email', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: '',
      phone: '+45 12 34 56 78',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.nameOk, true);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.contactOk, true);
    assert.strictEqual(result.msgOk, true);
    assert.strictEqual(result.consentOk, true);
  });

  it('should fail if neither email nor phone is provided', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: '',
      phone: '',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.nameOk, true);
    assert.strictEqual(result.emailOk, true);
    assert.strictEqual(result.contactOk, false);
    assert.strictEqual(result.msgOk, true);
    assert.strictEqual(result.consentOk, true);
  });

  it('should fail if an invalid email is provided with a phone number', () => {
    const data = {
      requestType: 'handyman-job',
      name: 'John Doe',
      email: 'john',
      phone: '+45 12 34 56 78',
      address: 'Copenhagen',
      message: 'Hello World',
      consent: true,
    };
    const result = validateContactForm(data);
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.emailOk, false);
    assert.strictEqual(result.contactOk, true);
  });

  it('should require a request type and address', () => {
    const result = validateContactForm({
      requestType: '',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      address: '',
      message: 'Hello World',
      consent: true,
    });
    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.requestTypeOk, false);
    assert.strictEqual(result.addressOk, false);
  });
});
