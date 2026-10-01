import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GHOST_ATTRIBUTE,
  pickSuggestion,
  readSuggestTrigger,
  readProsePrefix,
  stripGhostHtml,
  suggestionHost,
} from "./ghost";

/**
 * The preview must never become part of the order. These are the cases that decide it,
 * and they are here rather than in a rendered check because the failure is invisible:
 * a ghost that survived would read as the typist's own words on the page beside them.
 */
describe("stripGhostHtml", () => {
  const ghost = (words: string) =>
    `<span ${GHOST_ATTRIBUTE} contenteditable="false">${words}</span>`;

  it("takes the preview out and leaves the writing", () => {
    assert.equal(
      stripGhostHtml(`<p>Heard both sides. ${ghost("Bail is granted.")}</p>`),
      "<p>Heard both sides. </p>",
    );
  });

  it("takes out what the preview wrapped, not just its text", () => {
    assert.equal(
      stripGhostHtml(
        `<p>x${`<span ${GHOST_ATTRIBUTE}>Bail on <b>bond</b>.</span>`}</p>`,
      ),
      "<p>x</p>",
    );
  });

  it("takes out more than one, because a stale node is the case that matters", () => {
    assert.equal(
      stripGhostHtml(`<p>${ghost("a")}</p><p>b${ghost("c")}</p>`),
      "<p></p><p>b</p>",
    );
  });

  it("leaves an order that never had one exactly as it was", () => {
    const order = '<p data-order-item="i1">Bail is granted on a bond.</p>';
    assert.equal(stripGhostHtml(order), order);
  });

  it("leaves the order's own marks alone", () => {
    /* `data-order-item` is a *record*, not a preview: stripping it would take a signed
       direction out of the document. */
    const marked = '<p data-order-item="i1">Kept.</p>';
    assert.equal(stripGhostHtml(`${marked}<p>${ghost("x")}</p>`), `${marked}<p></p>`);
  });
});

/**
 * When a completion is being asked for. The negative cases are the point: this court's
 * text carries slashes in case numbers, application numbers, dates and the court's own
 * standing words, and a trigger that fired on those would be unusable.
 */
describe("readSuggestTrigger", () => {
  it("reads the words typed after a slash that opens a word", () => {
    assert.equal(readSuggestTrigger("Heard both sides. /sum"), "sum");
    assert.equal(readSuggestTrigger("/bail"), "bail");
  });

  it("asks nothing until a word has been typed", () => {
    /* The slash arms the search; the word is what makes it one (owner, 2026-09-16).
       Offering on the bare trigger put a whole standing direction on screen before the
       reader had said anything about which one they meant. */
    assert.equal(readSuggestTrigger("/"), null);
    assert.equal(readSuggestTrigger("/s"), null);
    assert.equal(readSuggestTrigger("/su"), "su");
  });

  it("takes the last slash, so a second search after a first one still reads", () => {
    assert.equal(readSuggestTrigger("/heard accepted. /none"), "none");
  });

  it("ignores a slash inside a case or application number", () => {
    assert.equal(readSuggestTrigger("Put up in ST/241"), null);
    assert.equal(readSuggestTrigger("CMP/312/2026"), null);
  });

  it("ignores a slash inside the court's own standing words", () => {
    assert.equal(readSuggestTrigger("offences u/s.138 of NI Act"), null);
  });

  it("ignores a slash followed by a digit — a date, not a search", () => {
    assert.equal(readSuggestTrigger("Put up on 30 /09"), null);
  });

  it("ignores a slash standing on its own in prose", () => {
    assert.equal(readSuggestTrigger("and / or"), null);
  });

  it("gives up once the reader is plainly writing rather than searching", () => {
    assert.equal(readSuggestTrigger(`/${"a".repeat(41)}`), null);
    assert.equal(readSuggestTrigger(`/${"a".repeat(40)}`), "a".repeat(40));
  });

  it("allows spaces inside the query, because the labels have them", () => {
    assert.equal(readSuggestTrigger("/issue of sum"), "issue of sum");
  });

  it("reads nothing from text with no slash in it at all", () => {
    assert.equal(readSuggestTrigger("Heard both sides."), null);
    assert.equal(readSuggestTrigger(""), null);
  });
});

/**
 * Hysteresis: the completion the reader is looking at must not be swapped under their
 * eyes while they type, so it is held while it still answers the query.
 */
describe("pickSuggestion", () => {
  const rows = [{ key: "a" }, { key: "b" }];

  it("keeps showing the one already shown while it still answers", () => {
    assert.equal(pickSuggestion(rows, "b", 0)?.key, "b");
  });

  it("moves on when the held one stops answering", () => {
    assert.equal(pickSuggestion(rows, "gone", 0)?.key, "a");
  });

  it("gives the reader's own cycling the last word", () => {
    assert.equal(pickSuggestion(rows, "a", 1)?.key, "b");
    /* Past the end it comes round, so ↓ never dead-ends. */
    assert.equal(pickSuggestion(rows, "a", 2)?.key, "a");
  });

  it("is nothing at all when nothing answers", () => {
    assert.equal(pickSuggestion([], "a", 0), null);
  });
});

/**
 * Where the preview is allowed to go. **Both of the reasons this feature did not work
 * are in here** (owner, 2026-09-16: *the suggestion thing is not working*), so they are
 * pinned rather than re-read: a bare text node cannot take a child, and a caret sitting
 * on the editor must not send the walk climbing out of it.
 *
 * Node stubs rather than a DOM: the decision reads nothing but identity, `parentNode`
 * and `nodeType`, so a tree of plain objects exercises exactly the logic that failed.
 */
describe("suggestionHost", () => {
  const ELEMENT = 1;
  const TEXT = 3;
  /** editor > paragraph > bold > "words", plus a bare text node under the editor. */
  const editor = { nodeType: ELEMENT, parentNode: null } as unknown as Node;
  const outside = { nodeType: ELEMENT, parentNode: null } as unknown as Node;
  const paragraph = { nodeType: ELEMENT, parentNode: editor } as unknown as Node;
  const bold = { nodeType: ELEMENT, parentNode: paragraph } as unknown as Node;
  const words = { nodeType: TEXT, parentNode: bold } as unknown as Node;
  const bare = { nodeType: TEXT, parentNode: editor } as unknown as Node;

  it("is the paragraph when the caret is inside one, however deep", () => {
    assert.equal(suggestionHost(editor, words), paragraph);
    assert.equal(suggestionHost(editor, paragraph), paragraph);
  });

  it("is the editor for a bare text node — an empty order box has no paragraph", () => {
    /* The first failure: this used to answer the text node itself, and appending the
       preview to a text node throws, so typing `/` into an empty order did nothing. */
    assert.equal(suggestionHost(editor, bare), editor);
  });

  it("is the editor when the caret sits on the editor", () => {
    /* The second failure: the walk used to climb out of the editor and end at the
       document, and the preview would have been appended there. */
    assert.equal(suggestionHost(editor, editor), editor);
  });

  it("is nothing for a caret outside the editor", () => {
    assert.equal(suggestionHost(editor, outside), null);
  });
});

/**
 * Completing prose with no trigger: the sentence being typed is the query. The negative
 * cases carry the weight again — this one fires while somebody is writing, so it has to
 * stay quiet until what they have typed is plainly about one sentence.
 */
describe("readProsePrefix", () => {
  it("is the sentence being typed", () => {
    assert.equal(readProsePrefix("Heard bo"), "Heard bo");
  });

  it("starts again after the last sentence that ended", () => {
    assert.equal(
      readProsePrefix("The application is allowed. None appe"),
      "None appe",
    );
    assert.equal(readProsePrefix("Is that so? At the requ"), "At the requ");
  });

  it("says nothing until the prefix is about a sentence rather than a language", () => {
    /* "At" opens a great many sentences a court writes. */
    assert.equal(readProsePrefix("At"), null);
    assert.equal(readProsePrefix("At "), null);
    assert.equal(readProsePrefix("At t"), "At t");
  });

  it("hands anything with a slash in it back to the trigger rule", () => {
    assert.equal(readProsePrefix("Heard both sides. /summ"), null);
    assert.equal(readProsePrefix("u/s.138 of the Act"), null);
  });

  it("says nothing on an empty line or one holding only spaces", () => {
    assert.equal(readProsePrefix(""), null);
    assert.equal(readProsePrefix("   "), null);
    assert.equal(readProsePrefix("Allowed. "), null);
  });
});
