import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COURT_CASES_PAGE,
  COURT_DASHBOARD,
  COURT_NAV_GROUPS,
  COURT_NAV_LINKS,
  courtTrail,
  courtWaitingQueues,
  isCourtNavActive,
} from "./navigation";

/**
 * Two contracts, set a day apart.
 *
 * 2026-09-11: **every trail ends with the current page**, as a step with no href, which
 * the bar renders through the DS `BreadcrumbPage` slot. Until then the page was
 * deliberately never a step.
 *
 * 2026-09-14: **no trail has a root**. `Court home` was a placeholder screen nothing
 * linked to; the rail is what gets you anywhere, so the trail says where you are and
 * lets you climb one step, and nothing more. The argument is in `courtTrail`'s own
 * comment.
 */
describe("courtTrail", () => {
  it("is empty on the dashboard — nothing nests under it", () => {
    assert.deepEqual(courtTrail(COURT_DASHBOARD.href), []);
  });

  it("on a queue, is the section and the queue — no root", () => {
    /* Two steps: the section as context, and the page. The section carries no href
       because it is a disclosure in the rail — there is no page called "Sign" — and the
       queue carries none because it is where the reader already is. */
    assert.deepEqual(courtTrail("/employee/hearings"), [
      { label: "Hearings" },
      { label: "Today’s hearings" },
    ]);
    assert.deepEqual(courtTrail("/employee/sign-orders"), [
      { label: "Sign" },
      { label: "Sign orders" },
    ]);
    assert.deepEqual(courtTrail("/employee/scrutiny"), [
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
      { label: "Hearings", href: "/employee/hearings" },
      { label: "Today’s hearings", href: "/employee/hearings" },
      { label: "ST/241/2026" },
    ];
    assert.deepEqual(courtTrail("/employee/hearings/h-241"), trail);
    assert.deepEqual(courtTrail("/employee/hearings/h-241/order"), trail);
  });

  it("on a complaint's file, ends with the complaint's number", () => {
    assert.deepEqual(courtTrail("/employee/register-cases/r-1840"), [
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
    assert.deepEqual(courtTrail("/employee/register-cases/r-nope"), []);
  });

  it("on a scrutiny workbench, ends with the filing number it decoded", () => {
    /* A filing number carries slashes, so the segment arrives percent-encoded and the
       crumb has to be the decoded form the queue holds — not the escape sequence. */
    assert.deepEqual(
      courtTrail(`/employee/scrutiny/${encodeURIComponent("F/AHM/2026/00341")}`),
      [
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
    assert.deepEqual(courtTrail("/employee/register-cases/r-nope"), []);
  });

  it("does not treat a hearings sibling as a nested listing", () => {
    /* `schedule` is a queue of its own, not a listing under today's list — so it gets a
       queue's trail, ending in its own name. */
    assert.deepEqual(courtTrail("/employee/hearings/schedule"), [
      { label: "Hearings" },
      { label: "Schedule hearing" },
    ]);
  });

  it("still offers the way home on a route the rail does not know", () => {
    assert.deepEqual(courtTrail("/employee/not-a-queue"), []);
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

describe("the court's standalone rows", () => {
  /* Both were dead external rows transcribed from the reference. Both are built now, and
     they stay two rows: a health check and a register are two questions. */
  it("are the dashboard and the register, both internal and both built", () => {
    assert.deepEqual(
      COURT_NAV_LINKS.map((row) => row.href),
      [COURT_DASHBOARD.href, COURT_CASES_PAGE.href],
    );
    for (const row of COURT_NAV_LINKS) {
      assert.ok(row.href, `${row.id} still goes nowhere`);
      assert.equal(row.external, undefined, `${row.id} still leaves the app`);
      /* The rail paints its counts in destructive red, and neither of these numbers is
         a backlog. */
      assert.equal(row.count, undefined, `${row.id} carries a count`);
    }
  });

  it("carry no trail, because nothing nests under them", () => {
    assert.deepEqual(courtTrail(COURT_DASHBOARD.href), []);
    assert.deepEqual(courtTrail(COURT_CASES_PAGE.href), []);
  });
});

describe("courtWaitingQueues", () => {
  it("offers only queues that are built and have work in them", () => {
    const queues = courtWaitingQueues();
    assert.ok(queues.length > 0);
    for (const queue of queues) {
      assert.ok(queue.href, `${queue.id} has no destination`);
      assert.ok(queue.count > 0, `${queue.id} is empty and still listed`);
      assert.ok(queue.group, `${queue.id} does not say which work it is`);
    }
  });

  /* The panel reads the rail's own data so the two cannot disagree about a queue. */
  it("takes its label and count from the rail's own row", () => {
    for (const queue of courtWaitingQueues()) {
      const row = COURT_NAV_GROUPS.flatMap((group) => group.items).find(
        (item) => item.id === queue.id,
      );
      assert.ok(row);
      assert.equal(queue.label, row.label);
      assert.equal(queue.count, row.count);
    }
  });
});
