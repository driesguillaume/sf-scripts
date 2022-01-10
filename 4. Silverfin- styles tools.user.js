// ==UserScript==
// @name     4. Silverfin: styles tools
// @match    http*://live.getsilverfin.com/f/*/edit_template_hash*
// @noframes
// @grant    none
// ==/UserScript==
/* global jQuery, $ */
/* eslint-disable no-multi-spaces, curly */
'use strict';

var invisibleElementCheckTimer = setInterval (
    function () {
        if(document.querySelector("#fintrax-styles-menu") == null){
            addBlockButton('#add-export-title-page');
            addBlockButton('#add-export-accounts');
            addBlockButton('#add-export-report');
            addBlockButton('#add-export-permanent-document');
            addBlockButton('#add-export-permanent-text');
            addBlockButton('#add-export-adjustments');
            addInvisibleElement();
        };
        var block_action_elements = document.querySelectorAll('li[data-behaviour="export-element"]:not([style="display:none"]) > div > h4 > div.actions.export-list-actions:not(#fintrax-collapse-button)');
        if (block_action_elements.length != 0) {
            console.log("Add collapse button")
            console.log(block_action_elements)
            var i;
            for (i = 0; i < block_action_elements.length; i++) {
                collapseButton(block_action_elements[i]);
            };
        };
    }, 500 // check every 500ms for invisible element
);

function addInvisibleElement () {
    //Invisible element
    var invis_a = document.createElement("a");
    var invis_id_att = document.createAttribute("id");
    invis_id_att.value = "fintrax-styles-menu"
    invis_a.setAttributeNode(invis_id_att);
    document.querySelector("body").appendChild(invis_a);
};



function collapseButton (element) {
    var collapse_a = document.createElement("a");
    collapse_a.setAttribute("data-behaviour", "export-toggle-list");
    collapse_a.setAttribute("href", "#");
    collapse_a.setAttribute("class", "");

    var collapse_i = document.createElement("i");
    collapse_i.setAttribute("class", "icon icon-list-ul");

    collapse_a.appendChild(collapse_i);
    collapse_a.addEventListener ("click", function() { collapseBlock(collapse_a); });
    element.appendChild(collapse_a);
    element.setAttribute("id", "fintrax-collapse-button");
};

function collapseBlock (collapse_element) {
    var controls_element = collapse_element.parentNode.parentNode.parentNode.lastElementChild;
    var controls_class = controls_element.getAttribute("class");
    if (controls_class == "controls") {
        controls_element.setAttribute("class", "controls hidden");
    }
    else {
        controls_element.setAttribute("class", "controls");
    };
}

function addBlockButton (selector) {
    var button_a = document.createElement("a");
    button_a.addEventListener ("click", function() { addBlock(selector); });
    button_a.innerHTML = "Add";
    var box_selector = '[data-url="' + selector + '"] > h4 > div';
    document.querySelector(box_selector).appendChild(button_a);
};

function addBlock (selector) {
    console.log('addBlock button clicked');
    var elem = document.querySelector(selector);
    document.querySelector(".export-list.ui-sortable").appendChild(elem.cloneNode(true)).removeAttribute("style");
    //$(selector).clone(true).appendTo('.export-list.ui-sortable').removeAttr('style');
};

