/*! THE REEL — static cart (localStorage). Checkout parked. */
(function () {
  "use strict";

  var STORAGE_KEY = "the-reel-cart";
  var CATALOG = {
    "36-exposures": { slug: "36-exposures", name: "36 Exposures" },
    focused: { slug: "focused", name: "Focused" },
    "against-the-grain": {
      slug: "against-the-grain",
      name: "Against The Grain",
    },
  };

  function readCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (line) {
          return (
            line &&
            typeof line.slug === "string" &&
            CATALOG[line.slug] &&
            typeof line.qty === "number" &&
            line.qty > 0
          );
        })
        .map(function (line) {
          return {
            slug: line.slug,
            name: CATALOG[line.slug].name,
            qty: Math.floor(line.qty),
          };
        });
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent("reel-cart-change"));
  }

  function addItem(slug, qty) {
    var meta = CATALOG[slug];
    if (!meta) return readCart();
    var n = Math.max(1, Math.floor(qty || 1));
    var items = readCart();
    var found = false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].slug === slug) {
        items[i].qty += n;
        found = true;
        break;
      }
    }
    if (!found) {
      items.push({ slug: meta.slug, name: meta.name, qty: n });
    }
    writeCart(items);
    return items;
  }

  function removeItem(slug) {
    writeCart(
      readCart().filter(function (line) {
        return line.slug !== slug;
      })
    );
  }

  function setQty(slug, qty) {
    var n = Math.floor(qty);
    if (n <= 0) {
      removeItem(slug);
      return;
    }
    var items = readCart();
    for (var i = 0; i < items.length; i++) {
      if (items[i].slug === slug) {
        items[i].qty = n;
        writeCart(items);
        return;
      }
    }
  }

  function clearCart() {
    writeCart([]);
  }

  function totalCount(items) {
    return (items || readCart()).reduce(function (sum, line) {
      return sum + line.qty;
    }, 0);
  }

  function ensureStyles() {
    if (document.getElementById("tr-cart-styles")) return;
    var style = document.createElement("style");
    style.id = "tr-cart-styles";
    style.textContent = [
      ".tr-cart{max-width:720px;margin:0 auto;}",
      ".tr-cart-lines{list-style:none;margin:0;padding:0;border:1.5px solid var(--v2p-ink,#14130f);}",
      ".tr-cart-line{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:12px 24px;padding:18px 20px;border-bottom:1px solid rgba(20,19,15,.28);}",
      ".tr-cart-line:last-child{border-bottom:0;}",
      ".tr-cart-name{font-family:var(--v2-poster,Impact,sans-serif);font-size:22px;letter-spacing:.03em;text-transform:uppercase;}",
      ".tr-cart-meta{display:flex;align-items:center;gap:16px;font-family:var(--v2-code,'Helvetica Neue',Arial,sans-serif);font-size:13px;letter-spacing:.14em;text-transform:uppercase;}",
      ".tr-cart-qty{font-weight:700;}",
      ".tr-cart-stepper{display:inline-flex;align-items:center;gap:0;border:1.5px solid var(--v2p-ink,#14130f);}",
      ".tr-cart-step{min-width:40px;min-height:40px;padding:0 10px;background:transparent;border:0;cursor:pointer;font:inherit;font-weight:700;letter-spacing:.08em;color:inherit;}",
      ".tr-cart-step:hover{background:rgba(20,19,15,.06);}",
      ".tr-cart-step:focus-visible{outline:2px solid var(--v2p-ink,#14130f);outline-offset:2px;}",
      ".tr-cart-qty-input{width:3.2rem;min-height:40px;border:0;border-left:1.5px solid var(--v2p-ink,#14130f);border-right:1.5px solid var(--v2p-ink,#14130f);background:transparent;text-align:center;font:inherit;font-weight:700;letter-spacing:.08em;color:inherit;-moz-appearance:textfield;}",
      ".tr-cart-qty-input::-webkit-outer-spin-button,.tr-cart-qty-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}",
      ".tr-cart-remove{background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px;letter-spacing:.14em;text-transform:uppercase;font:inherit;color:inherit;}",
      ".tr-cart-actions{display:flex;flex-wrap:wrap;gap:12px 18px;align-items:center;margin-top:22px;}",
      ".tr-cart-clear,.tr-cart-checkout{min-height:48px;padding:0 22px;letter-spacing:.18em;text-transform:uppercase;font-family:var(--v2-code,'Helvetica Neue',Arial,sans-serif);font-size:13px;font-weight:700;cursor:pointer;}",
      ".tr-cart-clear{background:transparent;border:1.5px solid var(--v2p-ink,#14130f);color:var(--v2p-ink,#14130f);}",
      ".tr-cart-checkout{background:#0d0d0a;border:1.5px solid #0d0d0a;color:var(--v2p-cream,#efe8d8);opacity:.55;cursor:not-allowed;}",
      ".tr-cart-note{margin:14px 0 0;font-size:14px;line-height:1.5;opacity:.85;}",
      ".tr-cart-back{display:inline-block;margin-top:22px;letter-spacing:.16em;text-transform:uppercase;text-underline-offset:4px;font-size:13px;}",
      ".tr-cart-count{font-variant-numeric:tabular-nums;}",
    ].join("");
    document.head.appendChild(style);
  }

  function productsHref() {
    var path = location.pathname || "";
    if (path.indexOf("/v2/cart") !== -1) return "../../index.html";
    if (path.indexOf("/v2/") !== -1) return "../../index.html";
    return "index.html";
  }

  function renderCartPage() {
    var main = document.querySelector("main.v2p-body");
    if (!main) return;
    // Only treat as cart page when plate or empty state present
    var plate = document.querySelector("h2.v2p-plate");
    var isCart =
      (plate && /cart/i.test(plate.textContent || "")) ||
      !!main.querySelector(".v2p-empty") ||
      !!main.querySelector(".tr-cart");
    if (!isCart) return;

    ensureStyles();
    var items = readCart();

    if (!items.length) {
      main.innerHTML =
        '<div class="v2p-empty"><p>No rolls loaded.</p>' +
        '<a href="' +
        productsHref() +
        '">Back to products</a></div>';
      return;
    }

    var lines = items
      .map(function (line) {
        return (
          '<li class="tr-cart-line" data-slug="' +
          line.slug +
          '">' +
          '<span class="tr-cart-name">' +
          escapeHtml(line.name) +
          "</span>" +
          '<span class="tr-cart-meta">' +
          '<span class="tr-cart-stepper" role="group" aria-label="Quantity for ' +
          escapeHtml(line.name) +
          '">' +
          '<button type="button" class="tr-cart-step" data-qty-delta="-1" data-slug="' +
          line.slug +
          '" aria-label="Decrease quantity">−</button>' +
          '<input class="tr-cart-qty-input" type="number" min="1" step="1" inputmode="numeric" value="' +
          line.qty +
          '" data-slug="' +
          line.slug +
          '" aria-label="Quantity">' +
          '<button type="button" class="tr-cart-step" data-qty-delta="1" data-slug="' +
          line.slug +
          '" aria-label="Increase quantity">+</button>' +
          "</span>" +
          '<button type="button" class="tr-cart-remove" data-remove="' +
          line.slug +
          '">Remove</button>' +
          "</span></li>"
        );
      })
      .join("");

    main.innerHTML =
      '<div class="tr-cart">' +
      '<ul class="tr-cart-lines">' +
      lines +
      "</ul>" +
      '<div class="tr-cart-actions">' +
      '<button type="button" class="tr-cart-clear">Clear cart</button>' +
      '<button type="button" class="tr-cart-checkout" disabled aria-disabled="true">Checkout — parked</button>' +
      "</div>" +
      '<p class="tr-cart-note">Checkout is parked — no payment on this static mirror.</p>' +
      '<a class="tr-cart-back" href="' +
      productsHref() +
      '">Back to products</a>' +
      "</div>";

    main.querySelectorAll("[data-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeItem(btn.getAttribute("data-remove"));
        renderCartPage();
        updateNavCounts();
      });
    });
    main.querySelectorAll("[data-qty-delta]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var slug = btn.getAttribute("data-slug");
        var delta = parseInt(btn.getAttribute("data-qty-delta"), 10) || 0;
        var items = readCart();
        var cur = 0;
        for (var i = 0; i < items.length; i++) {
          if (items[i].slug === slug) {
            cur = items[i].qty;
            break;
          }
        }
        setQty(slug, cur + delta);
        renderCartPage();
        updateNavCounts();
      });
    });
    main.querySelectorAll(".tr-cart-qty-input").forEach(function (input) {
      function apply() {
        var slug = input.getAttribute("data-slug");
        var n = parseInt(input.value, 10);
        if (!isFinite(n) || n < 1) n = 1;
        setQty(slug, n);
        renderCartPage();
        updateNavCounts();
      }
      input.addEventListener("change", apply);
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          apply();
        }
      });
    });
    var clearBtn = main.querySelector(".tr-cart-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        clearCart();
        renderCartPage();
        updateNavCounts();
      });
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function updateNavCounts() {
    var count = totalCount();
    var links = document.querySelectorAll('a[href*="cart"]');
    links.forEach(function (a) {
      var label = (a.getAttribute("aria-label") || "").toLowerCase();
      var text = (a.textContent || "").trim();
      // Only rewrite primary Cart nav labels, not "Load a roll" / other links
      var isCartNav =
        /^cart(\s*[·•(].*)?$/i.test(text) ||
        label === "cart" ||
        (a.getAttribute("aria-current") === "page" && /cart/i.test(text));
      if (!isCartNav && !/^cart/i.test(text)) return;
      if (/load/i.test(text)) return;
      if (count > 0) {
        a.innerHTML = 'Cart <span class="tr-cart-count">(' + count + ")</span>";
      } else {
        a.textContent = "Cart";
      }
    });
  }

  function consumeAddQuery() {
    try {
      var params = new URLSearchParams(location.search || "");
      var add = params.get("add");
      if (!add) return false;
      if (CATALOG[add]) {
        addItem(add, 1);
      }
      params.delete("add");
      var next = location.pathname + (params.toString() ? "?" + params.toString() : "") + (location.hash || "");
      if (history && history.replaceState) {
        history.replaceState(null, "", next);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function interceptLoadClicks() {
    document.addEventListener(
      "click",
      function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest("a") : null;
        if (!a) return;
        var href = a.getAttribute("href") || "";
        var m = href.match(/[?&]add=([a-z0-9-]+)/i);
        if (!m) return;
        // Let normal navigation proceed; cart page consumes ?add=
        // Also stash immediately so count updates if SPA-like stay
        var slug = m[1];
        if (CATALOG[slug]) {
          // If modifier keys / new tab, still fine — cart page will add.
          // For same-tab navigation we rely on ?add=; no preventDefault.
        }
      },
      false
    );
  }

  function boot() {
    ensureStyles();
    consumeAddQuery();
    renderCartPage();
    updateNavCounts();
    interceptLoadClicks();
    document.addEventListener("reel-cart-change", function () {
      updateNavCounts();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Expose for debugging / future hooks
  window.TheReelCart = {
    read: readCart,
    add: addItem,
    remove: removeItem,
    clear: clearCart,
    setQty: setQty,
    count: totalCount,
    catalog: CATALOG,
  };
})();
