// ==UserScript==
// @name     5. Silverfin: oauth tools
// @match    http*://live.getsilverfin.com/oauth/authorize/*
// @noframes
// @grant    GM_setValue
// @grant    GM_getValue
// ==/UserScript==
/* global jQuery, $ */
/* eslint-disable no-multi-spaces, curly */
'use strict';

$(document).ready(function() {
    sortFirms();
    console.log( "Sort finished" );
});


function sortFirms () {
    var $ = jQuery;  //  The page loads jQuery (and we are in grant none mode), but doesn't set `$`.
    var firmsLst  = $('select[id="authorized_firm_id"]');
    var itemsToSort = firmsLst.find ("option");
    var sortedItems = itemsToSort.sort (sortByLinkTextAscending)
    sortedItems.appendTo (firmsLst);
    function sortByLinkTextAscending (nodeA, nodeB) {
        var valA_Text  = $(nodeA).text ().trim ();
        var valB_Text  = $(nodeB).text ().trim ();

        if(valA_Text == "Fintrax Dev" || valA_Text == "Fintrax Demo"){
            return -1;
        }
        if(valB_Text == "Fintrax Dev" || valB_Text == "Fintrax Demo"){
            return 1;
        }
        else {
            return valA_Text.localeCompare (valB_Text, 'en', {sensitivity: 'base'} );
        }
    }
    // change default selected option to Fintrax Dev
    var fintraxDevOption = $('option[value="14120"]')
    fintraxDevOption.prop('selected', true).change()
};