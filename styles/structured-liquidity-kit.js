/* ============================================================
   STRUCTURED LIQUIDITY — component KIT interactions
   ============================================================ */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    /* ---- switch / checkbox / radio / toggle (aria-checked|pressed) ---- */
    document.querySelectorAll("[data-toggle-aria]").forEach((el) => {
      const attr = el.getAttribute("data-toggle-aria"); // "checked" | "pressed"
      const key = "aria-" + attr;
      const flip = () => el.setAttribute(key, el.getAttribute(key) === "true" ? "false" : "true");
      el.addEventListener("click", flip);
      el.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); } });
    });

    /* ---- radio groups (single selection) ---- */
    document.querySelectorAll("[data-radio-group]").forEach((grp) => {
      grp.querySelectorAll(".sl-radio-item").forEach((item) => {
        item.addEventListener("click", () => {
          grp.querySelectorAll(".sl-radio-item").forEach((x) => x.setAttribute("aria-checked", "false"));
          item.setAttribute("aria-checked", "true");
        });
      });
    });

    /* ---- toggle group (single selection) ---- */
    document.querySelectorAll("[data-toggle-group]").forEach((grp) => {
      grp.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          grp.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
        });
      });
    });

    /* ---- tabs ---- */
    document.querySelectorAll(".sl-tabs").forEach((tabs) => {
      const btns = [...tabs.querySelectorAll(".tablist button")];
      const panels = [...tabs.querySelectorAll(".panel")];
      btns.forEach((b, i) => {
        b.addEventListener("click", () => {
          btns.forEach((x) => x.setAttribute("aria-selected", "false"));
          panels.forEach((p) => p.classList.remove("show"));
          b.setAttribute("aria-selected", "true");
          if (panels[i]) panels[i].classList.add("show");
        });
      });
    });

    /* ---- accordion ---- */
    document.querySelectorAll(".sl-acc-item .sl-acc-head").forEach((head) => {
      head.addEventListener("click", () => {
        const item = head.closest(".sl-acc-item");
        const body = item.querySelector(".sl-acc-body");
        const open = item.classList.toggle("open");
        body.style.maxHeight = open ? body.scrollHeight + "px" : "0px";
      });
    });

    /* ---- popovers / selects / dropdown menus / command ---- */
    function closeAllMenus(except) {
      document.querySelectorAll(".sl-menu.open").forEach((m) => {
        if (m === except) return;
        m.classList.remove("open");
        const trg = m.parentElement.querySelector("[aria-expanded]");
        if (trg) trg.setAttribute("aria-expanded", "false");
      });
    }
    document.querySelectorAll("[data-pop]").forEach((trigger) => {
      const wrap = trigger.closest(".sl-pop-wrap");
      const menu = wrap.querySelector(".sl-menu");
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains("open");
        closeAllMenus(isOpen ? null : menu);
        menu.classList.toggle("open", !isOpen);
        trigger.setAttribute("aria-expanded", String(!isOpen));
        if (!isOpen) { const s = menu.querySelector(".sl-cmd-search"); if (s) setTimeout(() => s.focus(), 30); }
      });
      // select-style: clicking an item updates the trigger label
      menu.querySelectorAll(".item[data-value]").forEach((it) => {
        it.addEventListener("click", () => {
          const lbl = trigger.querySelector("[data-select-label]");
          if (lbl) lbl.textContent = it.getAttribute("data-value");
          menu.querySelectorAll(".item").forEach((x) => x.classList.remove("active"));
          it.classList.add("active");
          menu.classList.remove("open");
          trigger.setAttribute("aria-expanded", "false");
        });
      });
    });
    document.addEventListener("click", () => closeAllMenus(null));

    /* ---- command palette filter ---- */
    document.querySelectorAll(".sl-cmd-search").forEach((input) => {
      const menu = input.closest(".sl-menu");
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        menu.querySelectorAll(".item").forEach((it) => {
          it.style.display = it.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      });
      input.addEventListener("click", (e) => e.stopPropagation());
    });

    /* ---- sliders ---- */
    document.querySelectorAll(".sl-slider").forEach((sl) => {
      const trk = sl.querySelector(".trk");
      const fl = sl.querySelector(".fl");
      const th = sl.querySelector(".th");
      let active = false;
      const set = (clientX) => {
        const r = trk.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        fl.style.width = p * 100 + "%";
        th.style.left = p * 100 + "%";
        const out = sl.parentElement.querySelector("[data-slider-out]");
        if (out) out.textContent = Math.round(p * 100);
      };
      trk.addEventListener("pointerdown", (e) => { active = true; trk.setPointerCapture(e.pointerId); set(e.clientX); });
      trk.addEventListener("pointermove", (e) => { if (active) set(e.clientX); });
      trk.addEventListener("pointerup", () => { active = false; });
    });

    /* ---- pagination ---- */
    document.querySelectorAll(".sl-page").forEach((pg) => {
      pg.querySelectorAll("button[data-page]").forEach((b) => {
        b.addEventListener("click", () => {
          pg.querySelectorAll("button").forEach((x) => x.classList.remove("cur"));
          b.classList.add("cur");
        });
      });
    });

    /* ---- calendar selection ---- */
    document.querySelectorAll(".sl-cal-grid").forEach((cal) => {
      cal.querySelectorAll(".day:not(.muted)").forEach((d) => {
        d.addEventListener("click", () => {
          cal.querySelectorAll(".day").forEach((x) => x.classList.remove("sel"));
          d.classList.add("sel");
        });
      });
    });

    /* ---- dialog / sheet open & close ---- */
    document.querySelectorAll("[data-open-overlay]").forEach((btn) => {
      const target = document.getElementById(btn.getAttribute("data-open-overlay"));
      if (target) btn.addEventListener("click", () => target.classList.add("open"));
    });
    document.querySelectorAll(".sl-overlay").forEach((ov) => {
      ov.addEventListener("click", (e) => { if (e.target === ov || e.target.hasAttribute("data-close-overlay")) ov.classList.remove("open"); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") document.querySelectorAll(".sl-overlay.open").forEach((o) => o.classList.remove("open"));
    });

    /* ---- toast — Sonner-style stacking deck ---- */
    const stack = document.getElementById("sl-toast-stack");
    if (stack) {
      const toasts = [];            // oldest → newest (front = last)
      const PEEK = 15;              // collapsed vertical peek per toast
      const SCALE_STEP = 0.055;     // collapsed scale reduction per depth
      const GAP = 12;               // expanded gap between toasts
      const MAX = 3;                // visible behind toasts when collapsed
      const LIFE = 4200;            // ms before auto-dismiss
      let expanded = false;

      function layout() {
        const n = toasts.length;
        for (let i = 0; i < n; i++) {
          const o = toasts[i];
          const depth = n - 1 - i;  // 0 = front
          o.el.style.zIndex = String(100 + i);
          if (expanded) {
            let y = 0;
            for (let j = i + 1; j < n; j++) y -= toasts[j].el.offsetHeight + GAP;
            o.el.style.setProperty("--y", y + "px");
            o.el.style.setProperty("--s", "1");
            o.el.style.opacity = "1";
          } else {
            o.el.style.setProperty("--y", -depth * PEEK + "px");
            o.el.style.setProperty("--s", String(Math.max(0, 1 - depth * SCALE_STEP)));
            o.el.style.opacity = depth >= MAX ? "0" : "1";
          }
        }
      }

      function dismiss(o) {
        if (o.removed) return;
        o.removed = true;
        clearTimeout(o.timer);
        o.el.classList.remove("show");   // slides back out via base transform
        o.el.style.opacity = "0";
        setTimeout(() => {
          o.el.remove();
          const idx = toasts.indexOf(o);
          if (idx > -1) toasts.splice(idx, 1);
          layout();
        }, 380);
      }

      function arm(o) {
        o.start = Date.now();
        o.timer = setTimeout(() => dismiss(o), o.remaining);
      }
      function pauseAll() {
        toasts.forEach((o) => {
          if (o.removed) return;
          clearTimeout(o.timer);
          o.remaining = Math.max(600, o.remaining - (Date.now() - o.start));
        });
      }
      function resumeAll() { toasts.forEach((o) => { if (!o.removed) arm(o); }); }

      stack.addEventListener("mouseenter", () => { expanded = true; pauseAll(); layout(); });
      stack.addEventListener("mouseleave", () => { expanded = false; resumeAll(); layout(); });

      function pushToast(title, desc) {
        const el = document.createElement("div");
        el.className = "sl-toast";
        el.innerHTML = '<div><p class="tt">' + title + '</p><p class="td">' + desc + "</p></div>";
        stack.appendChild(el);
        const o = { el, remaining: LIFE, removed: false };
        toasts.push(o);
        layout();
        requestAnimationFrame(() => { el.classList.add("show"); layout(); });
        if (expanded) { pauseAll(); } else { arm(o); }
      }

      document.querySelectorAll("[data-toast]").forEach((btn) => {
        btn.addEventListener("click", () => {
          pushToast(btn.getAttribute("data-toast-title") || "Saved",
                    btn.getAttribute("data-toast") || "Your changes are live.");
        });
      });
    }
  });
})();
