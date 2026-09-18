/*
 * THE REEL — cart for the static GitHub Pages mirror.
 *
 * The mirrored _next/ bundle is missing the app bootstrap chunk, so React never
 * hydrates on Pages and the cart that lives inside those chunks never runs. This
 * file owns the cart on its own. It stores the same shape the app stores
 * (localStorage key "reel-deo-cart", [{ slug, qty }]) so a cart carries over
 * unchanged if the full build is ever restored.
 *
 * It only adds behaviour: every class it renders already exists in the locked v2
 * stylesheet, and the header is left untouched apart from an optional count
 * appended to the Cart link.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'reel-deo-cart';
  var CHANGE_EVENT = 'reel-deo-cart';
  var MAX_QTY = 99;

  var PRODUCTS = [
    {
      slug: '36-exposures',
      name: '36 Exposures',
      plate: '36 EXPOSURES',
      notes: 'Warm leather, dark woods, black pepper',
      size: '2.5 OZ / 70 G'
    },
    {
      slug: 'focused',
      name: 'Focused',
      plate: 'FOCUSED',
      notes: 'Eucalyptus, mint, rosemary',
      size: '2.5 OZ / 70 G'
    },
    {
      slug: 'against-the-grain',
      name: 'Against The Grain',
      plate: 'AGAINST THE GRAIN',
      notes: 'Citrus, cedar, vetiver',
      size: '2.5 OZ / 70 G'
    }
  ];

  function findProduct(slug) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].slug === slug) return PRODUCTS[i];
    }
    return null;
  }

  /* ---------------------------------------------------------------- storage */

  function readCart() {
    var parsed;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    var lines = [];
    for (var i = 0; i < parsed.length; i++) {
      var line = parsed[i];
      if (!line || !findProduct(line.slug)) continue;
      var qty = Math.floor(Number(line.qty));
      if (!(qty > 0)) continue;
      lines.push({ slug: line.slug, qty: Math.min(qty, MAX_QTY) });
    }
    return lines;
  }

  function writeCart(lines) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (err) {
      /* Private-mode Safari and friends: keep the page working, drop the write. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function cartCount(lines) {
    return lines.reduce(function (total, line) {
      return total + line.qty;
    }, 0);
  }

  function addSlug(slug) {
    if (!findProduct(slug)) return;
    var lines = readCart();
    var found = false;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].slug === slug) {
        lines[i].qty = Math.min(lines[i].qty + 1, MAX_QTY);
        found = true;
        break;
      }
    }
    if (!found) lines.push({ slug: slug, qty: 1 });
    writeCart(lines);
  }

  function setQty(slug, qty) {
    var lines = readCart();
    if (qty < 1) {
      removeSlug(slug);
      return;
    }
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].slug === slug) lines[i].qty = Math.min(qty, MAX_QTY);
    }
    writeCart(lines);
  }

  function removeSlug(slug) {
    writeCart(
      readCart().filter(function (line) {
        return line.slug !== slug;
      })
    );
  }

  function clearCart() {
    writeCart([]);
  }

  /* ------------------------------------------------------------------- dom */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (name) {
        var value = attrs[name];
        if (value === null || value === false || value === undefined) return;
        if (name === 'text') node.textContent = value;
        else if (value === true) node.setAttribute(name, '');
        else node.setAttribute(name, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function injectStyles() {
    if (document.getElementById('reel-cart-styles')) return;
    var style = el('style', { id: 'reel-cart-styles' });
    style.textContent = [
      /* Count rides along inside the existing nav link, so header metrics hold. */
      '.reel-cart-count{margin-left:.32em;font-size:.82em;letter-spacing:.02em}',
      '.reel-cart-actions{display:flex;align-items:center;flex-wrap:wrap;gap:26px}',
      '.reel-cart-clear{margin-top:26px;margin-left:0;background:none;border:0;padding:0;color:inherit;font:inherit}',
      '.v2mnav-panel .reel-cart-count{margin-left:.28em;font-size:.7em}'
    ].join('');
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------- cart page */

  function isCartHref(href) {
    if (!href) return false;
    var path;
    try {
      path = new URL(href, window.location.href).pathname;
    } catch (err) {
      return false;
    }
    return /\/v2\/cart\/(index\.html)?$/.test(path);
  }

  function lineRow(line, product) {
    var qtyRow = el('div', { 'class': 'v2p-qty' }, [
      el('span', { text: 'Qty' }),
      el('button', {
        type: 'button',
        'class': 'v2p-step',
        'data-reel-qty': line.qty - 1,
        'data-reel-slug': product.slug,
        'aria-label': 'One fewer ' + product.name,
        disabled: line.qty <= 1
      }, [document.createTextNode('\u2212')]),
      el('span', { 'class': 'v2p-qty-val', text: String(line.qty) }),
      el('button', {
        type: 'button',
        'class': 'v2p-step',
        'data-reel-qty': line.qty + 1,
        'data-reel-slug': product.slug,
        'aria-label': 'One more ' + product.name
      }, [document.createTextNode('+')]),
      el('button', {
        type: 'button',
        'class': 'v2p-remove',
        'data-reel-remove': product.slug,
        text: 'Remove'
      })
    ]);

    return el('div', { 'class': 'v2p-line' }, [
      el('div', null, [
        el('p', { 'class': 'v2p-line-name', text: product.plate || product.name }),
        el('p', { 'class': 'v2p-line-notes', text: product.notes }),
        el('p', { 'class': 'v2p-line-size', text: product.size })
      ]),
      qtyRow
    ]);
  }

  function totalsTable(rolls) {
    return el('table', { 'class': 'v2p-table v2p-total' }, [
      el('tbody', null, [
        el('tr', null, [
          el('th', { scope: 'row', text: 'Rolls loaded' }),
          el('td', { text: String(rolls) })
        ]),
        el('tr', null, [
          el('th', { scope: 'row', text: 'Weight' }),
          el('td', { text: (2.5 * rolls).toFixed(1) + ' oz / ' + 70 * rolls + ' g' })
        ])
      ])
    ]);
  }

  function emptyState(productsHref) {
    return el('div', { 'class': 'v2p-empty' }, [
      el('p', { text: 'No rolls loaded.' }),
      el('a', { href: productsHref, text: 'Back to products' })
    ]);
  }

  function renderCart(mount, productsHref) {
    var lines = readCart();

    var next = document.createDocumentFragment();

    if (lines.length === 0) {
      next.appendChild(emptyState(productsHref));
    } else {
      var linesWrap = el('div', { 'class': 'v2p-lines' });
      lines.forEach(function (line) {
        linesWrap.appendChild(lineRow(line, findProduct(line.slug)));
      });
      next.appendChild(linesWrap);
      next.appendChild(totalsTable(cartCount(lines)));
      next.appendChild(
        el('p', {
          'class': 'v2p-note',
          text:
            'Checkout is parked while we finish the pour. Your roll stays in this ' +
            'cart on this device — nothing is charged and no card is collected.'
        })
      );
      next.appendChild(
        el('div', { 'class': 'reel-cart-actions' }, [
          el('a', {
            'class': 'v2p-btn v2p-btn-inline',
            href: productsHref,
            text: 'Load another roll'
          }),
          el('button', {
            type: 'button',
            'class': 'v2p-remove reel-cart-clear',
            'data-reel-clear': 'all',
            text: 'Clear cart'
          })
        ])
      );
    }

    mount.textContent = '';
    mount.appendChild(next);
  }

  function initCartPage(mount, productsHref) {
    mount.addEventListener('click', function (event) {
      var step = event.target.closest('[data-reel-qty]');
      if (step) {
        setQty(step.getAttribute('data-reel-slug'), Number(step.getAttribute('data-reel-qty')));
        return;
      }
      var remove = event.target.closest('[data-reel-remove]');
      if (remove) {
        removeSlug(remove.getAttribute('data-reel-remove'));
        return;
      }
      if (event.target.closest('[data-reel-clear]')) clearCart();
    });

    // Products link through to this page with ?add=<slug>; consume it once, then
    // drop the query so a reload or a Back does not load the roll twice.
    var pending = new URLSearchParams(window.location.search).get('add');
    if (pending && findProduct(pending)) addSlug(pending);
    if (window.location.search && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }

    renderCart(mount, productsHref);
  }

  /* -------------------------------------------------------------- nav count */

  function renderNavCount() {
    var count = cartCount(readCart());
    var links = document.querySelectorAll('.v2p-nav a, .v2mnav-panel a');
    Array.prototype.forEach.call(links, function (link) {
      var badge = link.querySelector('.reel-cart-count');
      if (!isCartHref(link.getAttribute('href'))) return;
      if (count < 1) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = el('span', { 'class': 'reel-cart-count', 'aria-hidden': 'true' });
        link.appendChild(badge);
      }
      badge.textContent = '(' + count + ')';
      link.setAttribute(
        'aria-label',
        'Cart, ' + count + (count === 1 ? ' roll loaded' : ' rolls loaded')
      );
    });
  }

  /* ------------------------------------------------------------ mobile menu */

  // The hamburger is markup-only in the mirror. Wire it up so the cart stays
  // reachable on phones, reusing the panel classes the locked stylesheet ships.
  function initMobileNav() {
    var button = document.querySelector('.v2mnav-btn');
    var host = button && button.parentElement;
    var source = document.querySelectorAll('.v2p-nav a');
    if (!button || !host || !source.length) return;

    var panel = null;

    function buildPanel() {
      var list = el('ul');
      Array.prototype.forEach.call(source, function (link) {
        list.appendChild(
          el('li', null, [
            el('a', {
              href: link.getAttribute('href'),
              'aria-current': link.getAttribute('aria-current'),
              text: link.firstChild ? link.firstChild.textContent : link.textContent
            })
          ])
        );
      });

      var built = el('div', { 'class': 'v2mnav-panel', id: 'v2-mobile-menu' }, [
        el('div', { 'class': 'v2mnav-panel-top' }, [
          el('span', { 'class': 'v2mnav-panel-title', text: 'Menu' }),
          el('button', { type: 'button', 'class': 'v2mnav-close', 'aria-label': 'Close menu' }, [
            el('span'),
            el('span')
          ])
        ]),
        el('nav', { 'aria-label': 'Primary' }, [list]),
        el('p', { 'class': 'v2mnav-foot', text: 'The Reel \u00b7 Hand poured in Canada' })
      ]);

      built.querySelector('.v2mnav-close').addEventListener('click', function () {
        setOpen(false);
      });
      return built;
    }

    function setOpen(open) {
      if (open && !panel) {
        panel = buildPanel();
        host.appendChild(panel);
        renderNavCount();
      } else if (!open && panel) {
        panel.remove();
        panel = null;
      }
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    button.addEventListener('click', function () {
      setOpen(!panel);
    });
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------- init */

  function init() {
    injectStyles();

    var mount = document.querySelector('[data-reel-cart]');
    // The pre-rendered empty state already carries a correct relative link back
    // to products, so reuse it instead of hardcoding a depth.
    var backLink = mount && mount.querySelector('.v2p-empty a');
    var productsHref = (backLink && backLink.getAttribute('href')) || '../../index.html';

    if (mount) initCartPage(mount, productsHref);

    initMobileNav();
    renderNavCount();

    function refresh() {
      if (mount) renderCart(mount, productsHref);
      renderNavCount();
    }
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', function (event) {
      if (!event.key || event.key === STORAGE_KEY) refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
