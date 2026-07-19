import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { initImageHygiene } from "./image-hygiene.js";

// Minimal DOM Mock for Node environment
class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this._parent = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  closest(selector) {
    if (selector === 'header[role="banner"]') {
      let curr = this._parent;
      while (curr) {
        if (curr.tagName === "HEADER" && curr.getAttribute("role") === "banner") {
          return curr;
        }
        curr = curr._parent;
      }
    }
    return null;
  }
}

class MockDocument {
  constructor() {
    this.images = [];
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  // Helper to setup mock state
  setImages(imgs) {
    this.images = imgs;
  }
}

// Inject mock into global scope
const mockDoc = new MockDocument();
// @ts-ignore
global.document = mockDoc;
// @ts-ignore
global.Node = class {};
// @ts-ignore
global.Element = MockElement;

describe("initImageHygiene", () => {
  beforeEach(() => {
    mockDoc.setImages([]);
  });

  it("should set decoding=async and loading=lazy for a normal image", () => {
    const img = new MockElement("IMG");
    mockDoc.setImages([img]);

    initImageHygiene();

    assert.strictEqual(img.getAttribute("decoding"), "async");
    assert.strictEqual(img.getAttribute("loading"), "lazy");
  });

  it("should NOT set loading=lazy for critical images (data-hero)", () => {
    const img = new MockElement("IMG");
    img.setAttribute("data-hero", "");
    mockDoc.setImages([img]);

    initImageHygiene();

    assert.strictEqual(img.getAttribute("decoding"), "async");
    assert.strictEqual(img.hasAttribute("loading"), false);
  });

  it("should NOT set loading=lazy for critical images (fetchpriority=high)", () => {
    const img = new MockElement("IMG");
    img.setAttribute("fetchpriority", "high");
    mockDoc.setImages([img]);

    initImageHygiene();

    assert.strictEqual(img.getAttribute("decoding"), "async");
    assert.strictEqual(img.hasAttribute("loading"), false);
  });

  it("should NOT set loading=lazy for images inside header[role=banner]", () => {
    const header = new MockElement("HEADER");
    header.setAttribute("role", "banner");

    const img = new MockElement("IMG");
    img._parent = header;
    mockDoc.setImages([img]);

    initImageHygiene();

    assert.strictEqual(img.getAttribute("decoding"), "async");
    assert.strictEqual(img.hasAttribute("loading"), false);
  });

  it("should NOT overwrite existing decoding or loading attributes", () => {
    const img = new MockElement("IMG");
    img.setAttribute("decoding", "sync");
    img.setAttribute("loading", "eager");
    mockDoc.setImages([img]);

    initImageHygiene();

    assert.strictEqual(img.getAttribute("decoding"), "sync");
    assert.strictEqual(img.getAttribute("loading"), "eager");
  });

  it("should handle empty document.images gracefully", () => {
    // @ts-ignore
    const oldImages = document.images;
    // @ts-ignore
    document.images = null;

    assert.doesNotThrow(() => initImageHygiene());

    // @ts-ignore
    document.images = oldImages;
  });
});
