import assert from "assert";
import { parseHTML } from "../src/parser.js";

describe("parse html", () => {
  it("<a></a>", function () {
    const tree = parseHTML("<a></a>");
    assert.strictEqual(tree.children[0].tagName, "a");
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a />`, function () {
    const tree = parseHTML(`<a />`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href="//time.geekbang.org"></a>`, function () {
    const tree = parseHTML(`<a href="//time.geekbang.org"></a>`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href></a>`, function () {
    const tree = parseHTML(`<a href></a>`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href id></a>`, function () {
    const tree = parseHTML(`<a href id></a>`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href="//time.geekbang.org" id ></a>`, function () {
    const tree = parseHTML(`<a href="//time.geekbang.org" id ></a>`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href="//time.geekbang.org" id />`, function () {
    const tree = parseHTML(`<a href="//time.geekbang.org" id />`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href='//time.geekbang.org'></a>`, function () {
    const tree = parseHTML(`<a href='//time.geekbang.org'></a>`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href='//time.geekbang.org' />`, function () {
    const tree = parseHTML(`<a href='//time.geekbang.org' />`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a href=abc />`, function () {
    const tree = parseHTML(`<a href=abc />`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 0);
  });

  it(`<a>text</a>`, function () {
    const tree = parseHTML(`<a>text</a>`);
    assert.strictEqual(tree.children.length, 1);
    assert.strictEqual(tree.children[0].children.length, 1);
  });

  it(`with style node`, function () {
    const tree = parseHTML(`<style>a { font-size: 20px; }</style><a>text</a>`);
    assert.strictEqual(tree.children.length, 2);
    assert.strictEqual(tree.children[1].children.length, 1);
  });

  it(`with style node, both tag and id selector`, function () {
    const tree = parseHTML(`<style>a { font-size: 20px; } a,#node1 { font-size: 10px; } </style><a id="node1">text</a>`);
    assert.strictEqual(tree.children.length, 2);
    assert.strictEqual(tree.children[1].children.length, 1);
  });
});
