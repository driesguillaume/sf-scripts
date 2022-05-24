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
    var sortedItems = itemsToSort.sort(sortByLinkTextAscending)
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
};

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
};