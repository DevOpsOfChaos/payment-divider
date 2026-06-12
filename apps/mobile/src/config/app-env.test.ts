import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getAppEnv, getDevSessionBlockedHint, isDevSessionAllowed } from "./app-env";

const ORIGINAL = process.env.EXPO_PUBLIC_APP_ENV;

function setAppEnv(value: string | undefined) {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_APP_ENV;
  } else {
    process.env.EXPO_PUBLIC_APP_ENV = value;
  }
}

afterEach(() => {
  setAppEnv(ORIGINAL);
});

describe("getAppEnv", () => {
  it("defaults to local when the variable is unset", () => {
    setAppEnv(undefined);
    assert.equal(getAppEnv(), "local");
  });

  it("defaults to local when the variable is empty or whitespace", () => {
    setAppEnv("   ");
    assert.equal(getAppEnv(), "local");
  });

  it("returns local for the exact string", () => {
    setAppEnv("local");
    assert.equal(getAppEnv(), "local");
  });

  it("returns shared-alpha for the exact string", () => {
    setAppEnv("shared-alpha");
    assert.equal(getAppEnv(), "shared-alpha");
  });

  it("returns production for the exact string", () => {
    setAppEnv("production");
    assert.equal(getAppEnv(), "production");
  });

  it("treats unknown values as production (fail-closed)", () => {
    for (const value of ["dev", "Local", "LOCAL", "alpha", "staging", "shared_alpha"]) {
      setAppEnv(value);
      assert.equal(getAppEnv(), "production", `value: ${value}`);
    }
  });
});

describe("isDevSessionAllowed", () => {
  it("allows the dev session only in local", () => {
    setAppEnv(undefined);
    assert.equal(isDevSessionAllowed(), true);
    setAppEnv("local");
    assert.equal(isDevSessionAllowed(), true);
  });

  it("blocks the dev session in every shared environment", () => {
    for (const value of ["shared-alpha", "production", "anything-else"]) {
      setAppEnv(value);
      assert.equal(isDevSessionAllowed(), false, `value: ${value}`);
    }
  });
});

describe("getDevSessionBlockedHint", () => {
  it("names the active environment", () => {
    setAppEnv("shared-alpha");
    assert.match(getDevSessionBlockedHint(), /shared-alpha/);
  });
});
