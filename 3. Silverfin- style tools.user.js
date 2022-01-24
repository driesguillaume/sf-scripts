// ==UserScript==
// @name     3. Silverfin: style tools
// @match    http*://live.getsilverfin.com/f/*/edit_template_hash*
// @match    http*://live.getsilverfin.com/f/*/exports/new*
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
        var i;
        for (i = 0; i < block_action_elements.length; i++) {
            if (block_action_elements[i].querySelector('a[data-behaviour="export-toggle-list"]') == null){
                console.log("Add collapse button")
                console.log(block_action_elements[i])
                collapseBlockButton(block_action_elements[i]);
                deselectAllButton(block_action_elements[i]);
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

function deselectAllButton (element) {
    var block_element = element.parentNode.parentNode
    var checkbox_elem_to_copy = block_element.querySelector('td.export-account-check > div.chCustom')
    var checkbox_elem = block_element.querySelector('.export_accounts_show_headers').appendChild(checkbox_elem_to_copy.cloneNode(true))
    checkbox_elem.addEventListener ("click", function() { deselectAll(block_element, checkbox_elem); });
};

function deselectAll (block_element, checkbox_elem) {
    console.log("deselectAll clicked")
    //var $allInputsForGroup, $this;
    var $block_element = $(block_element);
    var $checkbox_elem = $(checkbox_elem).find('input');
    var checked = $checkbox_elem.prop("checked");
    console.log(checked)
    //element.closest('tr').find('.export-attachment input').prop("checked", false);
    var $allInputsForGroup = $block_element.find('tr[class*="level_"] .export-account-check input');
    $allInputsForGroup.each(function() {
        $(this).prop("checked", checked);
    });
};


function collapseBlockButton (element) {
    var collapse_a = document.createElement("a");
    collapse_a.setAttribute("data-behaviour", "export-toggle-list");
    collapse_a.setAttribute("href", "#");
    collapse_a.setAttribute("class", "");

    var collapse_i = document.createElement("i");
    collapse_i.setAttribute("class", "icon icon-list-ul");

    collapse_a.appendChild(collapse_i);
    collapse_a.addEventListener ("click", function() { collapseBlock(element); });
    element.appendChild(collapse_a);
    element.setAttribute("id", "fintrax-collapse-button");
};

function collapseBlock (element) {
    console.log("Collapse block");
    //console.log(element.parentNode.parentNode.querySelectorAll('div.controls'));
    var controls_elements = element.parentNode.parentNode.querySelectorAll('div.controls');
    var controls_element = controls_elements[controls_elements.length - 1];
    //console.log(controls_element)
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
    var cloned_elem = document.querySelector(".export-list.ui-sortable").appendChild(elem.cloneNode(true));
    cloned_elem.removeAttribute("style")
    cloned_elem.removeAttribute("id")
    //$(selector).clone(true).appendTo('.export-list.ui-sortable').removeAttr('style');
};

