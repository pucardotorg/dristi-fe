import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  clearCognizanceLayout,
  DEFAULT_COGNIZANCE_LAYOUT,
  readCognizanceLayout,
  serverCognizanceLayout,
  setCognizanceLayout,
  subscribeToCognizanceLayout,
} from "./cognizance-layout";

describe("the take cognizance layout setting", () => {
  afterEach(() => {
    clearCognizanceLayout();
  });

  it("stands on \"tabs\" with nothing chosen yet — today's built behaviour", () => {
    assert.equal(readCognizanceLayout(), "tabs");
    assert.equal(DEFAULT_COGNIZANCE_LAYOUT, "tabs");
  });

  /* The server snapshot is what hydration compares against, so it must not move when
     the preference changes — otherwise the first client render disagrees with the
     HTML the same way `nav-layout.ts`'s would. */
  it("keeps the server snapshot fixed while the live one changes", () => {
    setCognizanceLayout("split");
    assert.equal(readCognizanceLayout(), "split");
    assert.equal(serverCognizanceLayout(), "tabs");
  });

  it("tells subscribers about a change and not about a no-op", () => {
    let changes = 0;
    const stop = subscribeToCognizanceLayout(() => {
      changes += 1;
    });
    setCognizanceLayout("split");
    assert.equal(changes, 1);
    setCognizanceLayout("split");
    assert.equal(changes, 1, "naming the layout already live still notified");
    stop();
    setCognizanceLayout("tabs");
    assert.equal(changes, 1, "a stopped subscriber was still called");
  });

  it("goes back to the default when cleared", () => {
    setCognizanceLayout("split");
    clearCognizanceLayout();
    assert.equal(readCognizanceLayout(), "tabs");
  });
});
