// ==UserScript==
// @name     Silverfin - firm search and debug menu
// @version  2.0.0
// @match    http*://live.getsilverfin.com/f/*
// @match    http*://connect.getsilverfin.com/f/*
// @match    http*://*.getsilverfin.com/f/*
// @noframes
// @run-at   document-idle
// @grant    none
// ==/UserScript==
//
// Firm-switcher QoL (sort / alias / search) plus the Debug, Preview and Code nav buttons.
// Supports both the legacy Silverfin interface and the new two-drawer interface: the shared
// feature layer below talks to whichever adapter (OLD_UI / NEW_UI) matches the live DOM.
//
/* eslint-disable no-multi-spaces */
'use strict';

(function () {
    'use strict';

    // ------------------------------------------------------------------ §3 re-entrancy
    if (window.__fintraxReconTools) { return; }
    window.__fintraxReconTools = true;

    // ------------------------------------------------------------------ §4 config
    const DEBUG = false;

    const FIRM_ALIASES = {
        "Abbeloos Schinkels": "Abbeloos Schinkels (Cica)",
        "Blueground": "Blueground (Fidiaz)",
        "Bureau Mignolet": "Bureau Mignolet (Finvision)",
        "Boekhouding Tania Coudeville": "Boekhouding Tania Coudeville (Esperto)",
        "ESP": "ESP (Esperto)",
        "Boekhoudkantoor Marien": "Boekhoudkantoor Marien (Fiscalier)",
        "D&D Fisc": "D&D Fisc (dndfisc)",
        "d&p": "d&p (Decupere)",
        "De Luyker Services": "De Luyker Services (Heidi Hemelsoet)",
        "De Vlieger & CO": "De Vlieger & CO (Buyse)",
        "Fiscaldy": "Fiscaldy (AMPE)",
        "JCV IMMO": "JCV IMMO (ACEG)",
        "PwC Business Services": "PwC Business Services (EIT Digital)"
    };

    // Firms pinned to the top of the switcher, in this order.
    const PINNED_FIRMS = ['Fintrax Dev', 'Fintrax Demo'];

    const IDS = {
        styleTag:    'fintrax-styles',
        searchInput: 'firm-search-input',      // kept verbatim from v1
        debugBtn:    'fintrax-debug-button',
        previewBtn:  'fintrax-preview-button',
        codeBtn:     'fintrax-code-button'     // kept verbatim from v1
    };

    const ATTR = {
        navButton: 'data-fintrax-nav',
        active:    'data-fintrax-active',
        searchRow: 'data-fintrax-search-row',
        selected:  'data-fintrax-selected',
        hidden:    'data-fintrax-hidden',
        sorted:    'data-fintrax-sorted'
    };

    const SAFETY_POLL_MS = 1000;
    const FOCUS_DELAY_MS = 100;

    // The three page kinds the nav buttons care about, anchored end to end so a deeper sub-page
    // cannot match by accident.
    //   workflow    /f/<firm>/<company>/ledgers/<ledger>/workflows/<workflow>
    //   reconText   .../workflows/<workflow>/reconciliation_texts/<id>
    //   accountRec  .../workflows/<workflow>/account_entry/<account>
    const PAGE_PATTERNS = {
        workflow:   /^\/f\/\d+\/\d+\/ledgers\/\d+\/workflows\/\d+\/?$/,
        reconText:  /^\/f\/\d+\/\d+\/ledgers\/\d+\/workflows\/\d+\/reconciliation_texts\/[^/]+\/?$/,
        accountRec: /^\/f\/\d+\/\d+\/ledgers\/\d+\/workflows\/\d+\/account_entry\/[^/]+\/?$/
    };

    // Keys we take over inside the firm search box. Escape is deliberately absent: it has to keep
    // bubbling so the dropdown still closes.
    const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'Enter'];

    // Ordered, most-specific-first. The first entry is v1's selector, which only ever matched the
    // old interface's <details> debug panel; the rest widen the net.
    const CODE_LINK_SELECTORS = [
        'details.sf-pad-t-1 > p:nth-child(6) > a',
        'details.sf-pad-t-1 a[href*="/edit"]',
        'details a[href*="/edit"]',
        '[class*="sf-pad-t-1"] a[href*="/edit"]'
    ];

    // Last resort, and the one that does not care how the debug panel is built: the shape of a
    // firm-level template editor URL, e.g. /f/14120/templates/reconciliation_texts/123/edit
    // or /f/14120/reconciliation_texts/123/edit.
    const CODE_HREF_RE = new RegExp(
        '/f/\\d+/(?:templates/)?' +
        '(?:reconciliation_texts|account_templates|shared_parts|export_files|templates)' +
        '/\\d+(?:/edit|/edit_template_hash)?(?:[/?#]|$)'
    );

    // Debug also covers the workflow overview. Preview only makes sense where a template is
    // actually rendered. Code needs debug mode on, because the link it points at only exists then.
    const NAV_BUTTONS = [
        { key: 'debug',   id: IDS.debugBtn,   label: 'Debug',   icon: 'fa fa-bug',
          mode: 'debug',   showOn: ['workflow', 'reconText', 'accountRec'] },
        { key: 'preview', id: IDS.previewBtn, label: 'Preview', icon: 'fa fa-eye',
          mode: 'preview', showOn: ['reconText', 'accountRec'] },
        { key: 'code',    id: IDS.codeBtn,    label: 'Code',    icon: 'fa fa-code',
          showOn: ['reconText', 'accountRec'], requiresDebug: true }
    ];

    const log  = (...a) => { if (DEBUG) { console.log('[fintrax]', ...a); } };
    const warn = (...a) => { console.warn('[fintrax]', ...a); };

    // apply() runs on every mutation, so anything advisory must only say it once per page.
    const warnedKeys = {};
    function warnOnce(key, ...a) {
        if (warnedKeys[key]) { return; }
        warnedKeys[key] = true;
        warn(...a);
    }

    // ------------------------------------------------------------------ §5 generic utilities
    function qs(selector, root) {
        try { return (root || document).querySelector(selector); }
        catch (e) { warn('bad selector', selector, e); return null; }
    }

    function qsa(selector, root) {
        try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
        catch (e) { warn('bad selector', selector, e); return []; }
    }

    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(k => {
            if (attrs[k] !== null && attrs[k] !== undefined) { node.setAttribute(k, attrs[k]); }
        });
        (children || []).forEach(c => node.appendChild(c));
        return node;
    }

    function rafDebounce(fn) {
        let scheduled = false;
        return function () {
            if (scheduled) { return; }
            scheduled = true;
            window.requestAnimationFrame(() => { scheduled = false; fn(); });
        };
    }

    // Toggles ?<param>=1 on the current URL. Preserves the fragment and never emits a bare "?".
    function getButtonURL(param) {
        const url = new URL(window.location.href);
        if (url.searchParams.has(param)) { url.searchParams.delete(param); }
        else { url.searchParams.set(param, '1'); }
        return url.toString();
    }

    // Which of PAGE_PATTERNS we are on, or null for everywhere else.
    function pageKind() {
        const path = window.location.pathname;
        const keys = Object.keys(PAGE_PATTERNS);
        for (let i = 0; i < keys.length; i++) {
            if (PAGE_PATTERNS[keys[i]].test(path)) { return keys[i]; }
        }
        return null;
    }

    function isModeActive(param) {
        return new URL(window.location.href).searchParams.has(param);
    }

    // Buttons for the current page, in NAV_BUTTONS order.
    function visibleNavButtons() {
        const kind = pageKind();
        if (!kind) { return []; }
        return NAV_BUTTONS.filter(spec =>
            spec.showOn.indexOf(kind) !== -1 &&
            (!spec.requiresDebug || isModeActive('debug')));
    }

    function findCodeLink() {
        for (let i = 0; i < CODE_LINK_SELECTORS.length; i++) {
            const node = qs(CODE_LINK_SELECTORS[i]);
            if (node && node.getAttribute('href')) { return node; }
        }
        // Nothing matched a known panel layout, so go by the URL shape instead.
        const links = qsa('a[href]');
        for (let i = 0; i < links.length; i++) {
            if (CODE_HREF_RE.test(links[i].getAttribute('href'))) { return links[i]; }
        }
        return null;
    }

    // Lists every plausible candidate for the Code link. Paste
    //   document.documentElement.dataset.fintraxUi && window.__fintraxCodeLinkReport()
    // into the console on a ?debug=1 page to see what this script can and cannot find.
    window.__fintraxCodeLinkReport = function () {
        const rows = qsa('a[href]')
            .map(a => ({ href: a.getAttribute('href'), text: (a.textContent || '').trim().slice(0, 60) }))
            .filter(r => /\/edit|template|_texts|shared_part|account_/i.test(r.href));
        return {
            resolved:        findCodeLink() && findCodeLink().getAttribute('href'),
            detailsElements: qsa('details').map(d => d.className || '(no class)'),
            sfPadT1:         qsa('[class*="sf-pad-t-1"]').map(d => d.tagName + '.' + d.className),
            candidates:      rows
        };
    };

    function injectStyles(ui) {
        const existing = document.getElementById(IDS.styleTag);
        if (existing && existing.getAttribute('data-fintrax-ui') === ui.id) { return; }
        if (existing) { existing.remove(); }
        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) { return; }
        const style = el('style', { id: IDS.styleTag, 'data-fintrax-ui': ui.id });
        style.textContent = ui.styles.join('\n');
        head.appendChild(style);
    }

    // ------------------------------------------------------------------ §6 UI detection
    let UI = null;

    function detectUI() {
        if (OLD_UI.matches()) { return OLD_UI; }
        if (NEW_UI.matches()) { return NEW_UI; }
        return null;
    }

    // ------------------------------------------------------------------ §7 adapter: OLD_UI
    const OLD_UI = {
        id: 'old',

        matches() {
            return !!qs('div.navbar.navbar-fixed-top');
        },

        styles: [
            '@media screen and (max-width: 1200px) {' +
                ' .nav-collapse, .nav-collapse.collapse { overflow: hidden; overflow-x: hidden; overflow-y: hidden; height: 0; }' +
                ' .navbar .btn-navbar { display: block; }' +
                ' .hidden-desktop { display: inherit !important; }' +
            '}',
            'ul.dropdown-menu.sf-overflow-scroll li[' + ATTR.selected + '] > a {' +
                ' background-color: #0077b3 !important; color: #FFF !important;' +
            '}',
            'ul.nav > li[' + ATTR.active + '] > a,' +
            'ul.nav > li[' + ATTR.active + '] > a:hover,' +
            'ul.nav > li[' + ATTR.active + '] > a:focus {' +
                ' background-color: #0077b3 !important; color: #FFF !important;' +
            '}'
        ],

        getButtonBar() {
            // v1 selector stays authoritative; mountNavButtons has already established that this
            // is a page the buttons belong on, so the fallback needs no extra guard.
            return qs('ul.nav.pull-left:not(.hidden-desktop)') ||
                   qs('.nav-collapse .tw-mr-auto > ul.nav');
        },

        createNavButton(spec) {
            const link = el('a', {
                id: spec.id,
                href: spec.href || '#',
                target: spec.target || null,
                title: spec.title || null
            });
            link.textContent = spec.label;
            if (spec.onClick) { link.addEventListener('click', spec.onClick); }
            return el('li', { [ATTR.navButton]: '1' }, [link]);
        },

        insertNavButton(bar, node) {
            bar.appendChild(node);
        },

        getFirmMenu() {
            return qs('ul.dropdown-menu.sf-overflow-scroll');
        },

        getFirmItems(menu) {
            return qsa(':scope > li', menu).filter(li =>
                !li.classList.contains('dropdown-header') && !li.hasAttribute(ATTR.searchRow));
        },

        getFirmLink(li) {
            return qs('a', li);
        },

        getFirmNameEl(li) {
            return qs('a', li);   // in the old UI the <a> itself carries the name
        },

        getFirmSortRoot(menu) {
            return menu;
        },

        getFirmScrollBox(menu) {
            return menu;          // sf-overflow-scroll + inline max-height:500px
        },

        createFirmSearchRow() {
            const input = el('input', {
                type: 'text',
                id: IDS.searchInput,
                class: 'sf-input tw-w-full',
                autocomplete: 'off',
                placeholder: 'Search firms...'
            });
            const row = el('li', { [ATTR.searchRow]: '1', style: 'padding: 5px 10px;' }, [input]);
            return { row: row, input: input };
        },

        insertFirmSearchRow(menu, row) {
            menu.insertBefore(row, menu.firstChild);
        },

        firmTriggerSelector: '.firm-picker > a.firms',

        getFirmMenuTrigger() {
            return qs(this.firmTriggerSelector);
        },

        observesAriaExpanded: false,

        rewriteFirmHref(href) {
            // Narrowed from v1's bare "vgd." substring match: the white-label tenant hosts
            // (ey., vanreybrouck., dfisc., pia.) are separate firms and must never be rewritten.
            return href.indexOf('vgd.getsilverfin.com') !== -1
                ? href.replace('vgd.getsilverfin.com', window.location.hostname)
                : null;
        }
    };

    // ------------------------------------------------------------------ §8 adapter: NEW_UI
    const NEW_WRAP  = 'sf-ce-dropdown-wrapper[dropdown-id="profileDropdown"]';
    const NEW_PANEL = NEW_WRAP + ' > div[slot="submenu-firm"]';

    const NEW_UI = {
        id: 'new',

        matches() {
            if (qs('#main-wrapper.two-drawer-layout-new')) { return true; }
            if (document.getElementById('left-drawer')) { return true; }
            const prefs = document.getElementById('current_user_preferences');
            if (!prefs) { return false; }
            try { return JSON.parse(prefs.value || '{}').use_new_layout === true; }
            catch (e) { return false; }
        },

        styles: [
            'div[slot="submenu-firm"] li[' + ATTR.selected + '] {' +
                ' background-color: var(--color-sky-subtle, #cffafe) !important;' +
            '}',
            'div[slot="submenu-firm"] [' + ATTR.searchRow + '] {' +
                ' position: sticky; top: 0; z-index: 1; background: #fff;' +
            '}',
            '#header-right [' + ATTR.active + '],' +
            '#header-right [' + ATTR.active + ']:hover,' +
            '#header-right [' + ATTR.active + ']:focus {' +
                ' background-color: #0077b3 !important; color: #FFF !important;' +
            '}',
            '#header-right [' + ATTR.active + '] i { color: #FFF !important; }'
        ],

        getButtonBar() {
            return qs('#header-right > div.tw-flex.tw-items-center') ||
                   qs('#header-right > div') ||
                   document.getElementById('header-right');
        },

        createNavButton(spec) {
            const spinner = el('span', { class: 'sf-button__spinner' }, [
                el('i', { 'aria-hidden': 'true', class: 'fa fa-spinner fa-spin' })
            ]);
            const icon  = el('i', { 'aria-hidden': 'true', class: spec.icon });
            const label = el('span', { class: 'tw-ml-1' });
            label.textContent = spec.label;

            // Icon + text rather than the native icon-only buttons: the FA6 bundle may be
            // subsetted, and a missing glyph would otherwise leave a blank square.
            const classes = 'sf-button sf-button--tertiary sf-button--md';
            let node;
            if (spec.href) {
                node = el('a', {
                    id: spec.id,
                    class: classes,
                    href: spec.href,
                    target: spec.target || null,
                    title: spec.title || null,
                    'data-turbolinks': 'false'
                }, [spinner, icon, label]);
            } else {
                node = el('button', {
                    id: spec.id,
                    class: classes,
                    type: 'button',
                    title: spec.title || null
                }, [spinner, icon, label]);
            }
            node.setAttribute(ATTR.navButton, '1');
            if (spec.onClick) { node.addEventListener('click', spec.onClick); }
            return node;
        },

        insertNavButton(bar, node) {
            const help = qs('div.sf-dropdown[data-walkthrough-id="navbar-help"]', bar);
            if (help) { bar.insertBefore(node, help); } else { bar.appendChild(node); }
        },

        getFirmMenu() {
            return qs(NEW_PANEL + ' > div > ul') || qs(NEW_PANEL + ' ul');
        },

        getFirmItems(menu) {
            return qsa(':scope > li', menu);
        },

        getFirmLink(li) {
            return qs(':scope > a[href]', li);
        },

        getFirmNameEl(li) {
            // Attribute-substring matching only: the literal Tailwind classes need CSS.escape and
            // churn with every design tweak.
            return qs(':scope > a > div[class*="tw-leading-4"][class*="tw-text-["]', li) ||
                   qs(':scope > a > div:last-of-type', li);
        },

        getFirmSortRoot(menu) {
            return menu;
        },

        getFirmScrollBox(menu) {
            return menu.closest('div[slot="submenu-firm"]') || menu;
        },

        createFirmSearchRow() {
            const input = el('input', {
                type: 'text',
                id: IDS.searchInput,
                autocomplete: 'off',
                placeholder: 'Search firms...',
                class: 'tw-p-0 text-sm !tw-bg-transparent tw-outline-none !tw-mb-0 !tw-border-none ' +
                       '!tw-shadow-none tw-font-sans tw-h-auto tw-w-full tw-text-sf-gray-dark ' +
                       'placeholder:tw-text-inherit placeholder:tw-opacity-60'
            });
            const clear = el('span', {
                class: 'icon tw-flex tw-items-center tw-text-sf-gray-darker tw-text-sm ' +
                       'tw-w-[15px] tw-h-[15px] fa fa-remove sf-pointer tw-ml-1'
            });
            clear.addEventListener('click', () => {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: false }));
                input.focus();
            });
            const box = el('div', {
                class: 'tw-flex tw-items-center tw-box-border tw-h-8 tw-bg-sf-snow-light ' +
                       'tw-rounded-lg tw-px-2 tw-border-solid tw-border tw-border-sf-snow-darker'
            }, [
                el('span', {
                    class: 'icon tw-flex tw-items-center tw-text-sf-gray-darker tw-text-sm ' +
                           'tw-w-[15px] tw-h-[15px] fa fa-search tw-mr-1'
                }),
                input,
                clear
            ]);
            // Deliberately no data-controller / data-action / data-*-target: Stimulus must not
            // adopt this node.
            const row = el('div', { [ATTR.searchRow]: '1', class: 'tw-pb-2' }, [box]);
            return { row: row, input: input };
        },

        insertFirmSearchRow(menu, row) {
            // Sibling above the <ul>, not an <li>, so ":scope > li" stays exactly the firm rows.
            menu.parentNode.insertBefore(row, menu);
        },

        firmTriggerSelector: NEW_WRAP + ' li[data-submenu-trigger="firm"] > button',

        getFirmMenuTrigger() {
            return qs(this.firmTriggerSelector);
        },

        // aria-expanded on the trigger is the only reliable open-state flag: the panels all ship
        // sf-dropdown2-menu--open hard-coded from the server.
        observesAriaExpanded: true,

        rewriteFirmHref(href) {
            return href.indexOf('vgd.getsilverfin.com') !== -1
                ? href.replace('vgd.getsilverfin.com', window.location.hostname)
                : null;
        }
    };

    // ------------------------------------------------------------------ §9 shared features
    function getFirmName(ui, li) {
        const node = ui.getFirmNameEl(li);
        return node ? node.textContent.trim() : '';
    }

    function setFirmName(ui, li, name) {
        const node = ui.getFirmNameEl(li);
        if (node) { node.textContent = name; }   // never innerHTML: entities and sibling slots
    }

    function setSelected(li, on) {
        if (on) { li.setAttribute(ATTR.selected, '1'); } else { li.removeAttribute(ATTR.selected); }
    }

    function setHidden(li, on) {
        if (on) { li.setAttribute(ATTR.hidden, '1'); } else { li.removeAttribute(ATTR.hidden); }
        li.style.display = on ? 'none' : '';
    }

    function pinRank(name) {
        const i = PINNED_FIRMS.indexOf(name);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    }

    function mountFirmList(ui) {
        const menu = ui.getFirmMenu();
        if (!menu) { return; }

        // Search row first, so childElementCount is stable by the time we stamp it below.
        mountFirmSearch(ui, menu);

        // apply() runs on every DOM mutation, so the hot path must stay cheap: childElementCount
        // is a property read, whereas enumerating the rows is a 250-280 element query.
        const stamp = String(menu.childElementCount);
        if (menu.getAttribute(ATTR.sorted) === stamp) { return; }

        const items = ui.getFirmItems(menu);
        if (items.length) {
            rewriteFirmHrefs(ui, items);
            sortFirmItems(ui, menu, items);   // sorts on the raw names, as v1 did
            applyFirmAliases(ui, items);
            log('firm list mounted', ui.id, items.length, 'rows');
        }
        // Stamped even when the list is still empty, so we do not re-query it every tick.
        menu.setAttribute(ATTR.sorted, stamp);
    }

    function rewriteFirmHrefs(ui, items) {
        items.forEach(li => {
            const link = ui.getFirmLink(li);
            const href = link && link.getAttribute('href');
            if (!href) { return; }
            const next = ui.rewriteFirmHref(href);
            if (next && next !== href) {
                link.setAttribute('href', next);
                log('rewrote firm href', href, '->', next);
            }
        });
    }

    function sortFirmItems(ui, menu, items) {
        const rows = items.map(li => ({ li: li, name: getFirmName(ui, li) }));
        rows.sort((a, b) => {
            const ra = pinRank(a.name);
            const rb = pinRank(b.name);
            if (ra !== rb) { return ra - rb; }
            return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
        });
        const frag = document.createDocumentFragment();
        rows.forEach(r => frag.appendChild(r.li));
        ui.getFirmSortRoot(menu).appendChild(frag);
    }

    function applyFirmAliases(ui, items) {
        items.forEach(li => {
            const name = getFirmName(ui, li);
            if (Object.prototype.hasOwnProperty.call(FIRM_ALIASES, name)) {
                setFirmName(ui, li, FIRM_ALIASES[name]);
            }
        });
    }

    function scrollRowIntoView(box, li) {
        if (!box) { return; }
        const b = box.getBoundingClientRect();
        const r = li.getBoundingClientRect();
        if (r.top < b.top) { box.scrollTop += r.top - b.top; }
        else if (r.bottom > b.bottom) { box.scrollTop += r.bottom - b.bottom; }
    }

    function mountFirmSearch(ui, menu) {
        if (qs('#' + IDS.searchInput, menu.parentNode)) { return; }
        const built = ui.createFirmSearchRow();
        if (!built) { return; }
        ui.insertFirmSearchRow(menu, built.row);
        wireFirmSearch(ui, menu, built.input);
        log('firm search mounted', ui.id);
    }

    function wireFirmSearch(ui, menu, input) {
        let selectedIdx = -1;

        const visibleRows = () => ui.getFirmItems(menu).filter(li => !li.hasAttribute(ATTR.hidden));

        function select(rows, idx) {
            // Clear across *all* rows, not just the visible set, so a filtered-out row can't keep
            // the highlight and reappear selected.
            ui.getFirmItems(menu).forEach(li => setSelected(li, false));
            if (!rows.length) { selectedIdx = -1; return; }
            selectedIdx = ((idx % rows.length) + rows.length) % rows.length;
            const li = rows[selectedIdx];
            setSelected(li, true);
            scrollRowIntoView(ui.getFirmScrollBox(menu), li);
        }

        function filter() {
            const term = input.value.trim().toLowerCase();
            const rows = ui.getFirmItems(menu);
            rows.forEach(li => {
                setHidden(li, !!term && getFirmName(ui, li).toLowerCase().indexOf(term) === -1);
            });
            select(rows.filter(li => !li.hasAttribute(ATTR.hidden)), 0);
        }

        // A click inside the box must not count as an outside-click for the dropdown.
        ['click', 'mousedown'].forEach(type => {
            input.addEventListener(type, e => e.stopPropagation());
        });

        input.addEventListener('keydown', e => {
            if (NAV_KEYS.indexOf(e.key) === -1) { return; }
            // Both the Bootstrap dropdown and sf-ce-dropdown-wrapper do their own arrow-key
            // handling, which would fight this selection.
            e.preventDefault();
            e.stopPropagation();

            const rows = visibleRows();
            if (e.key === 'ArrowDown')    { select(rows, selectedIdx + 1); }
            else if (e.key === 'ArrowUp') { select(rows, selectedIdx - 1); }
            else if (e.key === 'Enter') {
                const li = rows[selectedIdx];
                const link = li && ui.getFirmLink(li);
                if (link) { link.click(); }
            }
        });

        input.addEventListener('input', filter);
    }

    function mountNavButtons(ui) {
        const specs = visibleNavButtons();
        if (!specs.length) { return; }

        const bar = ui.getButtonBar();
        if (!bar) { return; }

        // Guarded per button, not as a set: which buttons apply depends on the page, and Code can
        // arrive a beat later than the other two.
        specs.forEach(spec => {
            if (qs('#' + spec.id, bar)) { return; }

            let node;
            if (spec.key === 'code') {
                // Debug mode is on, so the panel holding this link is rendering. If it has not
                // landed yet, the mutation observer brings us straight back here.
                const link = findCodeLink();
                if (!link) {
                    warnOnce('code-link',
                        'Debug mode is on but no template code link was found, so the Code button ' +
                        'is hidden. Run window.__fintraxCodeLinkReport() to see the candidates.');
                    return;
                }
                node = ui.createNavButton(Object.assign({}, spec, {
                    title: 'Open the template code',
                    href: link.getAttribute('href'),
                    target: '_blank'
                }));
            } else {
                const active = isModeActive(spec.mode);
                node = ui.createNavButton(Object.assign({}, spec, {
                    title: active
                        ? spec.label + ' mode is on, click to turn it off'
                        : 'Turn ' + spec.label.toLowerCase() + ' mode on',
                    href: getButtonURL(spec.mode)
                }));
                // Each adapter's CSS keys off this attribute on the node it returns.
                if (active) { node.setAttribute(ATTR.active, '1'); }
            }
            ui.insertNavButton(bar, node);
            log('mounted', spec.key, 'button', ui.id);
        });
    }

    function focusFirmSearch() {
        const input = document.getElementById(IDS.searchInput);
        if (input) { input.focus(); }
    }

    let triggerClickWired = false;
    let openObserver = null;
    let openObserverNode = null;

    function wireFirmMenuFocus(ui) {
        if (!triggerClickWired) {
            triggerClickWired = true;
            document.addEventListener('click', e => {
                if (!UI || !e.target || !e.target.closest) { return; }
                if (e.target.closest(UI.firmTriggerSelector)) {
                    window.setTimeout(focusFirmSearch, FOCUS_DELAY_MS);
                }
            });
        }

        if (!ui.observesAriaExpanded) { return; }

        const trigger = ui.getFirmMenuTrigger();
        if (!trigger || trigger === openObserverNode) { return; }
        if (openObserver) { openObserver.disconnect(); }
        openObserverNode = trigger;
        openObserver = new MutationObserver(() => {
            if (trigger.getAttribute('aria-expanded') === 'true') {
                window.setTimeout(focusFirmSearch, FOCUS_DELAY_MS);
            }
        });
        openObserver.observe(trigger, { attributes: true, attributeFilter: ['aria-expanded'] });
    }

    // ------------------------------------------------------------------ §10 lifecycle
    let applyCount = 0;
    let applyWindowStart = 0;

    function apply() {
        // Runaway-mutation canary: apply() mutates the DOM, which wakes the observer, which
        // schedules apply(). The guards make pass two a no-op, so this should never fire.
        const now = Date.now();
        if (now - applyWindowStart > 1000) { applyWindowStart = now; applyCount = 0; }
        if (++applyCount === 50) { warn('apply() ran 50x in a second, a mount guard is probably wrong'); }

        if (!UI || !UI.matches()) { UI = detectUI(); }
        if (!UI) { return; }
        document.documentElement.setAttribute('data-fintrax-ui', UI.id);

        injectStyles(UI);
        mountNavButtons(UI);
        mountFirmList(UI);
        wireFirmMenuFocus(UI);
    }

    // Turbolinks snapshots <body> for the back-button preview. Without this the snapshot keeps our
    // buttons, the search row and any display:none left over from a half-typed filter, and the
    // mount guards then suppress a clean re-mount.
    function teardown() {
        const style = document.getElementById(IDS.styleTag);
        if (style) { style.remove(); }
        qsa('[' + ATTR.navButton + ']').forEach(n => n.remove());
        qsa('[' + ATTR.searchRow + ']').forEach(n => n.remove());
        qsa('[' + ATTR.selected + ']').forEach(n => n.removeAttribute(ATTR.selected));
        qsa('[' + ATTR.hidden + ']').forEach(n => {
            n.removeAttribute(ATTR.hidden);
            n.style.display = '';
        });
    }

    // ------------------------------------------------------------------ §11 boot
    const applySoon = rafDebounce(apply);

    document.addEventListener('turbolinks:load', apply);
    document.addEventListener('turbolinks:before-cache', teardown);

    // documentElement, not body: Turbolinks replaces <body> and would orphan the observer.
    new MutationObserver(applySoon).observe(document.documentElement, { childList: true, subtree: true });

    window.setInterval(apply, SAFETY_POLL_MS);   // backstop for paths nobody thought of

    apply();
})();
