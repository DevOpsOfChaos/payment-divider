import assert from "node:assert/strict";
import test from "node:test";

import * as core from "./index";

test("core package exports domain types", () => {
  assert.equal(typeof core, "object");
  assert.deepEqual(Object.keys(core), []);
});
