// ==UserScript==
// @name     1. Silverfin: editor tools
// @match    http*://live.getsilverfin.com/f/*/edit*
// @match    http*://live.getsilverfin.com/partners/*
// @noframes
// @grant    GM_setValue
// @grant    GM_getValue
// ==/UserScript==
/* global jQuery, $ */
/* eslint-disable no-multi-spaces, curly */
'use strict';

var width_percentage = '90vw' //default 1200px
var height_percentage = '80vh' //default 65vh

var width_css = '.sf-grid { max-width: ' + width_percentage + '; }'
var height_css = '.page-input .sf-ace-editor-container { height: ' + height_percentage + '; }'

addGlobalStyle(width_css);
addGlobalStyle(height_css);
window.dispatchEvent(new Event('resize'));

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
};


////////////////////////////////////////////////////////////////////////////////////////////////////


var partner_handle = GM_getValue ("partner_handle", false);
//console.log('gm_value');
//console.log(partner_handle);
if(partner_handle){
    var partnerURLCheckTimer = setInterval(function() {
        console.log('check')
        var xpath_locator = "//div[text()='" + partner_handle + "']"
        console.log(xpath_locator);
        var handle_element = document.evaluate(xpath_locator, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        console.log(handle_element);
        if (handle_element) {
            var partner_url = handle_element.nextElementSibling.firstElementChild.getAttribute("href");
            console.log("partner url exists now");
            console.log(partner_url);
            window.location.replace(partner_url);
            clearInterval(partnerURLCheckTimer);
        }
    }, 200); // check every 200ms
    GM_setValue ("partner_handle", false);
};

var invisibleElementCheckTimer = setInterval (
    function () {
        if(document.querySelector("#fintrax-partner-menu") == null){
            addInvisibleElement();
            addPartnerButton();
        }
    }, 300 // check every 300ms for invisible element
);

function addInvisibleElement () {
    //Invisible element
    var invis_a = document.createElement("a");
    var invis_id_att = document.createAttribute("id");
    invis_id_att.value = "fintrax-partner-menu"
    invis_a.setAttributeNode(invis_id_att);
    document.querySelector("body").appendChild(invis_a);
};

function addPartnerButton () {
    //Partner button
    if(document.querySelector("ul.nav")){
        var partner_li = document.createElement("li");
        var partner_a = document.createElement("a");
        partner_a.addEventListener ("click", goToPartner, false);
        partner_a.innerHTML = "Live";
        partner_li.appendChild(partner_a);
        document.querySelector("ul.nav").appendChild(partner_li);
    }
};

function goToPartner () {
    console.log('partner button clicked');
    var partner_handle = document.querySelector("#reconciliation_text_handle").getAttribute("value");
    console.log(partner_handle)
    GM_setValue ("partner_handle", partner_handle);
    window.open('https://live.getsilverfin.com/partners/template_collection', '_blank').focus();
};