// ==UserScript==
// @name     2. Silverfin: partner tools
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

addGlobalStyle('.sf-row { display: block; }');

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

