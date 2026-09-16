import assert from "node:assert/strict";
import test from "node:test";
import { groupCauseList, searchCauseList } from "./cause-list-groups";
import type { CauseListRow } from "./home";

const row = (
  id: string,
  item: number,
  courtLabel: string,
  court: string,
  hearingType = "Evidence",
): CauseListRow => ({
  id, item, court, courtNumber: "1", courtLabel, hearingType,
  parties: `${id} v. Company`, caseNumber: `CNR-${id}`, advocates: "Anjali Nair",
  status: "upcoming", approxTime: true, passedOver: false, mine: id === "a",
});
// a & c are the same court by name (two JMFC courtrooms); b is a different court.
const rows = [
  row("a", 10, "JMFC Court", "JMFC Court 1, Kollam"),
  row("b", 2, "CJM Court", "CJM Court, Kollam"),
  row("c", 2, "JMFC Court", "JMFC Court 2, Kollam", "Arguments"),
];

test("item groups sort numerically and keep matters across courts together", () => {
  const groups = groupCauseList(rows, "item");
  assert.deepEqual(groups.map((group) => group.key), ["2", "10"]);
  // Within item 2, matters order by court name (CJM before JMFC).
  assert.deepEqual(groups[0].rows.map((matter) => matter.id), ["b", "c"]);
  assert.deepEqual(rows.map((matter) => matter.id), ["a", "b", "c"]);
});

test("court grouping is by court name, not court number, and preserves scope", () => {
  // The two JMFC courtrooms group under one "JMFC Court"; grouping never splits by number.
  assert.deepEqual(
    groupCauseList(rows, "court").map((group) => [group.key, group.rows.length]),
    [["CJM Court", 1], ["JMFC Court", 2]],
  );
  assert.deepEqual(
    groupCauseList(rows.filter((matter) => matter.courtLabel === "CJM Court"), "court").map((group) => group.key),
    ["CJM Court"],
  );
});

test("status grouping splits concluded into passed-over and completed, most-active first", () => {
  const mk = (id: string, status: CauseListRow["status"], passedOver = false): CauseListRow => ({
    id, item: 1, court: "X", courtNumber: "1", courtLabel: "X", hearingType: "Evidence",
    parties: `${id} v. Co`, caseNumber: `CNR-${id}`, advocates: "A",
    status, approxTime: false, passedOver, mine: false,
  });
  const mixed = [
    mk("done", "concluded"),
    mk("passed", "concluded", true),
    mk("live", "now"),
    mk("next", "upcoming"),
  ];
  const groups = groupCauseList(mixed, "status");
  assert.deepEqual(groups.map((group) => group.key), ["now", "upcoming", "passed-over", "completed"]);
  assert.deepEqual(groups.map((group) => group.rows[0].id), ["live", "next", "passed", "done"]);
});

test("hearing type groups are stable and support search before grouping", () => {
  assert.deepEqual(groupCauseList(rows, "hearingType").map((group) => group.key), ["Arguments", "Evidence"]);
  assert.deepEqual(searchCauseList(rows, " CNR-b ").map((matter) => matter.id), ["b"]);
  assert.equal(searchCauseList(rows, "anjali").length, 3);
  assert.deepEqual(searchCauseList(rows, "arguments").map((matter) => matter.id), ["c"]);
  assert.equal(searchCauseList(rows, "no matching hearing").length, 0);
  assert.equal(searchCauseList(rows, "   ").length, rows.length);
});
