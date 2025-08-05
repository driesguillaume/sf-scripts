// ==UserScript==
// @name     4. Silverfin: reconciliation tools
// @match    http*://live.getsilverfin.com/f/*
// @noframes
// @grant    GM_setValue
// @grant    GM_getValue
// ==/UserScript==
/* global jQuery, $ */
/* eslint-disable no-multi-spaces, curly */
'use strict';

addGlobalStyle('@media screen and (max-width: 1200px) { .nav-collapse, .nav-collapse.collapse {overflow: hidden; overflow-x: hidden; overflow-y: hidden; height: 0;} .navbar .btn-navbar {display: block;} .hidden-desktop {display: inherit !important;}}');
addGlobalStyle('ul.dropdown-menu.sf-overflow-scroll li.selected > a {background-color: #0077b3; !important; color:#FFF !important;}');


var debug_page_loaded = GM_getValue("debug_page_loaded", false);
if(debug_page_loaded){
    console.log('getting code url...');
    var codeURLCheckTimer = setInterval(function() {
        if (document.querySelector("details.sf-pad-t-1 > p:nth-child(6) > a")) {
            console.log("code url exists now");
            var code_url = document.querySelector("details.sf-pad-t-1 > p:nth-child(6) > a").getAttribute("href");
            window.location.replace(code_url);
            clearInterval(codeURLCheckTimer);
        }
    }, 200); // check every 200ms
    GM_setValue ("debug_page_loaded", false);
};

var invisibleElementCheckTimer = setInterval(
    function() {
        if(document.querySelector("#fintrax-debug-menu") == null){
            addInvisibleElement();
            sortFirms();
            addSearchFirms();
            addPreviewButton();
            addDebugButton();
            addCodeButton();
        }
    }, 300 // check every 300ms for invisible element
);

function addInvisibleElement() {
    //Invisible element
    var invis_a = document.createElement("a");
    var invis_id_att = document.createAttribute("id");
    invis_id_att.value = "fintrax-debug-menu"
    invis_a.setAttributeNode(invis_id_att);
    document.querySelector("body").appendChild(invis_a);
};

function addDebugButton() {
    var current_url = window.location.href;

    //Debug button
    if(document.querySelector("ul.nav.pull-left:not(.hidden-desktop)")){
        var debug_li = document.createElement("li");
        var debug_a = document.createElement("a");
        var debug_href_att = document.createAttribute("href");
        var debug_url = getButtonURL('debug');
        debug_href_att.value = debug_url;
        debug_a.setAttributeNode(debug_href_att);
        debug_a.innerHTML = "Debug";
        debug_li.appendChild(debug_a);
        document.querySelector("ul.nav.pull-left:not(.hidden-desktop)").appendChild(debug_li);
    };
};

function addPreviewButton() {
    //Preview button
    if(document.querySelector("ul.nav.pull-left:not(.hidden-desktop)")){
        var preview_li = document.createElement("li");
        var preview_a = document.createElement("a");
        var preview_href_att = document.createAttribute("href");
        var preview_url = getButtonURL('preview');
        preview_href_att.value = preview_url;
        preview_a.setAttributeNode(preview_href_att);
        preview_a.innerHTML = "Preview";
        preview_li.appendChild(preview_a);
        document.querySelector("ul.nav.pull-left:not(.hidden-desktop)").appendChild(preview_li);
    };
};

function addCodeButton() {
    //Code button
    if(document.querySelector("ul.nav.pull-left:not(.hidden-desktop)")){
        var code_li = document.createElement("li");
        var code_a = document.createElement("a");
        var code_id_att = document.createAttribute("id");
        code_id_att.value = "fintrax-code-button";
        code_a.setAttributeNode(code_id_att);
        if(document.querySelector("details.sf-pad-t-1 > p:nth-child(6) > a")){
            console.log('code url already present');
            var code_url = document.querySelector("details.sf-pad-t-1 > p:nth-child(6) > a").getAttribute("href");
            var code_href_att = document.createAttribute("href");
            code_href_att.value = code_url;
            code_a.setAttributeNode(code_href_att);
            var code_target_att = document.createAttribute("target");
            code_target_att.value = "_blank";
            code_a.setAttributeNode(code_target_att);
        }
        else {
            code_a.addEventListener ("click", goToCode, false);
        }
        code_a.innerHTML = "Code";
        code_li.appendChild(code_a);
        document.querySelector("ul.nav.pull-left:not(.hidden-desktop)").appendChild(code_li);
    }
};

function goToCode() {
    console.log('code button clicked');
    console.log('reloading page to get code url...');
    var debug_url = getButtonURL('debug');
    GM_setValue ("debug_page_loaded", true);
    window.open(debug_url, '_blank').focus();
};

function getButtonURL(button) {
    const queryString = window.location.search;
    var urlString = window.location.href.split('?')[0];
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.has(button)){
        urlParams.delete(button);
    }
    else {
        urlParams.append(button, '1');
    }
    console.log(urlParams.toString());
    return urlString + '?' + urlParams.toString();
};


function sortFirms() {
    var $ = jQuery;  //  The page loads jQuery (and we are in grant none mode), but doesn't set `$`.
    var firmsLst  = $("ul.dropdown-menu.sf-overflow-scroll");
    var itemsToSort = firmsLst.find("li");
    var sortedItems = itemsToSort.sort(sortByLinkTextAscending).each(removeVGDLink);
    sortedItems.each(addAliases);
    sortedItems.appendTo(firmsLst);
    function sortByLinkTextAscending(nodeA, nodeB) {
        var valA_Text  = $(nodeA).find("a").text().trim();
        var valB_Text  = $(nodeB).find("a").text().trim();

        if(valA_Text == "Fintrax Dev" || valA_Text == "Fintrax Demo"){
            return -1;
        }
        if(valB_Text == "Fintrax Dev" || valB_Text == "Fintrax Demo"){
            return 1;
        }
        else {
            return valA_Text.localeCompare(valB_Text, 'en', {sensitivity: 'base'});
        };
    };
    function removeVGDLink(element) {
        var a_elem = $(this).find("a");
        var vgd_href = a_elem.attr("href");
        if(vgd_href && vgd_href.includes("vgd.")) {
            var live_href = vgd_href.replace("vgd.", "live.");
            a_elem.attr("href", live_href);
            console.log("replaced 'vgd.' with 'live.' in firm link")
        };
    };
};


function addSearchFirms() {
    const $ = jQuery;
    const firmsLst = $("ul.dropdown-menu.sf-overflow-scroll");

    if (!firmsLst.length || $("#firm-search-input").length) return;

    const searchInputLI = $('<li>', {
        style: 'padding: 5px 10px;'
    });

    const searchInput = $('<input>', {
        type: 'text',
        id: 'firm-search-input',
        class: 'sf-input tw-w-full',
        placeholder: 'Search firms...'
    });

    searchInput.on('click mousedown', function (e) {
        e.stopPropagation();
    });

    searchInputLI.append(searchInput);
    firmsLst.prepend(searchInputLI);

    let selectedIdx = -1;

    function updateSelection(items, direction) {
        if (!items.length) return;

        selectedIdx += direction;

        if (selectedIdx < 0) selectedIdx = items.length - 1;
        if (selectedIdx >= items.length) selectedIdx = 0;

        items.removeClass("selected");
        $(items[selectedIdx]).addClass("selected");

        // Scroll into view
        items[selectedIdx].scrollIntoView({ block: "nearest" });
    }

    searchInput.on('keydown', function (e) {
        const visibleItems = firmsLst.find("li:visible:not(:first)").not('.dropdown-header');

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                updateSelection(visibleItems, 1);
                break;

            case "ArrowUp":
                e.preventDefault();
                updateSelection(visibleItems, -1);
                break;

            case "Enter":
                e.preventDefault();
                if (selectedIdx >= 0 && visibleItems[selectedIdx]) {
                    $(visibleItems[selectedIdx]).find("a")[0].click();
                }
                break;
        }
    });

    searchInput.on('keyup', function (e) {
        if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) return;

        const searchTerm = $(this).val().toLowerCase();
        selectedIdx = -1;

        firmsLst.find("li").not(searchInputLI).each(function () {
            const firmName = $(this).text().toLowerCase();
            const isHeader = $(this).hasClass("dropdown-header");

            if (isHeader || firmName.includes(searchTerm)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        const visibleItems = firmsLst.find("li:visible:not(:first)").not('.dropdown-header');

        if (visibleItems.length > 0) {
            selectedIdx = 0;
            visibleItems.removeClass("selected");
            $(visibleItems[0]).addClass("selected");
        }
    });
}

(function focusSearchInputOnDropdownOpen() {
    console.log("focusSearchInputOnDropdownOpen loaded");
    const $ = jQuery;

    $(document).on('click', '.firms', function () {
        console.log("firms clicked");
        // Kleine delay om zeker te zijn dat het menu in de DOM staat
        setTimeout(() => {
            const input = $('#firm-search-input');
            if (input.length) {
                input.focus();
            }
        }, 100);
    });
})();


function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
};

function addAliases(element){
    var element_Text = $(this).find("a").text().trim();
    var firm_name = "";
    switch (element_Text) {
        case 'Blueground':
            firm_name = 'Blueground (Fidiaz)';
            break;
        case 'Abbeloos Schinkels':
            firm_name = 'Abbeloos Schinkels (Cica)';
            break;
        case 'PwC Business Services':
            firm_name = 'PwC Business Services (EIT Digital)';
            break;
        case 'Fiscaldy':
            firm_name = 'Fiscaldy (AMPE)';
            break;
        case 'De Vlieger & CO':
            firm_name = 'De Vlieger & CO (Buyse)';
            break;
        case 'D&D Fisc':
            firm_name = 'D&D Fisc (dndfisc)';
            break;
        case 'JCV IMMO':
            firm_name = 'JCV IMMO (ACEG)';
            break;
        case 'De Luyker Services':
            firm_name = 'De Luyker Services (Heidi Hemelsoet)';
            break;
        case 'Boekhouding Tania Coudeville':
            firm_name = 'Boekhouding Tania Coudeville (Esperto)';
            break;
        case 'd&p':
            firm_name = 'd&p (Decupere)';
            break;
        default:
            firm_name = element_Text;
    }
    $(this).find("a").html(firm_name);
};