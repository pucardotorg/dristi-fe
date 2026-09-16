import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COURT_HOME,
  courtTrail,
  foldsCourtRail,
  isCourtNavActive,
} from "./navigation";

const HOME = { label: "Court home", href: "/employee" };

/**
 * The contract the owner set on 2026-09-11: **every trail ends with the current page**,
 * as a step with no href, which the bar renders through the DS `BreadcrumbPage` slot.
 * Until then the page was deliberately never a step. These tests are the new convention;
 * the argument for the old one, and why it survives only at the court home, is in
 * `courtTrail`'s own comment.
 */
describe("courtTrail", () => {
  it("is empty on the court home — there is nothing above it to say", () => {
    /* The one place a page is still not a step. A lone `Court home` crumb would restate
       the heading below it and lead nowhere, which is the whole of what a trail is for. */
    assert.deepEqual(courtTrail(COURT_HOME.href), []);
  });

  it("on a queue, ends with the queue and links only the way home", () => {
    /* Three steps: the way home, the section as context, and the page. The section
       carries no href because it is a disclosure in the rail — there is no page called
       "Sign" — and the queue carries none because it is where the reader already is. */
    assert.deepEqual(courtTrail("/employee/hearings"), [
      HOME,
      { label: "Hearings" },
      { label: "Today’s hearings" },
    ]);
    assert.deepEqual(courtTrail("/employee/sign-orders"), [
      HOME,
      { label: "Sign" },
      { label: "Sign orders" },
    ]);
    assert.deepEqual(courtTrail("/employee/scrutiny"), [
      HOME,
      { label: "Actions" },
      { label: "Scrutinise submitted cases" },
    ]);
  });

  it("on a listing, ends with the case number and makes Hearings a way back", () => {
    /* The record's identifier, never its cause title: the title is this page's own `h1`,
       and a crumb repeating it would say the loudest thing on the screen in the quietest
       type. The order composer is the same view of the same listing, so it reads the
       same — the composer is not a second record. */
    const trail = [
      HOME,
      { label: "Hearings", href: "/employee/hearings" },
      { label: "Today’s hearings", href: "/employee/hearings" },
      { label: "ST/241/2026" },
    ];
    assert.deepEqual(courtTrail("/employee/hearings/h-241"), trail);
    assert.deepEqual(courtTrail("/employee/hearings/h-241/order"), trail);
  });

  it("on a complaint's file, ends with the complaint's number", () => {
    assert.deepEqual(courtTrail("/employee/register-cases/r-1840"), [
      HOME,
      { label: "Actions", href: "/employee/register-cases" },
      { label: "Register cases", href: "/employee/register-cases" },
      { label: "CMP/1840/2025" },
    ]);
  });

  it("ends at the case number whether or not the full file is open", () => {
    /* **The complaint has one view again** (brief D25, 2026-09-11 late). It had two for a
       day — the glance at `/<id>` and the whole file at `/<id>/file` — and the trail grew
       a leaf to say which one a magistrate was on. The file is now a disclosure of the
       complaint's own route with its state in the query, so there is nothing for a leaf
       to name and the trail ends at the identifier again. A query never reaches the
       trail, which is the point: the crumb says which record, not which part of it is
       unfolded. */
    const trail = [
      HOME,
      { label: "Actions", href: "/employee/register-cases" },
      { label: "Register cases", href: "/employee/register-cases" },
      { label: "CMP/1840/2025" },
    ];
    assert.deepEqual(courtTrail("/employee/register-cases/r-1840"), trail);
    assert.deepEqual(courtTrail("/employee/register-cases/r-1840/"), trail);
  });

  it("keeps the rail on Register cases while the complaint is open", () => {
    /* The row a nested route lights up is the queue the record came from. */
    assert.ok(
      isCourtNavActive(
        "/employee/register-cases/r-1840",
        "/employee/register-cases",
      ),
    );
  });

  it("does not treat an unknown complaint as nested", () => {
    assert.deepEqual(courtTrail("/employee/register-cases/r-nope"), [HOME]);
  });

  it("on a scrutiny workbench, ends with the filing number it decoded", () => {
    /* A filing number carries slashes, so the segment arrives percent-encoded and the
       crumb has to be the decoded form the queue holds — not the escape sequence. */
    assert.deepEqual(
      courtTrail(`/employee/scrutiny/${encodeURIComponent("F/AHM/2026/00341")}`),
      [
        HOME,
        { label: "Actions", href: "/employee/scrutiny" },
        { label: "Scrutinise submitted cases", href: "/employee/scrutiny" },
        { label: "F/AHM/2026/00341" },
      ],
    );
  });

  it("does not treat an unknown complaint id as nested", () => {
    /* The nested segment resolves against the queue, so a stale link matches no row
       at all and gets the way home and nothing else — rather than claiming to sit
       under a complaint that is not there, or naming a record it cannot identify. The
       screen behind it says the same thing in its own words. */
    assert.deepEqual(courtTrail("/employee/register-cases/r-nope"), [HOME]);
  });

  it("does not treat a hearings sibling as a nested listing", () => {
    /* `schedule` is a queue of its own, not a listing under today's list — so it gets a
       queue's trail, ending in its own name. */
    assert.deepEqual(courtTrail("/employee/hearings/schedule"), [
      HOME,
      { label: "Hearings" },
      { label: "Schedule hearing" },
    ]);
  });

  it("still offers the way home on a route the rail does not know", () => {
    assert.deepEqual(courtTrail("/employee/not-a-queue"), [HOME]);
  });

  it("gives every trail it can name a last step that goes nowhere", () => {
    /* The rule itself, rather than one route's spelling of it: on any route this file
       can identify, the step the reader is standing on is not a link. The two
       exceptions are stated above and are both "there is no current step to give" — the
       court home, which has no trail at all, and a route the rail does not know, where
       naming the page would mean inventing a label. */
    for (const path of [
      "/employee/hearings",
      "/employee/sign-orders",
      "/employee/register-cases",
      /* One entry, not two: the complaint's file is a query and `courtTrail` reads a
         pathname, which is why the leaf could go (brief D25). */
      "/employee/register-cases/r-1840",
      "/employee/hearings/h-241/order",
      `/employee/scrutiny/${encodeURIComponent("F/AHM/2026/00341")}`,
    ]) {
      const trail = courtTrail(path);
      assert.ok(trail.length > 1, path);
      assert.equal(trail.at(-1)?.href, undefined, path);
    }
  });
});

/**
 * Which routes arrive with the rail folded (owner, 2026-09-16). The predicate is the
 * whole of what the route decides — the reader can still open the rail on any of them —
 * so what these pin is that it answers for the composer and for nothing next to it.
 */
describe("foldsCourtRail", () => {
  it("folds on the order composer", () => {
    assert.equal(foldsCourtRail("/employee/hearings/h-241/order"), true);
    /* A trailing slash is the same route, and Next will serve it. */
    assert.equal(foldsCourtRail("/employee/hearings/h-241/order/"), true);
  });

  it("leaves the queues and the listing above it alone", () => {
    for (const path of [
      "/employee",
      "/employee/hearings",
      /* The listing's own overview is a *record*, read at full width with the rail up;
         only the composer under it is the workbench. */
      "/employee/hearings/h-241",
      "/employee/sign-orders",
      "/employee/register-cases/r-1840",
    ]) {
      assert.equal(foldsCourtRail(path), false, path);
    }
  });

  it("does not fold on a route that merely ends in the word", () => {
    /* The pattern is anchored to one listing's composer, not to any path with `order`
       at the end of it — a queue called `/employee/draft-orders` must keep its rail. */
    assert.equal(foldsCourtRail("/employee/draft-orders"), false);
    assert.equal(foldsCourtRail("/employee/hearings/h-241/order/extra"), false);
  });
});
