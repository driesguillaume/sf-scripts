// ==UserScript==
// @name     Silverfin - oauth firm sort
// @version  2.0.0
// @match    http*://*.getsilverfin.com/oauth/authorize*
// @match    http*://*.getsilverfin.com/f/*/oauth/authorize*
// @noframes
// @run-at   document-idle
// @grant    none
// ==/UserScript==
//
// The Doorkeeper "choose a firm" page lists every firm in one unsorted <select> with nothing
// preselected, so the "Volgende stap" button stays hidden until you find your firm by hand.
// This sorts the list and preselects the default firm, which reveals that button immediately.
//
/* eslint-disable no-multi-spaces */
'use strict';

(function () {
    'use strict';

    if (window.__fintraxOauthTools) { return; }
    window.__fintraxOauthTools = true;

    // ---------------------------------------------------------------- config
    const DEBUG = false;

    // Firms pinned to the top of the list, in this order. Kept in step with script 4.
    const PINNED_FIRMS = ['Fintrax Dev', 'Fintrax Demo'];

    // Preselected on arrival. The id wins when it is in the list; otherwise the first PINNED_FIRMS
    // entry that is present gets picked by name.
    const DEFAULT_FIRM_ID = '14120';   // Fintrax Dev

    // Ordered, most-specific-first.
    const SELECT_SELECTORS = [
        'select#authorized_firm_id',
        'select[data-behavior="token-firm-id-selector"]',
        'select[name="authorized_firm_id"]'
    ];

    const SORTED_ATTR      = 'data-fintrax-sorted';
    const WAIT_INTERVAL_MS = 100;
    const WAIT_TIMEOUT_MS  = 10000;

    const log  = (...a) => { if (DEBUG) { console.log('[fintrax]', ...a); } };
    const warn = (...a) => { console.warn('[fintrax]', ...a); };

    // ---------------------------------------------------------------- helpers
    function findSelect() {
        for (let i = 0; i < SELECT_SELECTORS.length; i++) {
            const node = document.querySelector(SELECT_SELECTORS[i]);
            if (node) { return node; }
        }
        return null;
    }

    function pinRank(name) {
        const i = PINNED_FIRMS.indexOf(name);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    }

    // Returns [{ option, name }] for the real firms, in their new order. The placeholder
    // (<option value="">) is left where it is, at the top.
    function sortFirms(select) {
        const rows = Array.prototype.slice.call(select.options)
            .filter(option => option.value)
            .map(option => ({ option: option, name: (option.textContent || '').trim() }));

        rows.sort((a, b) => {
            // Rank first, then alphabetical. A plain "return -1 if pinned" comparator is not a
            // strict weak ordering when both sides are pinned, so the two Fintrax entries could
            // come out in either order depending on the engine.
            const rankA = pinRank(a.name);
            const rankB = pinRank(b.name);
            if (rankA !== rankB) { return rankA - rankB; }
            return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
        });

        // Re-append through a fragment: one reflow instead of one per option.
        const frag = document.createDocumentFragment();
        rows.forEach(row => frag.appendChild(row.option));
        select.appendChild(frag);

        log('sorted', rows.length, 'firms');
        return rows;
    }

    function selectDefaultFirm(select, rows, previousValue) {
        // Never override a firm the page or the user already picked.
        if (previousValue) { log('a firm was already selected, leaving it alone'); return; }

        let target = rows.find(row => row.option.value === DEFAULT_FIRM_ID);
        if (!target) {
            for (let i = 0; i < PINNED_FIRMS.length && !target; i++) {
                target = rows.find(row => row.name === PINNED_FIRMS[i]);
            }
        }
        if (!target) { log('no default firm in this list'); return; }

        target.option.selected = true;
        // The page binds its own jQuery "change" handler, which is what reveals the matching
        // [data-behavior="doorkeeper-actions"] block. A native event reaches jQuery handlers fine.
        select.dispatchEvent(new Event('change', { bubbles: true }));
        log('preselected', target.name);
    }

    function run(select) {
        if (select.hasAttribute(SORTED_ATTR)) { return; }

        // Moving options out of a <select> clears its selection, so remember and restore it.
        const previousValue = select.value;
        const rows = sortFirms(select);
        select.setAttribute(SORTED_ATTR, String(rows.length));
        if (previousValue && select.value !== previousValue) { select.value = previousValue; }

        selectDefaultFirm(select, rows, previousValue);
    }

    // ---------------------------------------------------------------- boot
    // The <select> is server-rendered, so this almost always resolves on the first attempt.
    const startedAt = Date.now();

    function attempt() {
        const select = findSelect();
        if (select) { run(select); return true; }
        return false;
    }

    if (!attempt()) {
        const timer = window.setInterval(() => {
            if (attempt() || Date.now() - startedAt > WAIT_TIMEOUT_MS) {
                window.clearInterval(timer);
                if (!findSelect()) {
                    warn('no firm <select> found after ' + (WAIT_TIMEOUT_MS / 1000) + 's');
                }
            }
        }, WAIT_INTERVAL_MS);
    }
})();
