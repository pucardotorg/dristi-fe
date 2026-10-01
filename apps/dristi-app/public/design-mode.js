/**
 * Design mode — an invoke-only overlay for annotating and tweaking the running app.
 *
 * Not product code: review tooling, loaded on demand (visit any route with
 * `?design=1`, or run the /design-review skill) and never bundled by the app.
 * Works on any branch and route because it is a static file with zero deps.
 *
 *   Browse  — the app stays fully interactive; the panel just floats.
 *   Select  — hover highlights, click inspects, double-click edits text in
 *             place. The panel offers live tweaks (type, color, spacing,
 *             radius, free CSS), structure actions (select parent, duplicate,
 *             delete, undo) and auto-layout: it identifies whether the element
 *             is a stack (flex/grid), can make it one, and exposes direction /
 *             gap / align / justify. Selecting inside a DS primitive shows its
 *             data-slot, and the log carries it — those edits are routed to
 *             the design system, never applied as local overrides.
 *   Comment — click an element to pin a note on it, or DRAG to draw a box over
 *             a region and annotate that. Either kind can carry a reference
 *             image; "Copy for Claude" downloads the images (dm-ref-N.jpg) so
 *             they can be attached in chat next to the pasted report.
 *
 * Every change logs before → after. State persists per-path in localStorage.
 *
 * Limits, honestly: edits are inline styles on live DOM. React re-renders can
 * revert them (the log still remembers), duplicated nodes are static copies
 * (their buttons are inert), and elements reflow rather than free-drag.
 */
(function () {
  "use strict";

  if (window.__dmActive) {
    window.__dmTeardown && window.__dmTeardown();
    return;
  }
  window.__dmActive = true;

  var LS_KEY = "__designMode:" + location.pathname;
  var state = {
    mode: "select", // browse | select | comment
    selected: null,
    edits: [], // {sel, label, prop, from, to, ds?}
    comments: [], // {n, kind:'el'|'box', sel, label, text, rect?, img?}
    pins: [],
    undo: [],
    importRequest: false,
  };

  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (saved) {
      state.edits = saved.edits || [];
      state.comments = saved.comments || [];
    }
  } catch (e) {}

  /* ---------------- selector + label helpers ---------------- */

  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    if (el.id) return "#" + el.id;
    var path = [];
    var node = el;
    while (node && node.nodeType === 1 && path.length < 5 && node !== document.body) {
      var part = node.tagName.toLowerCase();
      var slot = node.getAttribute("data-slot");
      if (slot) part += '[data-slot="' + slot + '"]';
      var parent = node.parentElement;
      if (parent) {
        var sibs = Array.prototype.filter.call(parent.children, function (c) {
          return c.tagName === node.tagName;
        });
        if (sibs.length > 1) part += ":nth-of-type(" + (sibs.indexOf(node) + 1) + ")";
      }
      path.unshift(part);
      node = parent;
    }
    return path.join(" > ");
  }

  function labelOf(el) {
    var t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
    return t ? '"' + t + (t.length >= 48 ? "…" : "") + '"' : "<" + el.tagName.toLowerCase() + ">";
  }

  /** The DS primitive this element sits in, if any — data-slot is the DS's own marker. */
  function dsOf(el) {
    var hit = el && el.closest && el.closest("[data-slot]");
    return hit ? hit.getAttribute("data-slot") : null;
  }

  function persist() {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ edits: state.edits, comments: state.comments })
      );
    } catch (e) {
      // Usually the image quota. Keep images for the session, persist the rest.
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            edits: state.edits,
            comments: state.comments.map(function (c) {
              var copy = {};
              for (var k in c) if (k !== "img") copy[k] = c[k];
              return copy;
            }),
          })
        );
        toast("Image too large to keep after reload — kept for this session");
      } catch (e2) {}
    }
  }

  /* ---------------- root + styles ---------------- */

  var root = document.createElement("div");
  root.id = "__dm-root";
  document.body.appendChild(root);

  /* A Radix modal (every review overlay in this app) closes on a pointer press
     outside itself and pulls focus back inside on focusin. The panel is outside
     itself — it lives on document.body — so touching the panel dismissed the very
     dialog under review, and Select could not be reached with a dialog open.

     So the tool's own subtree stops these events before they reach the document
     listeners that Radix installs. Design mode's own handlers are unaffected: they
     are all registered on document in the CAPTURE phase, which runs before this. */
  ["pointerdown", "mousedown", "touchstart", "pointerup", "mouseup", "click", "focusin"].forEach(
    function (type) {
      root.addEventListener(type, function (ev) {
        ev.stopPropagation();
      });
    }
  );

  var css = document.createElement("style");
  css.textContent =
    "#__dm-root{all:initial;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.45;color:#e8e6e3;pointer-events:auto;}" +
    "#__dm-root *{box-sizing:border-box;font-family:inherit;}" +
    "#__dm-panel{position:fixed;top:64px;right:12px;width:256px;max-height:calc(100vh - 88px);overflow-y:auto;background:#1c1a18;border:1px solid #3a3733;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.45);z-index:2147483000;padding:10px;}" +
    "#__dm-panel h1{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a8a29b;margin:0 0 8px;display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;}" +
"#__dm-panel h1 span{font-weight:400;letter-spacing:0;text-transform:none;color:#78716a;font-size:10px;}" +
"#__dm-panel.dm-dragging{opacity:.92;transition:none;}" +
    "#__dm-panel h2{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#78716a;margin:10px 0 4px;display:block;}" +
    ".dm-modes{display:flex;gap:4px;margin-bottom:8px;}" +
    ".dm-modes button{flex:1;padding:5px 0;border:1px solid #3a3733;background:#26231f;color:#c9c5bf;border-radius:6px;cursor:pointer;font-size:11px;}" +
    ".dm-modes button.on{background:#0a6969;border-color:#0a6969;color:#fff;}" +
    ".dm-row{display:flex;align-items:center;gap:6px;margin:5px 0;}" +
    ".dm-row label{width:60px;color:#a8a29b;flex:none;}" +
    ".dm-row input,.dm-row select{flex:1;min-width:0;background:#26231f;border:1px solid #3a3733;color:#e8e6e3;border-radius:5px;padding:3px 6px;font-size:12px;}" +
    ".dm-row input[type=color]{padding:1px;height:24px;}" +
    ".dm-sel{background:#26231f;border-radius:6px;padding:6px;margin:6px 0;word-break:break-all;color:#c9c5bf;font-size:11px;}" +
    ".dm-ds{background:#3b2f1e;border:1px solid #6b5426;color:#f0b37e;border-radius:6px;padding:5px 6px;margin:6px 0;font-size:11px;}" +
    ".dm-actions{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:6px 0;}" +
    ".dm-actions button{padding:5px 0;border:1px solid #3a3733;background:#26231f;color:#e8e6e3;border-radius:6px;cursor:pointer;font-size:11px;}" +
    ".dm-actions button.danger{color:#e08b7d;}" +
    ".dm-btn{width:100%;margin-top:6px;padding:6px 0;border:1px solid #3a3733;background:#26231f;color:#e8e6e3;border-radius:6px;cursor:pointer;font-size:12px;}" +
    ".dm-btn.primary{background:#0a6969;border-color:#0a6969;color:#fff;}" +
    ".dm-btn.danger{color:#e08b7d;}" +
    ".dm-count{color:#a8a29b;margin-top:8px;font-size:11px;}" +
    "#__dm-hover,#__dm-selbox{position:absolute;pointer-events:none;z-index:2147482998;border:1.5px solid #14b8a6;border-radius:3px;display:none;}" +
    "#__dm-selbox{border-color:#f59e0b;}" +
    "#__dm-marquee{position:absolute;pointer-events:none;z-index:2147483001;border:1.5px dashed #14b8a6;background:rgba(20,184,166,.08);border-radius:2px;display:none;}" +
    ".dm-boxpin{position:absolute;pointer-events:none;z-index:2147482998;border:2px dashed #b45309;border-radius:3px;}" +
    ".dm-pin{position:absolute;z-index:2147482999;width:20px;height:20px;border-radius:50%;background:#b45309;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer;font-family:-apple-system,sans-serif;}" +
    "#__dm-note{position:absolute;z-index:2147483002;width:240px;background:#1c1a18;border:1px solid #3a3733;border-radius:8px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.5);}" +
    "#__dm-note textarea{width:100%;height:64px;background:#26231f;border:1px solid #3a3733;color:#e8e6e3;border-radius:5px;padding:5px;font-size:12px;resize:vertical;}" +
    "#__dm-note .dm-btn{margin-top:5px;}" +
    "#__dm-note input[type=file]{width:100%;margin-top:5px;font-size:11px;color:#a8a29b;}" +
    "#__dm-note img{max-width:100%;border-radius:5px;margin-top:5px;display:block;}" +
    ".dm-toast{position:fixed;bottom:16px;right:16px;z-index:2147483003;background:#0a6969;color:#fff;padding:8px 14px;border-radius:8px;font-size:12px;box-shadow:0 4px 16px rgba(0,0,0,.35);}";
  root.appendChild(css);

  var hoverBox = document.createElement("div");
  hoverBox.id = "__dm-hover";
  root.appendChild(hoverBox);
  var selBox = document.createElement("div");
  selBox.id = "__dm-selbox";
  root.appendChild(selBox);
  var marquee = document.createElement("div");
  marquee.id = "__dm-marquee";
  root.appendChild(marquee);

  /* ---------------- panel ---------------- */

  var panel = document.createElement("div");
  panel.id = "__dm-panel";
  root.appendChild(panel);

  /* The panel floats top-right by default, which is exactly where a screen's
     primary action tends to live. So the header is a drag handle: put the panel
     wherever it is not in the way. Position is remembered across pages and
     reloads (one key for the whole app, not per path — the annoyance is the
     same everywhere), clamped to the viewport, and double-click resets it. */
  var POS_KEY = "__designMode:panelPos";
  function clampPos(x, y) {
    var w = panel.offsetWidth || 256, h = panel.offsetHeight || 200;
    return {
      x: Math.max(0, Math.min(x, innerWidth - w)),
      y: Math.max(0, Math.min(y, innerHeight - Math.min(h, 120))),
    };
  }
  function applyPos(pos) {
    if (!pos) {
      panel.style.left = "";
      panel.style.top = "";
      panel.style.right = "";
      return;
    }
    var c = clampPos(pos.x, pos.y);
    panel.style.right = "auto";
    panel.style.left = c.x + "px";
    panel.style.top = c.y + "px";
  }
  try {
    applyPos(JSON.parse(localStorage.getItem(POS_KEY) || "null"));
  } catch (e) {}
  var drag = null;
  panel.addEventListener("mousedown", function (ev) {
    var h = ev.target.closest && ev.target.closest("h1");
    if (!h || ev.button !== 0) return;
    var r = panel.getBoundingClientRect();
    drag = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    panel.classList.add("dm-dragging");
    ev.preventDefault();
    ev.stopPropagation();
  });
  document.addEventListener("mousemove", function (ev) {
    if (!drag) return;
    applyPos({ x: ev.clientX - drag.dx, y: ev.clientY - drag.dy });
    ev.preventDefault();
  }, true);
  document.addEventListener("mouseup", function () {
    if (!drag) return;
    drag = null;
    panel.classList.remove("dm-dragging");
    var r = panel.getBoundingClientRect();
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top }));
    } catch (e) {}
  }, true);
  panel.addEventListener("dblclick", function (ev) {
    if (!(ev.target.closest && ev.target.closest("h1"))) return;
    applyPos(null);
    try { localStorage.removeItem(POS_KEY); } catch (e) {}
    ev.stopPropagation();
  });
  addEventListener("resize", function () {
    if (panel.style.left) applyPos({ x: parseFloat(panel.style.left), y: parseFloat(panel.style.top) });
  });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function stackInfo(el) {
    var cs = getComputedStyle(el);
    var isFlex = cs.display.indexOf("flex") !== -1;
    var isGrid = cs.display.indexOf("grid") !== -1;
    return {
      isStack: isFlex || isGrid,
      kind: isFlex ? "flex" : isGrid ? "grid" : cs.display,
      direction: cs.flexDirection,
      gap: cs.gap,
      align: cs.alignItems,
      justify: cs.justifyContent,
    };
  }

  function renderPanel() {
    var el = state.selected;
    var html =
      "<h1>Design mode<span title=\"Drag to move · double-click to reset\">⠿</span></h1>" +
      '<div class="dm-modes">' +
      ["browse", "select", "comment"]
        .map(function (m) {
          return (
            '<button data-mode="' + m + '" class="' + (state.mode === m ? "on" : "") + '">' +
            m.charAt(0).toUpperCase() + m.slice(1) +
            "</button>"
          );
        })
        .join("") +
      "</div>";

    if (state.mode === "select" && el) {
      var cs = getComputedStyle(el);
      var st = stackInfo(el);
      var slot = dsOf(el);
      html += '<div class="dm-sel">' + esc(cssPath(el)) + "<br>" + esc(labelOf(el)) + "</div>";
      if (slot) {
        html +=
          '<div class="dm-ds">DS primitive: <b>' + esc(slot) + "</b> — this edit is a design-system change; Claude routes it upstream, not as a local override.</div>";
      }
      html +=
        '<div class="dm-actions">' +
        '<button id="dm-parent">↑ Parent</button>' +
        '<button id="dm-undo"' + (state.undo.length ? "" : " disabled") + ">Undo (" + state.undo.length + ")</button>" +
        '<button id="dm-dupe">Duplicate</button>' +
        '<button id="dm-del" class="danger">Delete</button>' +
        "</div>" +
        "<h2>Text</h2>" +
        row("font-size", "Size", px(cs.fontSize), "number") +
        rowSelect("font-weight", "Weight", cs.fontWeight, ["400", "500", "600", "700"]) +
        row("color", "Color", rgbToHex(cs.color), "color") +
        '<button class="dm-btn" id="dm-edit-text">Edit text (or double-click it)</button>' +
        "<h2>Box</h2>" +
        row("background-color", "Fill", rgbToHex(cs.backgroundColor), "color") +
        row("padding", "Padding", px(cs.paddingTop), "number") +
        row("margin", "Margin", px(cs.marginTop), "number") +
        row("border-radius", "Radius", px(cs.borderRadius), "number") +
        '<div class="dm-row"><label>CSS</label><input id="dm-free" placeholder="prop: value ⏎"></div>' +
        "<h2>Stack · " + esc(st.isStack ? st.kind + " " + (st.kind === "flex" ? st.direction : "") : "not a stack") + "</h2>";
      if (st.isStack && st.kind === "flex") {
        html +=
          rowSelect("flex-direction", "Direction", st.direction, ["row", "column"]) +
          row("gap", "Gap", px(st.gap) || 0, "number") +
          rowSelect("align-items", "Align", st.align, ["stretch", "flex-start", "center", "flex-end", "baseline"]) +
          rowSelect("justify-content", "Justify", st.justify, ["normal", "flex-start", "center", "flex-end", "space-between"]);
      } else if (st.isStack) {
        html += row("gap", "Gap", px(st.gap) || 0, "number");
      } else {
        html += '<button class="dm-btn" id="dm-make-stack">Make auto-layout (flex)</button>';
      }
    } else if (state.mode === "select") {
      html += '<div class="dm-sel">Click an element to inspect it. Double-click text to edit it in place.</div>';
    } else if (state.mode === "comment") {
      html += '<div class="dm-sel">Click an element to pin a note on it — or <b>drag to draw a box</b> over a region. Either can carry a reference image.</div>';
    } else {
      html += '<div class="dm-sel">The app is interactive. Switch to Select or Comment to annotate.</div>';
    }

    html +=
      '<div class="dm-count">' + state.edits.length + " edits · " + state.comments.length + " comments</div>" +
      '<button class="dm-btn" id="dm-pencil">Import this screen to Pencil</button>' +
      '<button class="dm-btn primary" id="dm-copy">Copy for Claude</button>' +
      '<button class="dm-btn danger" id="dm-clear">Clear all</button>' +
      '<button class="dm-btn" id="dm-close">Close design mode</button>';

    panel.innerHTML = html;

    panel.querySelectorAll(".dm-modes button").forEach(function (b) {
      b.onclick = function () {
        state.mode = b.getAttribute("data-mode");
        if (state.mode !== "select") setSelected(null);
        hoverBox.style.display = "none";
        renderPanel();
      };
    });
    var on = function (id, fn) {
      var b = panel.querySelector(id);
      if (b) b.onclick = fn;
    };
    on("#dm-pencil", function () {
      state.importRequest = true;
      copyReport();
    });
    on("#dm-copy", copyReport);
    on("#dm-clear", function () {
      if (!confirm("Clear all design-mode edits and comments for this page?")) return;
      state.edits = [];
      state.comments = [];
      state.undo = [];
      persist();
      drawPins();
      renderPanel();
    });
    on("#dm-close", teardown);

    if (el) {
      panel.querySelectorAll("[data-prop]").forEach(function (input) {
        input.onchange = function () {
          applyEdit(el, input.getAttribute("data-prop"), normalise(input));
        };
      });
      var free = panel.querySelector("#dm-free");
      if (free)
        free.onkeydown = function (ev) {
          if (ev.key !== "Enter") return;
          var m = free.value.split(":");
          if (m.length < 2) return;
          applyEdit(el, m[0].trim(), m.slice(1).join(":").trim());
          free.value = "";
        };
      on("#dm-edit-text", function () {
        startTextEdit(el);
      });
      on("#dm-parent", function () {
        if (el.parentElement && el.parentElement !== document.body) setSelected(el.parentElement);
      });
      on("#dm-undo", undoLast);
      on("#dm-dupe", function () {
        duplicateEl(el);
      });
      on("#dm-del", function () {
        deleteEl(el);
      });
      on("#dm-make-stack", function () {
        makeStack(el);
      });
    }
  }

  function row(prop, label, value, type) {
    return (
      '<div class="dm-row"><label>' + label + '</label><input type="' + type +
      '" data-prop="' + prop + '" value="' + esc(value) + '"></div>'
    );
  }
  function rowSelect(prop, label, value, options) {
    var v = String(value);
    if (options.indexOf(v) === -1) options = [v].concat(options);
    return (
      '<div class="dm-row"><label>' + label + '</label><select data-prop="' + prop + '">' +
      options
        .map(function (o) {
          return "<option " + (o === v ? "selected" : "") + ">" + o + "</option>";
        })
        .join("") +
      "</select></div>"
    );
  }
  function px(v) {
    var n = parseFloat(v);
    return isNaN(n) ? "" : Math.round(n * 100) / 100;
  }
  function normalise(input) {
    if (input.type === "number") return input.value + "px";
    return input.value;
  }
  function rgbToHex(rgb) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb || "");
    if (!m) return "#000000";
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map(function (n) {
          return ("0" + Number(n).toString(16)).slice(-2);
        })
        .join("")
    );
  }

  /* ---------------- edit primitives (all undoable, all logged) ---------------- */

  function logEntry(entry) {
    var existing =
      entry.prop !== "duplicate" &&
      entry.prop !== "delete" &&
      state.edits.find(function (e) {
        return e.sel === entry.sel && e.prop === entry.prop;
      });
    if (existing) {
      entry.from = existing.from;
      Object.assign(existing, entry);
      persist();
      return existing;
    }
    state.edits.push(entry);
    persist();
    return entry;
  }

  function applyEdit(el, prop, value) {
    var prevInline = el.style.getPropertyValue(prop);
    var from = getComputedStyle(el).getPropertyValue(prop).trim();
    el.style.setProperty(prop, value, "important");
    var ref = logEntry({
      sel: cssPath(el),
      label: labelOf(el),
      prop: prop,
      from: from,
      to: value,
      ds: dsOf(el) || undefined,
    });
    state.undo.push({
      logRef: ref,
      revert: function () {
        if (prevInline) el.style.setProperty(prop, prevInline);
        else el.style.removeProperty(prop);
      },
    });
    positionBox(selBox, el);
    renderPanel();
  }

  function deleteEl(el) {
    var prevInline = el.style.getPropertyValue("display");
    var ref = logEntry({
      sel: cssPath(el),
      label: labelOf(el),
      prop: "delete",
      from: "present",
      to: "removed",
      ds: dsOf(el) || undefined,
    });
    el.style.setProperty("display", "none", "important");
    state.undo.push({
      logRef: ref,
      revert: function () {
        if (prevInline) el.style.setProperty("display", prevInline);
        else el.style.removeProperty("display");
      },
    });
    setSelected(null);
    toast("Deleted (hidden) — Undo restores it");
  }

  function duplicateEl(el) {
    var clone = el.cloneNode(true);
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(function (n) {
      n.removeAttribute("id");
    });
    clone.setAttribute("data-dm-clone", "1");
    el.after(clone);
    var ref = logEntry({
      sel: cssPath(el),
      label: labelOf(el),
      prop: "duplicate",
      from: "×1",
      to: "×2 (static copy after the original)",
      ds: dsOf(el) || undefined,
    });
    state.undo.push({
      logRef: ref,
      revert: function () {
        clone.remove();
      },
    });
    renderPanel();
    toast("Duplicated — the copy is static (its buttons are inert)");
  }

  function makeStack(el) {
    applyEdit(el, "display", "flex");
    applyEdit(el, "flex-direction", "column");
    applyEdit(el, "gap", "8px");
    toast("Now a flex stack — direction, gap, align in the panel");
  }

  function undoLast() {
    var u = state.undo.pop();
    if (!u) return;
    u.revert();
    var i = state.edits.indexOf(u.logRef);
    if (i !== -1) state.edits.splice(i, 1);
    persist();
    if (state.selected) positionBox(selBox, state.selected);
    renderPanel();
  }

  function startTextEdit(el) {
    var before = el.textContent;
    el.setAttribute("contenteditable", "plaintext-only");
    el.focus();
    var done = function () {
      el.removeAttribute("contenteditable");
      el.removeEventListener("blur", done);
      if (el.textContent !== before) {
        logEntry({
          sel: cssPath(el),
          label: labelOf(el),
          prop: "text",
          from: before.trim().replace(/\s+/g, " ").slice(0, 120),
          to: el.textContent.trim().replace(/\s+/g, " ").slice(0, 120),
          ds: dsOf(el) || undefined,
        });
        renderPanel();
      }
    };
    el.addEventListener("blur", done);
  }

  /* ---------------- selection + hover + box drawing ---------------- */

  function positionBox(box, el) {
    if (!el || !document.contains(el)) {
      box.style.display = "none";
      return;
    }
    var r = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = r.left + scrollX - 2 + "px";
    box.style.top = r.top + scrollY - 2 + "px";
    box.style.width = r.width + 2 + "px";
    box.style.height = r.height + 2 + "px";
  }

  function setSelected(el) {
    state.selected = el;
    positionBox(selBox, el);
    renderPanel();
  }

  function inTool(t) {
    return root.contains(t);
  }

  function onMove(ev) {
    if (state.mode === "browse" || inTool(ev.target)) {
      hoverBox.style.display = "none";
      return;
    }
    positionBox(hoverBox, ev.target);
  }

  var drag = null; // {x, y, moved}
  var suppressClick = false;

  function onDown(ev) {
    if (state.mode !== "comment" || inTool(ev.target)) return;
    drag = { x: ev.pageX, y: ev.pageY, moved: false };
  }
  function onDragMove(ev) {
    if (!drag) return;
    if (Math.abs(ev.pageX - drag.x) + Math.abs(ev.pageY - drag.y) > 6) drag.moved = true;
    if (!drag.moved) return;
    var x = Math.min(drag.x, ev.pageX);
    var y = Math.min(drag.y, ev.pageY);
    marquee.style.display = "block";
    marquee.style.left = x + "px";
    marquee.style.top = y + "px";
    marquee.style.width = Math.abs(ev.pageX - drag.x) + "px";
    marquee.style.height = Math.abs(ev.pageY - drag.y) + "px";
  }
  function onUp(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    marquee.style.display = "none";
    if (!d.moved) return; // plain click → the click handler pins on the element
    suppressClick = true;
    var rect = {
      x: Math.round(Math.min(d.x, ev.pageX)),
      y: Math.round(Math.min(d.y, ev.pageY)),
      w: Math.round(Math.abs(ev.pageX - d.x)),
      h: Math.round(Math.abs(ev.pageY - d.y)),
    };
    if (rect.w < 8 || rect.h < 8) return;
    openNote(null, rect);
  }

  function onClick(ev) {
    if (inTool(ev.target) || state.mode === "browse") return;
    if (ev.target.isContentEditable) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (state.mode === "select") setSelected(ev.target);
    else if (state.mode === "comment") openNote(ev.target, null);
  }

  function onDblClick(ev) {
    if (inTool(ev.target) || state.mode !== "select") return;
    ev.preventDefault();
    ev.stopPropagation();
    setSelected(ev.target);
    startTextEdit(ev.target);
  }

  function onKey(ev) {
    if (ev.key === "Escape") {
      var note = document.getElementById("__dm-note");
      if (note) note.remove();
      else if (state.selected) setSelected(null);
    }
  }

  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("mousemove", onDragMove, true);
  document.addEventListener("mouseup", onUp, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("dblclick", onDblClick, true);
  document.addEventListener("keydown", onKey, true);

  /* ---------------- comments (element pins + region boxes + images) ---------------- */

  function shrinkImage(file, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, 1280 / img.width);
      var c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      cb(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      cb(null);
    };
    img.src = url;
  }

  function openNote(el, rect) {
    var old = document.getElementById("__dm-note");
    if (old) old.remove();
    var left, top, label, sel;
    if (rect) {
      left = Math.min(rect.x, innerWidth + scrollX - 260);
      top = rect.y + rect.h + 6;
      var center = document.elementFromPoint(
        rect.x + rect.w / 2 - scrollX,
        rect.y + rect.h / 2 - scrollY
      );
      label = "region near " + (center ? labelOf(center) : "(empty)");
      sel = center ? cssPath(center) : "";
    } else {
      var r = el.getBoundingClientRect();
      left = Math.min(r.left + scrollX, innerWidth + scrollX - 260);
      top = r.bottom + scrollY + 6;
      label = labelOf(el);
      sel = cssPath(el);
    }
    var note = document.createElement("div");
    note.id = "__dm-note";
    note.style.left = left + "px";
    note.style.top = top + "px";
    note.innerHTML =
      '<div class="dm-sel">' + esc(rect ? "▭ " + rect.w + "×" + rect.h + " region — " + label : label) + "</div>" +
      "<textarea placeholder=\"What should change here?\"></textarea>" +
      '<input type="file" accept="image/*" title="Attach a reference image">' +
      '<button class="dm-btn primary">Save comment</button>';
    root.appendChild(note);
    var ta = note.querySelector("textarea");
    ta.focus();
    var pendingImg = null;
    note.querySelector("input[type=file]").onchange = function (ev2) {
      var f = ev2.target.files && ev2.target.files[0];
      if (!f) return;
      shrinkImage(f, function (dataUrl) {
        pendingImg = dataUrl;
        if (dataUrl) {
          var prev = document.createElement("img");
          prev.src = dataUrl;
          note.insertBefore(prev, note.querySelector("button"));
        }
      });
    };
    note.querySelector("button").onclick = function () {
      var text = ta.value.trim();
      if (text || pendingImg) {
        state.comments.push({
          n: state.comments.length + 1,
          kind: rect ? "box" : "el",
          sel: sel,
          label: label,
          text: text || "(see reference image)",
          rect: rect || undefined,
          img: pendingImg || undefined,
        });
        persist();
        drawPins();
        renderPanel();
      }
      note.remove();
    };
  }

  function drawPins() {
    state.pins.forEach(function (p) {
      p.remove();
    });
    state.pins = [];
    state.comments.forEach(function (c) {
      var px2, py;
      if (c.kind === "box" && c.rect) {
        var boxEl = document.createElement("div");
        boxEl.className = "dm-boxpin";
        boxEl.style.left = c.rect.x + "px";
        boxEl.style.top = c.rect.y + "px";
        boxEl.style.width = c.rect.w + "px";
        boxEl.style.height = c.rect.h + "px";
        root.appendChild(boxEl);
        state.pins.push(boxEl);
        px2 = c.rect.x + c.rect.w - 10;
        py = c.rect.y - 10;
      } else {
        var el = null;
        try {
          el = document.querySelector(c.sel);
        } catch (e) {}
        if (!el) return;
        var r = el.getBoundingClientRect();
        px2 = r.right + scrollX - 10;
        py = r.top + scrollY - 10;
      }
      var pin = document.createElement("div");
      pin.className = "dm-pin";
      pin.textContent = c.n;
      pin.title = c.text;
      pin.style.left = px2 + "px";
      pin.style.top = py + "px";
      root.appendChild(pin);
      state.pins.push(pin);
    });
  }

  var repositionScheduled = false;
  function reposition() {
    if (repositionScheduled) return;
    repositionScheduled = true;
    requestAnimationFrame(function () {
      repositionScheduled = false;
      drawPins();
      if (state.selected) positionBox(selBox, state.selected);
    });
  }
  addEventListener("scroll", reposition, true);
  addEventListener("resize", reposition);

  /* ---------------- report ---------------- */

  function buildReport() {
    var lines = [
      "DESIGN MODE REPORT",
      "page: " + location.pathname + " · viewport: " + innerWidth + "×" + innerHeight,
      "time: " + new Date().toLocaleString(),
      "",
    ];
    if (state.importRequest) {
      lines.push("IMPORT TO PENCIL: " + location.pathname, "");
    }
    if (state.edits.length) {
      lines.push("EDITS (" + state.edits.length + ")");
      state.edits.forEach(function (e) {
        lines.push(
          "- [" + e.prop + "]" + (e.ds ? " {ds:" + e.ds + "}" : "") + " " + e.label +
            " — " + e.from + " → " + e.to + "\n  at: " + e.sel
        );
      });
      lines.push("");
    }
    if (state.comments.length) {
      lines.push("COMMENTS (" + state.comments.length + ")");
      state.comments.forEach(function (c) {
        var head =
          c.kind === "box" && c.rect
            ? "[box " + c.rect.w + "×" + c.rect.h + " at " + c.rect.x + "," + c.rect.y + "] " + c.label
            : c.label;
        lines.push("- (" + c.n + ") " + head + ": " + c.text + "\n  at: " + c.sel);
        if (c.img) lines.push("  reference image: dm-ref-" + c.n + ".jpg (downloaded — attach it in chat)");
      });
    }
    if (!state.edits.length && !state.comments.length) lines.push("(nothing recorded)");
    return lines.join("\n");
  }
  window.__dmReport = buildReport;
  window.__dmImages = function () {
    return state.comments
      .filter(function (c) {
        return c.img;
      })
      .map(function (c) {
        return { n: c.n, img: c.img };
      });
  };

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "dm-toast";
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 2200);
  }

  function copyReport() {
    var text = buildReport();
    var withImgs = window.__dmImages();
    withImgs.forEach(function (item) {
      var a = document.createElement("a");
      a.href = item.img;
      a.download = "dm-ref-" + item.n + ".jpg";
      a.click();
    });
    var done = function () {
      toast(
        withImgs.length
          ? "Report copied + " + withImgs.length + " image(s) downloaded — attach them in chat"
          : "Report copied — paste it to Claude"
      );
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        prompt("Copy the report:", text);
      });
    } else {
      prompt("Copy the report:", text);
    }
  }

  /* ---------------- teardown + init ---------------- */

  function teardown() {
    document.removeEventListener("mousemove", onMove, true);
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("mousemove", onDragMove, true);
    document.removeEventListener("mouseup", onUp, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("dblclick", onDblClick, true);
    document.removeEventListener("keydown", onKey, true);
    removeEventListener("scroll", reposition, true);
    removeEventListener("resize", reposition);
    root.remove();
    try {
      sessionStorage.removeItem("designMode");
    } catch (e) {}
    window.__dmActive = false;
    window.__dmTeardown = null;
  }
  window.__dmTeardown = teardown;

  // Re-apply persisted style edits so an annotation session survives reloads.
  state.edits.forEach(function (e) {
    if (e.prop === "text" || e.prop === "delete" || e.prop === "duplicate") return;
    var el = null;
    try {
      el = document.querySelector(e.sel);
    } catch (err) {}
    if (el) el.style.setProperty(e.prop, e.to, "important");
  });

  drawPins();
  renderPanel();
  toast("Design mode on — Select · tweak · Comment · Copy for Claude");
})();
