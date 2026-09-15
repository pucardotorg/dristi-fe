import assert from "node:assert/strict";
import test from "node:test";
import { groupCauseList, searchCauseList } from "./cause-list-groups";
import type { CauseListRow } from "./home";

const row = (id: string, item: number, court: string, courtNumber: string, hearingType = "Evidence"): CauseListRow => ({
  id, item, court, courtNumber, courtLabel: "JMFC Court", hearingType,
  parties: `${id} v. Company`, caseNumber: `CNR-${id}`, advocates: "Anjali Nair",
  status: "upcoming", approxTime: true, mine: id === "a",
});
const rows = [row("a", 10, "court-1", "1"), row("b", 2, "court-2", "2"), row("c", 2, "court-1", "1", "Arguments")];

test("item groups sort numerically and keep matters across courts together", () => {
  const groups = groupCauseList(rows, "item");
  assert.deepEqual(groups.map((group) => group.key), ["2", "10"]);
  assert.deepEqual(groups[0].rows.map((matter) => matter.id), ["c", "b"]);
  assert.deepEqual(rows.map((matter) => matter.id), ["a", "b", "c"]);
});

test("court grouping separates courts with identical display names and preserves scope", () => {
  assert.deepEqual(groupCauseList(rows, "court").map((group) => [group.key, group.rows.length]), [["court-1", 2], ["court-2", 1]]);
  assert.deepEqual(groupCauseList(rows.filter((matter) => matter.court === "court-2"), "court").map((group) => group.key), ["court-2"]);
});

test("hearing type groups are stable and support search before grouping", () => {
  assert.deepEqual(groupCauseList(rows, "hearingType").map((group) => group.key), ["Arguments", "Evidence"]);
  assert.deepEqual(searchCauseList(rows, " CNR-b ").map((matter) => matter.id), ["b"]);
  assert.equal(searchCauseList(rows, "anjali").length, 3);
  assert.deepEqual(searchCauseList(rows, "arguments").map((matter) => matter.id), ["c"]);
  assert.equal(searchCauseList(rows, "no matching hearing").length, 0);
  assert.equal(searchCauseList(rows, "   ").length, rows.length);
});
