// ==UserScript==
// @name         Hooktube Extra
// @description  Hooktube/Invidio.us replacement of Youtube, with video source toggles.
// @match        *://*.hooktube.com/*
// @match        *://*.youtube.com/*
// @match        *://*.youtu.be/*
// @author       github.com/drylynch
// @version      0.1.0
// @grant        none
// @run-at       document-start
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAHFJREFUOE/NjtEJwCAMBd3DQTpFPztqR+t36gUFCaEa/elBiAm+I8kj50xJHWMQLshzHhKWbIXBCgptz6zvTzyB9vvCNJZ4grofS2xYh4gArOQ/ApiSeAJqKtzoJfSwAPikoZULegjDlmA5DP0FfjilF5ChqUcLsSa0AAAAAElFTkSuQmCC
// ==/UserScript==

/*

todo

- make t= and start= queries work as normal for invidious embeds
  - just put all queries onto invidious embed url!
- maybe find a way to not have to squeeze switch btn code into an onclick?
- maybe try to catch intra-youtube vid loading (event?)

*/


(function() {

// options
const DEFAULT_INVIDIOUS_EMBED = true;  // will we try to embed invidious by default?
const AUTOPLAY = true;  // will invidious vids autoplay on load?

// non-options
const PAGE = new URL(window.location);  // current page
const INTERVAL_TIME = 100;  // time in ms between intervals
const OVERRIDE_QUERY = 'hx_override'  // name of query on yt urls that disables auto redirect (only means something to this extension)
const EMBED_COOKIE = 'hx_embed';  // name of cookie that determines what video to embed
const PLAYER_ID = 'player-obj';  // hooktube's id for the html element that contains video url

// regex filters, not pretty but robust
const REGEX_INVIDIOUS_REDIRECT = /^(\/playlist\/?|\/embed\/.+?)$/i  // for redirects to invidious: matches '/playlist' and '/embed/[video id]' with optional trailing slash
const REGEX_YOUTUBE = /^(www\.)?youtube\.com$/i  // matches youtube hostname, optional www
const REGEX_HOOKTUBE = /^(www\.)?hooktube\.com$/i  // matches hooktube hostname, optional www

// this dirty motherfucker's onclick just inverts the embed cookie value (true / false), and refreshes the page.
// get_cookie function is the same as below
const BTN_SWITCH_HTML = `<button type='button' class='btn btn-default mb-2' onclick="` +
                            `function get_cookie(a) {var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)'); return b ? b.pop() : '';}` +
                            `document.cookie = '` + EMBED_COOKIE + `' + '=' + (get_cookie('` + EMBED_COOKIE + `') === 'true' ? 'false' :'true');` +
                            `location.reload();` +
                        `"><i class='fa fa-refresh'></i> Switch Embed</button>`;

// ----------------------------------------------------------------------------------------------------

/* replace embedded youtube vid with invidious */
function embed_invidious() {
    let player = document.getElementById(PLAYER_ID);
    if (typeof(player) !== 'undefined' && player !== null) {  // check element exists first
        let vid_url = player.src.split('?')[0];  // chuck the queries
        vid_url = vid_url.replace(/youtube.com/, 'invidio.us');  // make it invidious embed
        vid_url = vid_url + (AUTOPLAY ? '?autoplay=1' : '');  // add optional autoplay


        /*
        for (var pair of PAGE.searchParams.entries()) {
            console.log(key);
        }
        */

        player.src = vid_url;  // slot vid into player
        clearInterval(embed_loop);  // done
    }
}

/* place a nice button that allows to quickly switch between yt and invid embeds, and modify 'watch on youtube' button to override our auto-redirecting */
function do_button_stuff() {
    let btn_parent = document.getElementsByClassName('col')[0];
    if (typeof(btn_parent) !== 'undefined' && btn_parent !== null) {  // make sure parent exists
        btn_parent.lastElementChild.href = btn_parent.lastElementChild.href + '&' + OVERRIDE_QUERY + '=1';  // add override option to 'watch on youtube' button
        btn_parent.insertAdjacentHTML('beforeend', BTN_SWITCH_HTML);  // add 'switch embed' button
        clearInterval(btn_loop);  // done
    }
}

/* get cookie value (stolen from https://stackoverflow.com/questions/5639346) */
function get_cookie(a) {
    var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)'); return b ? b.pop() : '';
}

// ----------------------------------------------------------------------------------------------------

// youtube redirects
if (REGEX_YOUTUBE.test(PAGE.hostname)) {
    if (REGEX_INVIDIOUS_REDIRECT.test(PAGE.pathname)) {  // check for any paths for invidious
        window.location = window.location.toString().replace(/youtube.com/, 'invidio.us');  // playlists and standalone embedded vids go to invidious
    } else if (!PAGE.searchParams.has(OVERRIDE_QUERY)) {  // redirect if we don't find our override query
        window.location = window.location.toString().replace(/youtube.com/, 'hooktube.com');  // everything else goes to hooktube
    }
}

// hooktube actions
else if (REGEX_HOOKTUBE.test(PAGE.hostname)) {
    if (get_cookie(EMBED_COOKIE) === '') {  // cookie not set, set it to whatever's in the options
        document.cookie = EMBED_COOKIE + '=' + (DEFAULT_INVIDIOUS_EMBED ? 'true' : 'false');
    }
    if (get_cookie(EMBED_COOKIE) === 'true' && PAGE.pathname === '/watch') {
        var embed_loop = setInterval(embed_invidious, INTERVAL_TIME);  // wait til iframe with yt vid has loaded, and replace it
    }

    var btn_loop = setInterval(do_button_stuff, INTERVAL_TIME);  // always add our buttons
}

})();