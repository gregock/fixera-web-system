import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderTags } from './tag-renderer.js';

// Minimal DOM Mock for Node environment
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this._children = [];
    this._textContent = '';
    this.attributes = {};
    // Allow direct property access for href, className as used in code
    this.href = '';
    this.className = '';
  }

  get children() {
    return this._children;
  }

  appendChild(child) {
    this._children.push(child);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = value;
    // Simulate DOM behavior: setting textContent clears children
    // (though in this mock we just clear the children array if value is empty string, simplistic but sufficient)
    if (value === '') {
      this._children = [];
    }
  }
}

class MockDocument {
  createElement(tagName) {
    return new MockElement(tagName.toUpperCase());
  }

  createDocumentFragment() {
    return new MockElement('FRAGMENT');
  }
}

// Inject mock into global scope
// @ts-ignore
global.document = new MockDocument();
// @ts-ignore
global.HTMLElement = MockElement;

describe('renderTags', () => {
  it('should render tags safely into the container (XSS prevention)', () => {
    const container = new MockElement('DIV');
    const tags = [
      { slug: 'tag1', label: 'Label 1' },
      { slug: 'tag2', label: '<script>alert("XSS")</script>' }
    ];
    const config = { ariaPrefix: 'Filter by' };

    renderTags(container, tags, config);

    assert.strictEqual(container.children.length, 1); // fragment
    const fragment = container.children[0];
    assert.strictEqual(fragment.children.length, 2);

    const firstTag = fragment.children[0];
    assert.strictEqual(firstTag.tagName, 'SPAN');
    assert.strictEqual(firstTag.textContent, 'Label 1');
    assert.strictEqual(firstTag.attributes['aria-label'], 'Filter by Label 1');

    const secondTag = fragment.children[1];
    assert.strictEqual(secondTag.tagName, 'SPAN');
    // Crucial check: label with script tags should be treated as text content
    assert.strictEqual(secondTag.textContent, '<script>alert("XSS")</script>');
    assert.strictEqual(secondTag.attributes['aria-label'], 'Filter by <script>alert("XSS")</script>');
  });

  it('should limit tags to 8', () => {
    const container = new MockElement('DIV');
    const tags = Array.from({ length: 10 }, (_, i) => ({ slug: `tag${i}`, label: `Label ${i}` }));
    const config = { ariaPrefix: 'Filter by' };

    renderTags(container, tags, config);

    const fragment = container.children[0];
    assert.strictEqual(fragment.children.length, 8);
  });

  it('should clear existing content before rendering', () => {
    const container = new MockElement('DIV');
    container.textContent = 'Old Content';
    // Manually add a child to verify it gets cleared
    container.appendChild(new MockElement('SPAN'));

    const tags = [{ slug: 'tag1', label: 'Label 1' }];
    const config = { ariaPrefix: 'Filter by' };

    renderTags(container, tags, config);

    // renderTags sets textContent = "", which in our mock clears children
    // then appends fragment.
    assert.strictEqual(container.children.length, 1);
    assert.strictEqual(container.children[0].tagName, 'FRAGMENT');
  });

  it('should handle empty tags array by clearing container', () => {
    const container = new MockElement('DIV');
    container.textContent = 'Old Content';
    const tags = [];
    const config = { ariaPrefix: 'Filter by' };

    renderTags(container, tags, config);

    assert.strictEqual(container.textContent, '');
    assert.strictEqual(container.children.length, 0);
  });
});
