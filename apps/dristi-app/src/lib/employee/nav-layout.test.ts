import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  clearCourtNavLayout,
  DEFAULT_COURT_NAV_LAYOUT,
  readCourtNavLayout,
  serverCourtNavLayout,
  setCourtNavLayout,
  subscribeToCourtNavLayout,
} from "./nav-layout";

describe("the court rail layout", () => {
  afterEach(() => {
    clearCourtNavLayout();
  });

  it("stands on \"open\" with nothing chosen yet", () => {
    assert.equal(readCourtNavLayout(), "open");
    assert.equal(DEFAULT_COURT_NAV_LAYOUT, "open");
  });

  /* The server snapshot is what hydration compares against, so it must not move when
     the preference changes — otherwise the first client render disagrees with the
     HTML the same way `session.ts`'s would. */
  it("keeps the server snapshot fixed while the live one changes", () => {
    setCourtNavLayout("schedule");
    assert.equal(readCourtNavLayout(), "schedule");
    assert.equal(serverCourtNavLayout(), "open");
  });

  it("tells subscribers about a change and not about a no-op", () => {
    let changes = 0;
    const stop = subscribeToCourtNavLayout(() => {
      changes += 1;
    });
    setCourtNavLayout("actions");
    assert.equal(changes, 1);
    setCourtNavLayout("actions");
    assert.equal(changes, 1, "naming the layout already live still notified");
    stop();
    setCourtNavLayout("schedule");
    assert.equal(changes, 1, "a stopped subscriber was still called");
  });

  it("goes back to the default when cleared", () => {
    setCourtNavLayout("actions");
    clearCourtNavLayout();
    assert.equal(readCourtNavLayout(), "open");
  });
});
