import { test } from "node:test";
import assert from "node:assert/strict";
import { docText, forOnePage, sectionId } from "../.vitepress/print.ts";

test("a page's section id: its address, with dashes", () => {
  assert.equal(sectionId("02-codec/03-writer-and-reader"), "p-02-codec-03-writer-and-reader");
  assert.equal(sectionId("02-codec/"), "p-02-codec");
  assert.equal(sectionId(""), "p-start");
});

test("a built page's text is what's inside its vp-doc", () => {
  const html = '<main class="main" data-v-1><div style="position:relative;" class="vp-doc _x" data-v-1>'
    + "<div><h1 id=\"x\">X</h1><p>text</p></div></div></main><footer>not this</footer>";
  assert.equal(docText(html), '<h1 id="x">X</h1><p>text</p>');
  assert.throws(() => docText("<p>no doc</p>"));
});

test("on the one page, ids get the page's prefix and links to its pages stay on it", () => {
  const pages = new Set(["02-codec/03-writer-and-reader", "02-codec/04-codecs", "02-codec/", ""]);
  const page = "02-codec/03-writer-and-reader";
  const text = [
    '<h2 id="the-test">The test <a href="#the-test">#</a></h2>',
    '<a href="./04-codecs">2.4</a>',
    '<a href="/the-gray-tutor/02-codec/04-codecs#the-code">its code</a>',
    '<a href="/the-gray-tutor/02-codec/">Part 2</a>',
    '<a href="https://github.com/abutlabs/the-gray-tutor">the repo</a>',
    '<a href="/the-gray-tutor/glossary">a page not on it</a>',
  ].join("");
  assert.equal(forOnePage(text, page, pages, "/the-gray-tutor/"), [
    '<h2 id="p-02-codec-03-writer-and-reader--the-test">The test ',
    '<a href="#p-02-codec-03-writer-and-reader--the-test">#</a></h2>',
    '<a href="#p-02-codec-04-codecs">2.4</a>',
    '<a href="#p-02-codec-04-codecs--the-code">its code</a>',
    '<a href="#p-02-codec">Part 2</a>',
    '<a href="https://github.com/abutlabs/the-gray-tutor">the repo</a>',
    '<a href="/the-gray-tutor/glossary">a page not on it</a>',
  ].join(""));
});

test("the whole-file folds stay on the website", () => {
  const fold = '<details class="whole-file" v-pre><summary>The whole file</summary><pre>…</pre></details>\n';
  assert.equal(forOnePage(`<p>a</p>${fold}<p>b</p>`, "", new Set([""]), "/"), "<p>a</p><p>b</p>");
});
