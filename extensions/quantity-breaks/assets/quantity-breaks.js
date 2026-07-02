(function () {

  // --- Add to cart -------------------------------------------------------
  // The widget owns no button; instead it intercepts the theme's Add to cart
  // and performs the add itself with the selected tier's quantity (and, later,
  // the chosen variants), then opens/refreshes the theme's cart drawer.

  function cartRoot() {
    return (
      (window.Shopify &&
        window.Shopify.routes &&
        window.Shopify.routes.root) ||
      "/"
    );
  }

  function findProductForm() {
    // The REAL add-to-cart form is the one containing the Add button. Other
    // forms also post to /cart/add — notably the Shop Pay installments form
    // (id/class contains "installment") which has no Add button — so prefer the
    // form that owns an [name="add"] control.
    var addBtn = document.querySelector(
      'form[action*="/cart/add"] [name="add"], product-form [name="add"]',
    );
    if (addBtn && addBtn.closest("form")) return addBtn.closest("form");

    var forms = Array.prototype.slice.call(
      document.querySelectorAll('form[action*="/cart/add"]'),
    );
    var real = forms.filter(function (f) {
      return !/installment/i.test((f.id || "") + " " + (f.className || ""));
    });
    if (real.length) return real[0];

    var pf = document.querySelector("product-form form");
    return pf || forms[0] || null;
  }

  // Cart-related section ids present on the page, for the Section Rendering API.
  function cartSectionIds() {
    var ids = {};
    document
      .querySelectorAll('[id^="shopify-section-"]')
      .forEach(function (el) {
        var id = el.id.slice("shopify-section-".length);
        if (/cart|header/i.test(id)) ids[id] = true;
      });
    [
      "cart-drawer",
      "cart-icon-bubble",
      "cart-notification",
      "cart-live-region-text",
      "header",
    ].forEach(function (id) {
      if (document.getElementById("shopify-section-" + id)) ids[id] = true;
    });
    return Object.keys(ids);
  }

  // The exact section ids the theme's drawer re-renders (Dawn/OS 2.0 expose
  // getSectionsToRender()); fall back to a DOM scan for other themes.
  function drawerSectionIds() {
    var el = document.querySelector("cart-drawer, cart-notification");
    if (el && typeof el.getSectionsToRender === "function") {
      try {
        var ids = el
          .getSectionsToRender()
          .map(function (s) {
            return s && s.id;
          })
          .filter(Boolean);
        if (ids.length) return ids;
      } catch (e) {
        /* fall through */
      }
    }
    return cartSectionIds();
  }

  // Generic fallback: replace each returned section's HTML in place with the
  // fresh markup cart/add.js returns (the theme's own drawer/bubble HTML).
  function renderSections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      var el = document.getElementById("shopify-section-" + id);
      if (el && typeof sections[id] === "string") el.innerHTML = sections[id];
    });
  }

  // When the cart was empty before the add, themes leave an "empty" marker that
  // hides the freshly-rendered items. Strip the common ones so they show.
  function unmarkEmpty() {
    var roots = document.querySelectorAll(
      "cart-drawer, cart-notification, #CartDrawer, .cart-drawer," +
        " .drawer--cart, [data-cart-drawer], #CartDrawer-CartItems",
    );
    var EMPTY = [
      "is-empty",
      "cart--empty",
      "cart-empty",
      "drawer--empty",
      "is-cart-empty",
    ];
    Array.prototype.forEach.call(roots, function (root) {
      EMPTY.forEach(function (c) {
        root.classList.remove(c);
        Array.prototype.forEach.call(
          root.querySelectorAll("." + c),
          function (n) {
            n.classList.remove(c);
          },
        );
      });
    });
  }

  // Open the theme's cart drawer via the mechanisms themes use, in order.
  function openThemeDrawer() {
    var drawer = document.querySelector(
      "cart-drawer, cart-notification, #CartDrawer, .cart-drawer," +
        " .drawer--cart, [data-cart-drawer]",
    );
    if (drawer && typeof drawer.open === "function") {
      try {
        drawer.open();
        return true;
      } catch (e) {
        /* fall through */
      }
    }
    var trigger = document.querySelector(
      "#cart-icon-bubble, .js-drawer-open-cart, [data-drawer-toggle='cart']," +
        " [aria-controls='CartDrawer'], [aria-controls='cart-drawer']," +
        " [data-cart-drawer-toggle], .header__icon--cart, a.cart-link",
    );
    if (trigger) {
      trigger.click();
      return true;
    }
    if (drawer) {
      drawer.classList.add("active", "is-open", "open", "drawer--is-open");
      drawer.setAttribute("open", "");
      document.documentElement.classList.add("js-drawer-open");
      document.body.classList.add("js-drawer-open", "drawer-open", "cart-open");
      return true;
    }
    return false;
  }

  function openDrawerWithEvents() {
    ["cart:refresh", "cart:open", "cart-drawer:open", "cart:build"].forEach(
      function (name) {
        document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
      },
    );
    return openThemeDrawer();
  }

  // Refresh + open the theme's cart after an add.
  function afterAdd(json) {
    // 1) Prefer the theme's own renderContents() (Dawn/OS 2.0) — it swaps the
    //    cart HTML from json.sections AND opens the drawer.
    var native = document.querySelector("cart-drawer, cart-notification");
    if (native && typeof native.renderContents === "function") {
      try {
        native.renderContents(json);
        unmarkEmpty();
        if (typeof native.open === "function") {
          try {
            native.open();
          } catch (e) {
            /* renderContents already opened it */
          }
        }
        return;
      } catch (e) {
        /* fall through to the generic path */
      }
    }
    // 2) Generic: inject the returned section HTML ourselves, then open.
    renderSections(json && json.sections);
    unmarkEmpty();
    if (openDrawerWithEvents()) return;
    // 3) No drawer at all — go to the cart page.
    window.location.href = cartRoot() + "cart";
  }

  function addToCart(items) {
    var body = { items: items };
    var ids = drawerSectionIds();
    if (ids.length) {
      body.sections = ids.join(",");
      body.sections_url = window.location.pathname;
    }
    return fetch(cartRoot() + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("add failed");
        return res.json();
      })
      .then(function (json) {
        afterAdd(json);
      })
      .catch(function () {
        /* swallow: leave the page as-is */
      });
  }

  // Intercept the theme's Add to cart so we control the line items. `getItems`
  // returns the items to add for the current selection, or null to let the
  // theme handle the add normally. Bound once per form.
  function bindAddGuard(getItems) {
    var form = findProductForm();
    if (!form || form.__qbGuard) return;
    form.__qbGuard = true;
    function handler(e) {
      var items = getItems();
      if (!items || !items.length) return; // nothing selected → theme handles it
      e.preventDefault();
      e.stopImmediatePropagation();
      addToCart(items);
    }
    form.addEventListener("submit", handler, true);
    Array.prototype.forEach.call(
      form.querySelectorAll('[type="submit"], [name="add"]'),
      function (btn) {
        btn.addEventListener("click", handler, true);
      },
    );
  }

  function parseVariants(widget) {
    var el = widget.querySelector("[data-qb-variants]");
    if (!el) return [];
    try {
      return JSON.parse(el.textContent) || [];
    } catch (e) {
      return [];
    }
  }

  // Resolve the variant id chosen for a given item (#unit) in a tier panel,
  // by matching its selected option values against the variant list.
  function variantIdForUnit(panel, unit, variants) {
    if (!panel || !variants.length) return null;
    var selected = [];
    var holders = panel.querySelectorAll(
      '[data-qb-unit="' + unit + '"][data-qb-option-position]',
    );
    Array.prototype.forEach.call(holders, function (h) {
      var pos = parseInt(h.getAttribute("data-qb-option-position"), 10);
      if (!pos) return;
      var val = null;
      if (h.tagName === "SELECT") {
        val = h.value;
      } else {
        var sel = h.querySelector(".qb-swatch--selected");
        val = sel ? sel.getAttribute("data-qb-value") : null;
      }
      selected[pos - 1] = val;
    });
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      if (!v.options || v.options.length !== selected.length) continue;
      var match = true;
      for (var j = 0; j < selected.length; j++) {
        if (selected[j] != null && v.options[j] !== selected[j]) {
          match = false;
          break;
        }
      }
      if (match) return v.id;
    }
    return null;
  }

  // Color/button variant swatches (the dropdown picker type is a native
  // <select> and needs no JS). Each [data-qb-swatch-group] is single-select:
  // clicking a swatch selects it within its group, then runs `onChange`.
  function initSwatches(widget, onChange) {
    var groups = Array.prototype.slice.call(
      widget.querySelectorAll("[data-qb-swatch-group]"),
    );
    groups.forEach(function (group) {
      var swatches = Array.prototype.slice.call(
        group.querySelectorAll("[data-qb-swatch]"),
      );
      swatches.forEach(function (btn) {
        if (btn.classList.contains("qb-swatch--soldout")) return;
        btn.addEventListener("click", function () {
          swatches.forEach(function (b) {
            var on = b === btn;
            b.classList.toggle("qb-swatch--selected", on);
            b.setAttribute("aria-pressed", on ? "true" : "false");
          });
          if (typeof onChange === "function") onChange();
        });
      });
    });
  }

  // Live countdown timer. Supports a fixed evergreen duration (persisted per
  // visitor in localStorage), end-of-day in the visitor's local time, or a
  // fixed end date. The title's {{timer}} placeholder is replaced each second.
  function initCountdown(widget) {
    var el = widget.querySelector("[data-qb-countdown]");
    if (!el) return;

    var mode = el.getAttribute("data-qb-mode") || "FIXED";
    var minutes = parseInt(el.getAttribute("data-qb-minutes"), 10) || 15;
    var endAttr = el.getAttribute("data-qb-end") || "";
    var title = el.getAttribute("data-qb-title") || "";
    var storageKey =
      "qb_countdown_" +
      (widget.getAttribute("data-variant-id") || "qb") +
      "_" +
      minutes;

    function targetTime() {
      if (mode === "DATE" && endAttr) {
        var t = new Date(endAttr).getTime();
        return isNaN(t) ? null : t;
      }
      if (mode === "MIDNIGHT") {
        var d = new Date();
        d.setHours(24, 0, 0, 0); // next local midnight
        return d.getTime();
      }
      // FIXED: evergreen — persist an end time per visitor.
      var stored = 0;
      try {
        stored = parseInt(localStorage.getItem(storageKey) || "0", 10);
      } catch (e) {
        /* ignore */
      }
      var now = Date.now();
      if (!stored || stored < now) {
        stored = now + minutes * 60000;
        try {
          localStorage.setItem(storageKey, String(stored));
        } catch (e) {
          /* ignore */
        }
      }
      return stored;
    }

    var target = targetTime();

    function pad(n) {
      return n < 10 ? "0" + n : "" + n;
    }
    function fmt(ms) {
      if (ms < 0) ms = 0;
      var total = Math.floor(ms / 1000);
      var s = total % 60;
      var m = Math.floor(total / 60) % 60;
      var h = Math.floor(total / 3600) % 24;
      var days = Math.floor(total / 86400);
      if (days > 0) return days + "d " + pad(h) + ":" + pad(m) + ":" + pad(s);
      if (h > 0) return pad(h) + ":" + pad(m) + ":" + pad(s);
      return pad(m) + ":" + pad(s);
    }

    function render() {
      if (target == null) {
        el.textContent = title.replace(/\{\{\s*timer\s*\}\}/g, "");
        return;
      }
      var remaining = target - Date.now();
      if (remaining <= 0) {
        if (mode === "FIXED") {
          target = Date.now() + minutes * 60000;
          try {
            localStorage.setItem(storageKey, String(target));
          } catch (e) {
            /* ignore */
          }
          remaining = target - Date.now();
        } else {
          remaining = 0;
        }
      }
      el.textContent = title.replace(/\{\{\s*timer\s*\}\}/g, fmt(remaining));
    }

    render();
    setInterval(render, 1000);
  }

  function initWidget(widget) {
    if (widget.dataset.qbInit === "1") return;
    widget.dataset.qbInit = "1";

    // Reveal the widget. It renders hidden by default so that, when the app
    // embed is disabled (and therefore this script never loads), nothing shows.
    widget.style.display = "";

    var tiers = Array.prototype.slice.call(
      widget.querySelectorAll("[data-qb-tier]"),
    );

    var variants = parseVariants(widget);

    // Free gifts for the selected tier: every gift on that tier and on any
    // lower tier (granted "at/above" its quantity), one of each, deduped.
    function giftItems(selectedLabel) {
      var selQty = parseInt(selectedLabel.getAttribute("data-qty"), 10) || 0;
      var ids = {};
      tiers.forEach(function (t) {
        var tq = parseInt(t.getAttribute("data-qty"), 10) || 0;
        if (tq > selQty) return;
        (t.getAttribute("data-qb-gift-variants") || "")
          .split(",")
          .forEach(function (id) {
            id = id.trim();
            if (id) ids[id] = true;
          });
      });
      return Object.keys(ids).map(function (id) {
        return { id: Number(id), quantity: 1 };
      });
    }

    // The line items to add for the current selection (main product + gifts).
    //  • Per-item pickers on  → one line per item, using each item's chosen
    //    variant (identical variants are merged into one line with a count).
    //  • Pickers off           → a single line of the theme's current variant.
    function getItems() {
      var label = null;
      tiers.forEach(function (t) {
        if (t.classList.contains("qb-tier--selected")) label = t;
      });
      if (!label) return null;
      var radio = label.querySelector(".qb-radio");
      var qty = radio ? parseInt(radio.value, 10) || 1 : 1;

      var fallbackId = widget.getAttribute("data-variant-id");
      var wrap = label.closest(".qb-tier-wrap");
      var panel = wrap && wrap.querySelector("[data-qb-tier-variants]");

      var items = null;
      if (panel && variants.length) {
        // Resolve a variant per item, then merge identical ones.
        var counts = {};
        for (var u = 1; u <= qty; u++) {
          var vid = variantIdForUnit(panel, u, variants) || fallbackId;
          if (!vid) continue;
          counts[vid] = (counts[vid] || 0) + 1;
        }
        var picked = Object.keys(counts).map(function (id) {
          return { id: Number(id), quantity: counts[id] };
        });
        if (picked.length) items = picked;
      }

      if (!items) {
        // No per-item pickers: single line of the theme's current variant.
        var form = findProductForm();
        var idInput = form && form.querySelector('[name="id"]');
        var variantId = (idInput && idInput.value) || fallbackId;
        if (!variantId) return null;
        items = [{ id: Number(variantId), quantity: qty }];
      }

      return items.concat(giftItems(label));
    }

    function select(tier) {
      tiers.forEach(function (t) {
        var isTarget = t === tier;
        t.classList.toggle("qb-tier--selected", isTarget);
        var radio = t.querySelector(".qb-radio");
        if (radio) radio.checked = isTarget;

        // Show only the selected tier's per-unit variant pickers.
        var wrap = t.closest(".qb-tier-wrap");
        if (wrap) {
          wrap.classList.toggle("qb-tier-wrap--selected", isTarget);
          var panel = wrap.querySelector("[data-qb-tier-variants]");
          if (panel) panel.hidden = !isTarget;
        }
      });
    }

    tiers.forEach(function (tier) {
      tier.addEventListener("click", function () {
        select(tier);
      });
    });

    initSwatches(widget);
    initCountdown(widget);
    bindAddGuard(getItems);
  }

  function initAll() {
    // Marks the app as active. Theme-element overrides (hiding the native
    // variant picker) are scoped to this class, so they only apply when the app
    // embed is enabled — otherwise the theme is untouched.
    document.documentElement.classList.add("qb-app-enabled");
    document.querySelectorAll("[data-qb-widget]").forEach(initWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
