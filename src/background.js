/*
Copyright (c) 2011, Steve Andersen
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


var shortIdLength = 15;
var longIdLength = 18;
var id = "";
var id18 = "";
var cleanLink = "";
var clickCount = 1;

ID_RE = [
    /http[s]?\:\/\/.*force\.com\/(\w{18})/,                                             // Matches id-18 for a standard salesforce page
    /http[s]?\:\/\/.*force\.com\/(\w{15})/,                                             // Matches id-15 for a standard salesforce page
    /http[s]?\:\/\/.*force\.com\/apex\/.*id=(\w{15})/,                                  // Matches id for an apex/visualforce page
    /http[s]?\:\/\/.*force\.com\/_ui\/core\/userprofile\/UserProfilePage\?u=(\w{15})/,  // Matches id for a User profile
    /http[s]?\:\/\/.*force\.com\/.*sObject\/(\w{18})\/.*/,
];

LINK_RE = [
    /(http[s]?\:\/\/.*force\.com\/\w{18})/,                                             // Matches link (id-18) for a standard salesforce page
    /(http[s]?\:\/\/.*force\.com\/\w{15})/,                                             // Matches link (id-15) for a standard salesforce page
    /(http[s]?\:\/\/.*force\.com\/apex\/.*id=\w{15})/,                                  // Matches link for an apex/visualforce page
    /(http[s]?\:\/\/.*force\.com\/_ui\/core\/userprofile\/UserProfilePage\?u=\w{15})/,  // Matches id for a User profile
    /(http[s]?\:\/\/.*force\.com\/.*sObject\/\w{18}\/view)/,
];

// Extract the ID from a URL and copy to clipboard
function extractID(url, regex_set) {
    if (!regex_set) regex_set = ID_RE;
    for (var i in regex_set) {
        var match = url.match(regex_set[i]);
        if (match) {
            //if we're getting an id, set the ids
            if(regex_set == ID_RE){
                setIds(match[1]);
            } else {
                cleanLink = match[1];
            }
            return true;
        }
    }
    return false;
}

// Extract a link from a URL (delegates to extractID)
function extractLink(url) {
    return extractID(url, LINK_RE);
}

function setIds(currentId) {
    //get Id and check to see if it's 18 chars, set truncated id if it is
    if(currentId.length==longIdLength) {
        id = currentId.substring(0,shortIdLength);
        id18 = currentId;
    } else {
        id = currentId;
        id18 = "";

        //thanks to Jeff Douglas for the 15 to 18 code
        var suffix = "";
        for (var i = 0; i < 3; i++) {
               var flags = 0;
            for (var j = 0; j < 5; j++) {
                var c = id.charAt(i * 5 + j);
                if (c >= 'A' && c <= 'Z') {
                    flags += 1 << j;
                }
            }
            if (flags <= 25) {
                suffix += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(flags);
            } else {
                suffix += "012345".charAt(flags-26);
            }
        }
        id18 = id + suffix;
    }
}

function copyToClipboard(copy_me) {
    //we need a dom element in which to put the string before we can copy it

    var copyFrom = document.createElement("textarea");
    copyFrom.textContent = copy_me;
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(copyFrom);
    copyFrom.select();
    document.execCommand('copy');
    body.removeChild(copyFrom);
    return true;
}

// Set up context menu tree at install time.
chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
        "title": "Copy Salesforce Id (15)",
        "contexts": ["link"],
        "id": "id15",
    });
    chrome.contextMenus.create({
        "title": "Copy Salesforce Id (18)",
        "contexts": ["link"],
        "id": "id18",
    });
    chrome.contextMenus.create({
        "title": "Copy Clean Salesforce URL",
        "contexts": ["link"],
        "id": "cleanURL",
    });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    let haveId = false;
    let haveLink = false;

    switch (info.menuItemId) {
        case "id15":
            haveId = extractID(info.linkUrl);
            if (haveId) copyToClipboard(id);
            break;
        case "id18":
            haveId = extractID(info.linkUrl);
            if (haveId) copyToClipboard(id18);
            break;
        case "cleanURL":
            haveLink = extractLink(info.linkUrl);
            if (haveLink) copyToClipboard(link);
            break;
        default:
            break;
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log(message);
    if (!sender.hasOwnProperty("id") || sender.id !== chrome.runtime.id) {
        // only accept messages from self
        return false;
    }

    switch (message) {
        case "test":
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                let currentURL = tabs[0].url;

                let haveLink = extractLink(currentURL);
                let haveId = extractID(currentURL);

                let resp = {
                    "id15": haveId ? id : null,
                    "id18": haveId ? id18 : null,
                    "cleanURL": haveLink ? cleanLink : null
                };

                sendResponse(resp);
            });
            return true;
        case "id15":
            copyToClipboard(id);
            break;
        case "id18":
            copyToClipboard(id18);
            break;
        case "cleanURL":
            copyToClipboard(cleanLink);
            break;
    }
});
