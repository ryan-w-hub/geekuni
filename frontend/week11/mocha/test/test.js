import assert from "assert";
import { add } from "../add.js";

describe("add function testing", () => {
  it("1+2 should be 3", () => {
    assert.strictEqual(add(1, 2), 3);
  });

  it("-5+2 should be -3", () => {
    assert.strictEqual(add(-5, 2), -3);
  });
});
