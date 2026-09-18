import type { CaseDocumentKind } from "@/lib/employee/case-review";
import type { ZoneRect } from "@/lib/employee/document-zones";

/**
 * A page, at thumbnail size, in the DS's document-facsimile tokens.
 *
 * Drawn as one inline SVG rather than a stack of divs: the marks are a couple of pixels
 * tall, and a `viewBox` gets them there without reaching for off-ladder heights or
 * arbitrary lengths.
 *
 * Six shapes, because a §138 file holds six kinds of page and a clerk tells them apart
 * without reading. Marks are `paper-muted` for body and `paper-muted-foreground` for
 * the parts of a page that are darker in fact — a heading, a signature, an amount box.
 * Nothing here is legible, and nothing here is a specific document: readable text would
 * be fabricating a court record, which is the one thing a demo of a court file must not
 * do.
 */
export function PageFacsimile({ kind }: { kind: CaseDocumentKind }) {
  return (
    <svg
      viewBox="0 0 60 80"
      className="size-full"
      role="presentation"
      aria-hidden
    >
      {kind === "letter" ? <LetterMarks /> : null}
      {kind === "cheque" ? <ChequeMarks /> : null}
      {kind === "memo" ? <MemoMarks /> : null}
      {kind === "receipt" ? <ReceiptMarks /> : null}
      {kind === "id" ? <IdMarks /> : null}
      {kind === "form" ? <FormMarks /> : null}
    </svg>
  );
}

/** Body text, as a run of lines with a short last one. */
function TextLines({
  top,
  count,
  x = 10,
  width = 40,
}: {
  top: number;
  count: number;
  x?: number;
  width?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <rect
          key={index}
          x={x}
          y={top + index * 4}
          width={index === count - 1 ? width * 0.6 : width}
          height="1.5"
          className="fill-paper-muted"
        />
      ))}
    </>
  );
}

/** A typed page — the complaint, a notice, an affidavit, an application. */
function LetterMarks() {
  return (
    <>
      <rect
        x="18"
        y="8"
        width="24"
        height="2.5"
        className="fill-paper-muted-foreground"
      />
      <TextLines top={16} count={9} />
      {/* The signature block a filed page ends with. */}
      <rect
        x="34"
        y="66"
        width="16"
        height="2"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="34"
        y="71"
        width="10"
        height="1.5"
        className="fill-paper-muted"
      />
    </>
  );
}

/** The cheque itself: a landscape slip on a portrait scan, with its MICR band. */
function ChequeMarks() {
  return (
    <>
      <rect
        x="5"
        y="26"
        width="50"
        height="28"
        className="fill-paper-muted"
        rx="1"
      />
      {/* Payee line, then the amount box on the right, then the code band. */}
      <rect
        x="9"
        y="33"
        width="24"
        height="1.5"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="38"
        y="31"
        width="13"
        height="6"
        className="fill-paper-muted-foreground"
        rx="0.5"
      />
      <rect
        x="9"
        y="40"
        width="18"
        height="1.5"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="34"
        y="44"
        width="17"
        height="2"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="9"
        y="49"
        width="42"
        height="2"
        className="fill-paper-muted-foreground"
      />
    </>
  );
}

/** A bank slip — a return memo, a deposit counterfoil. Short, and stamped. */
function MemoMarks() {
  return (
    <>
      <rect
        x="10"
        y="10"
        width="40"
        height="24"
        className="fill-paper-muted"
        rx="1"
      />
      <rect
        x="14"
        y="14"
        width="20"
        height="2"
        className="fill-paper-muted-foreground"
      />
      <TextLines top={20} count={2} x={14} width={32} />
      {/* The stamp a bank puts on a returned instrument. */}
      <rect
        x="30"
        y="40"
        width="20"
        height="12"
        className="fill-paper-muted-foreground"
        rx="1"
      />
    </>
  );
}

/** A receipt or a ledger extract: label-and-amount rows, then a total under a rule. */
function ReceiptMarks() {
  return (
    <>
      <rect
        x="16"
        y="9"
        width="28"
        height="2.5"
        className="fill-paper-muted-foreground"
      />
      {Array.from({ length: 5 }, (_, index) => (
        <g key={index}>
          <rect
            x="10"
            y={20 + index * 7}
            width="22"
            height="1.5"
            className="fill-paper-muted"
          />
          <rect
            x="40"
            y={20 + index * 7}
            width="10"
            height="1.5"
            className="fill-paper-muted"
          />
        </g>
      ))}
      <rect
        x="10"
        y="58"
        width="40"
        height="1"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="36"
        y="63"
        width="14"
        height="2.5"
        className="fill-paper-muted-foreground"
      />
    </>
  );
}

/** A card scan — an ID proof, a Bar ID card. Photo left, particulars right. */
function IdMarks() {
  return (
    <>
      <rect
        x="6"
        y="22"
        width="48"
        height="32"
        className="fill-paper-muted"
        rx="2"
      />
      <rect
        x="11"
        y="28"
        width="14"
        height="18"
        className="fill-paper-muted-foreground"
        rx="1"
      />
      <TextLines top={29} count={3} x={29} width={20} />
    </>
  );
}

/** A court form with a ruled table — a vakalatnama, a registration paper. */
function FormMarks() {
  return (
    <>
      <rect
        x="14"
        y="8"
        width="32"
        height="2.5"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="10"
        y="16"
        width="40"
        height="1.5"
        className="fill-paper-muted"
      />
      {/* The ruled grid a court form is mostly made of. */}
      <rect
        x="10"
        y="24"
        width="40"
        height="24"
        className="fill-paper-muted"
        rx="0.5"
      />
      <rect
        x="10"
        y="32"
        width="40"
        height="0.8"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="10"
        y="40"
        width="40"
        height="0.8"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="24"
        y="24"
        width="0.8"
        height="24"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="30"
        y="66"
        width="20"
        height="2"
        className="fill-paper-muted-foreground"
      />
    </>
  );
}

/* ───────────────────────────── the full page ─────────────────────────────── */

/**
 * The box each kind of page is drawn and framed in — its viewBox, cropped to what the
 * facsimile actually draws rather than a shared A4 portrait.
 *
 * The marks below are all laid out in one `0 0 60 80` grid, but a kind rarely fills it: a
 * cheque is a wide slip across the top quarter, a memo a short stamped slip, an ID two
 * cards. Framed in a fixed 3:4 box they floated in dead white — the box was scoped to the
 * page, not to the document on it (owner, 2026-09-15). So each kind names the sub-rectangle
 * of that grid its content occupies (plus a hairline of margin), and both the SVG viewBox
 * and the container's aspect ratio come from here (`document-scroller.tsx`). The draw
 * functions keep their original coordinates; only the window onto them tightens.
 *
 * These same rectangles are the coordinate space the annotation zones live in
 * (`document-zones.ts`), so a zone reads straight off the marks it points at.
 */
export const SHEET_BOX: Record<CaseDocumentKind, ZoneRect> = {
  letter: { x: 3, y: 3, w: 54, h: 72 },
  cheque: { x: 3, y: 5, w: 54, h: 29 },
  memo: { x: 4, y: 4, w: 52, h: 53 },
  receipt: { x: 4, y: 4, w: 52, h: 63 },
  id: { x: 6, y: 4, w: 48, h: 62 },
  form: { x: 4, y: 3, w: 52, h: 65 },
};

/**
 * A page at reading size — the same six kinds, drawn finely enough to hold a whole page.
 *
 * `PageFacsimile` is a thumbnail: its marks are sized to read at 24px, and scaled to fill
 * a bundle column they became slabs, the page a grey placeholder rather than a document
 * (measured on the render, 2026-09-11). This draws the page a reader expects — margins, a
 * heading, paragraphs of hairline-thin rules with ragged ends, a signature block, the
 * slip, the stamp, the ruled form — still in the paper tokens, and still illegible: the
 * shape of each document, never its words.
 *
 * The viewBox is the kind's own `SHEET_BOX`, so the drawing fills the frame instead of
 * sitting in the top of an A4 sheet.
 */
export function PageSheet({ kind }: { kind: CaseDocumentKind }) {
  const box = SHEET_BOX[kind];
  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      className="size-full"
      role="presentation"
      aria-hidden
    >
      {kind === "letter" ? <LetterSheet /> : null}
      {kind === "cheque" ? <ChequeSheet /> : null}
      {kind === "memo" ? <MemoSheet /> : null}
      {kind === "receipt" ? <ReceiptSheet /> : null}
      {kind === "id" ? <IdSheet /> : null}
      {kind === "form" ? <FormSheet /> : null}
    </svg>
  );
}

/** A paragraph: `count` thin rules with ragged, repeatable ends and a short last line. */
function Paragraph({
  top,
  count,
  x = 7,
  width = 46,
  seed = 0,
}: {
  top: number;
  count: number;
  x?: number;
  width?: number;
  seed?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const ragged =
          index === count - 1 ? 0.45 : 0.88 + (((index + seed) * 7) % 12) / 100;
        return (
          <rect
            key={index}
            x={x}
            y={top + index * 1.9}
            width={width * Math.min(1, ragged)}
            height="0.55"
            rx="0.2"
            className="fill-paper-muted"
          />
        );
      })}
    </>
  );
}

/** A heading rule, darker and centred. */
function Heading({ y, width, x }: { y: number; width: number; x?: number }) {
  return (
    <rect
      x={x ?? 30 - width / 2}
      y={y}
      width={width}
      height="1"
      rx="0.3"
      className="fill-paper-muted-foreground"
    />
  );
}

/** A signature: a short dark scrawl over a name rule. */
function Signature({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path
        d={`M ${x} ${y} q 2 -2.4 3.4 0 t 3.4 0 t 3.2 -0.4 t 3 0.6`}
        fill="none"
        strokeWidth="0.45"
        strokeLinecap="round"
        className="stroke-paper-muted-foreground"
      />
      <rect
        x={x}
        y={y + 1.6}
        width="13"
        height="0.35"
        className="fill-paper-muted-foreground"
      />
      <rect
        x={x}
        y={y + 2.8}
        width="9"
        height="0.55"
        rx="0.2"
        className="fill-paper-muted"
      />
    </>
  );
}

/** A typed filing — a complaint, an affidavit, a notice, an application, a reply. */
function LetterSheet() {
  return (
    <>
      <Heading y={6} width={24} />
      <rect
        x="20"
        y="8.6"
        width="20"
        height="0.55"
        rx="0.2"
        className="fill-paper-muted"
      />
      <Paragraph top={13} count={7} seed={1} />
      <Paragraph top={27.5} count={8} seed={3} />
      <Paragraph top={44} count={6} seed={5} />
      <Paragraph top={56.5} count={4} seed={2} />
      <Signature x={38} y={69} />
      <rect
        x="7"
        y="70.6"
        width="10"
        height="0.55"
        rx="0.2"
        className="fill-paper-muted"
      />
    </>
  );
}

/** The cheque: the slip as it was scanned, on the upper half of the page. */
function ChequeSheet() {
  return (
    <>
      <rect
        x="5"
        y="8"
        width="50"
        height="24"
        rx="1"
        className="fill-paper-muted"
      />
      {/* Bank name and branch, top left; the date boxes top right. */}
      <rect
        x="8"
        y="10.5"
        width="16"
        height="1"
        rx="0.3"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="8"
        y="12.6"
        width="11"
        height="0.5"
        rx="0.2"
        className="fill-paper"
      />
      {Array.from({ length: 8 }, (_, index) => (
        <rect
          key={index}
          x={36 + index * 2.2}
          y="10.4"
          width="1.8"
          height="2"
          rx="0.2"
          fill="none"
          strokeWidth="0.25"
          className="stroke-paper-muted-foreground"
        />
      ))}
      {/* Pay, the amount in words, and the amount box. */}
      <rect
        x="8"
        y="16.2"
        width="30"
        height="0.35"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="8"
        y="19.4"
        width="26"
        height="0.35"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="8"
        y="22.6"
        width="20"
        height="0.35"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="39"
        y="17.8"
        width="13"
        height="4"
        rx="0.4"
        fill="none"
        strokeWidth="0.35"
        className="stroke-paper-muted-foreground"
      />
      <Signature x={38} y={26} />
      {/* The MICR band. */}
      {Array.from({ length: 14 }, (_, index) => (
        <rect
          key={index}
          x={8 + index * 3.1}
          y="30"
          width={index % 3 === 0 ? 1.2 : 2.2}
          height="0.8"
          className="fill-paper-muted-foreground"
        />
      ))}
    </>
  );
}

/** A bank's slip — a return memo, a deposit or postal receipt: fields, then a stamp. */
function MemoSheet() {
  return (
    <>
      <rect
        x="7"
        y="7"
        width="46"
        height="36"
        rx="1"
        className="fill-paper-muted"
      />
      <rect
        x="10"
        y="10"
        width="18"
        height="1"
        rx="0.3"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="10"
        y="12.2"
        width="12"
        height="0.5"
        rx="0.2"
        className="fill-paper"
      />
      {Array.from({ length: 6 }, (_, index) => (
        <g key={index}>
          <rect
            x="10"
            y={16.5 + index * 3.2}
            width="11"
            height="0.55"
            rx="0.2"
            className="fill-paper"
          />
          <rect
            x="24"
            y={16.5 + index * 3.2}
            width={index % 2 === 0 ? 20 : 14}
            height="0.55"
            rx="0.2"
            className="fill-paper-muted-foreground"
          />
        </g>
      ))}
      {/* The stamp the bank puts on it, slightly askew. */}
      <g transform="rotate(-8 44 50)">
        <circle
          cx="44"
          cy="50"
          r="5.5"
          fill="none"
          strokeWidth="0.45"
          className="stroke-paper-muted-foreground"
        />
        <circle
          cx="44"
          cy="50"
          r="4.2"
          fill="none"
          strokeWidth="0.25"
          className="stroke-paper-muted-foreground"
        />
        <rect
          x="40.5"
          y="49.6"
          width="7"
          height="0.8"
          className="fill-paper-muted-foreground"
        />
      </g>
      <Signature x={9} y={50} />
    </>
  );
}

/** A receipt or a ledger extract: label and amount rows, a rule, then the total. */
function ReceiptSheet() {
  return (
    <>
      <Heading y={7} width={22} />
      <rect
        x="22"
        y="9.6"
        width="16"
        height="0.55"
        rx="0.2"
        className="fill-paper-muted"
      />
      <rect
        x="7"
        y="14"
        width="46"
        height="0.3"
        className="fill-paper-muted-foreground"
      />
      {Array.from({ length: 11 }, (_, index) => (
        <g key={index}>
          <rect
            x="7"
            y={17 + index * 2.6}
            width={16 + ((index * 5) % 9)}
            height="0.55"
            rx="0.2"
            className="fill-paper-muted"
          />
          <rect
            x="44"
            y={17 + index * 2.6}
            width="9"
            height="0.55"
            rx="0.2"
            className="fill-paper-muted"
          />
        </g>
      ))}
      <rect
        x="7"
        y="46"
        width="46"
        height="0.3"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="7"
        y="48.4"
        width="12"
        height="0.8"
        rx="0.2"
        className="fill-paper-muted-foreground"
      />
      <rect
        x="42"
        y="48.4"
        width="11"
        height="0.8"
        rx="0.2"
        className="fill-paper-muted-foreground"
      />
      <Signature x={38} y={62} />
    </>
  );
}

/** A card, front and back — an ID proof, a Bar ID card. */
function IdSheet() {
  return (
    <>
      {[8, 38].map((top) => (
        <g key={top}>
          <rect
            x="10"
            y={top}
            width="40"
            height="25"
            rx="1.5"
            className="fill-paper-muted"
          />
          <rect
            x="10"
            y={top}
            width="40"
            height="4"
            rx="1.5"
            className="fill-paper-muted-foreground"
          />
          {top === 8 ? (
            <>
              <rect
                x="13"
                y={top + 7}
                width="10"
                height="13"
                rx="0.6"
                className="fill-paper-muted-foreground"
              />
              <Paragraph top={top + 8} count={5} x={26} width={21} seed={4} />
            </>
          ) : (
            <Paragraph top={top + 8} count={7} x={13} width={34} seed={6} />
          )}
        </g>
      ))}
    </>
  );
}

/** A court form or a company paper — a ruled table under a title, then signatures. */
function FormSheet() {
  return (
    <>
      <Heading y={6} width={28} />
      <Paragraph top={11} count={3} seed={2} />
      <rect
        x="7"
        y="18"
        width="46"
        height="34"
        rx="0.4"
        fill="none"
        strokeWidth="0.3"
        className="stroke-paper-muted-foreground"
      />
      {Array.from({ length: 7 }, (_, index) => (
        <rect
          key={index}
          x="7"
          y={22.2 + index * 4.2}
          width="46"
          height="0.2"
          className="fill-paper-muted-foreground"
        />
      ))}
      <rect
        x="21"
        y="18"
        width="0.2"
        height="34"
        className="fill-paper-muted-foreground"
      />
      {Array.from({ length: 8 }, (_, index) => (
        <g key={index}>
          <rect
            x="9"
            y={19.6 + index * 4.2}
            width="9"
            height="0.5"
            rx="0.2"
            className="fill-paper-muted"
          />
          <rect
            x="23"
            y={19.6 + index * 4.2}
            width={14 + ((index * 7) % 14)}
            height="0.5"
            rx="0.2"
            className="fill-paper-muted"
          />
        </g>
      ))}
      <Signature x={9} y={62} />
      <Signature x={38} y={62} />
    </>
  );
}
