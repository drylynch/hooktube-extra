// ==UserScript==
// @name         Hooktube Extra
// @description  Hooktube/Invidio.us replacement of Youtube, with video source toggles.
// @match        *://*.hooktube.com/*
// @match        *://*.youtube.com/*
// @match        *://*.youtu.be/*
// @author       github.com/drylynch
// @version      0.1.3
// @grant        none
// @run-at       document-start
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjExR/NCNwAAAHFJREFUOE/NjtEJwCAMBd3DQTpFPztqR+t36gUFCaEa/elBiAm+I8kj50xJHWMQLshzHhKWbIXBCgptz6zvTzyB9vvCNJZ4grofS2xYh4gArOQ/ApiSeAJqKtzoJfSwAPikoZULegjDlmA5DP0FfjilF5ChqUcLsSa0AAAAAElFTkSuQmCC
// ==/UserScript==

(function() {

/*
todo
- make t= and start= queries work as normal for invidious embeds
  - just put all queries onto invidious embed url!
- maybe find a way to not have to squeeze switch btn code into an onclick?
- options menu for icons/autoplay?? kinda pointless atm
*/

// options
const DEFAULT_INVIDIOUS_EMBED = true;  // try to embed invidious by default?
const JUST_ICONS = false;  // make the buttons below the video just icons, instead of text?
const AUTOPLAY = true;  // autoplay invidious vids?
const REMOVE_SHIT = true;  // remove right-wing blog links?

// non-options
const THIS_URL = new URL(window.location);  // current page
const INTERVAL_TIME = 100;  // time in ms between intervals
const OVERRIDE_QUERY = 'hx_override'  // name of query on yt urls that disables auto redirect (only means something to this extension)
const EMBED_COOKIE = 'hx_embed';  // name of embed cookie
const PLAYER_ID = 'player-obj';  // hooktube's id for the element that contains video url

// regex filters
const RE_INVIDIOUS_REDIRECT = /^(\/playlist\/?|\/embed\/.+?)$/i  // for redirects to invidious: matches '/playlist' and '/embed/[video id]' with optional trailing slash
const RE_YOUTUBE = /^(www\.)?youtube\.com$/i  // matches youtube hostname, optional www
const RE_HOOKTUBE = /^(www\.)?hooktube\.com$/i  // matches hooktube hostname, optional www

// html for switch button, its onclick just inverts the embed cookie value (true / false), and refreshes the page. the 'get_cookie' function is the same as below
const BTN_SWITCH_HTML = `<button type='button' class='btn btn-default mb-2' onclick="` +
                        `function get_cookie(a) {var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)'); return b ? b.pop() : '';}` +
                        `document.cookie = '` + EMBED_COOKIE + `' + '=' + (get_cookie('` + EMBED_COOKIE + `') === 'true' ? 'false' :'true');` +
                        `location.reload();` +
                        `"><i class='fa fa-refresh'></i> Switch Embed</button>`;

// html for view channel button, goes to youtube without redirecting. gross but works.
const BTN_VIEW_CHANNEL_ON_YOUTUBE_HTML = "<a href='" + ((THIS_URL.href.replace(/hooktube.com/, 'youtube.com')) + (THIS_URL.searchParams ? "&" : "?") + "hx_override=1") + "'><button type='button' class='btn btn-default mb-3'><i class='fa fa-youtube-play'></i> View Channel on YouTube</button></a>"


// ----------------------------------------------------------------------------------------------------

/* replace embedded youtube vid with invidious */
function embed_invidious() {
    let player = document.getElementById(PLAYER_ID);
    if (typeof(player) !== 'undefined' && player !== null) {  // check element exists first
        let vid_url = player.src.split('?')[0];  // chuck the queries
        vid_url = vid_url.replace(/youtube.com/, 'invidio.us');  // make it invidious
        vid_url = vid_url + (AUTOPLAY ? '?autoplay=1' : '');  // add optional autoplay
        player.src = vid_url;  // slot vid into player
        player.focus();
        clearInterval(embed_loop);  // done
    }
}

/* add embed switcher to buttons below videos, change buttons to just icons */
function modify_video_page() {
    let btn_parent = document.getElementsByClassName('col')[0];
    btn_parent.insertAdjacentHTML('beforeend', BTN_SWITCH_HTML);  // pop in 'switch embed' btn
    let btn_list = btn_parent.getElementsByTagName('button');  // none of the btms have ids or unique classes so we just gotta hard code it
    let btn_yt = btn_list[6];  // 'watch on youtube' btn
    btn_yt.parentElement.href = btn_yt.parentElement.href + '&' + OVERRIDE_QUERY + '=1';  // append our override query to 'watch on yt' btn
    if (JUST_ICONS) {
      let btn_dl = btn_list[0];  // 'download' btn
      let btn_switch = btn_list[7];  // 'switch embed' btn
      btn_yt.innerHTML = '';  // clear text from all btns
      btn_dl.innerHTML = '';
      btn_switch.innerHTML = '';
      btn_yt.className = btn_yt.className + ' fa fa-youtube-play';  // add youtube play icon
      btn_dl.className = btn_dl.className + ' fa fa-download';  // the child i tag inside this btn has been cleared, so give the btn itself the icon
      btn_switch.className = btn_switch.className + ' fa fa-refresh';  // same situation as btn_dl
      btn_yt.title = 'Watch on Youtube';  // add hover titles in place of labels
      btn_dl.title = 'Download';
      btn_switch.title = 'Switch Embed';
    }
}

/* add 'view on youtube' to channel pages */
function modify_channel_page() {
    let channel_title = document.getElementById('generic-title');
    channel_title.insertAdjacentHTML('afterend', BTN_VIEW_CHANNEL_ON_YOUTUBE_HTML);
    channel_title.style.display = 'inline';  // keep title and button on same line: #generic-title is originally block
    channel_title.style.marginRight = '1rem';  // not too close now
}

/* hide elements with right-wing shit */
function remove_shit() {
    document.querySelector(".mr-auto").style.display = "none";  // blog links in navbar
    if (window.location.href === 'https://hooktube.com/') {  // on homepage
        nodes = document.querySelectorAll(".main > :not(:first-child)");  // trending videos and blog links
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].style.display = "none";
        }
    } else {  // not homepage
        document.getElementById('video-list-prom').style.display = 'none';  // ad in video column
        document.getElementById('articles-feed').style.display = 'none';  // blog links
    }
}

/* get cookie value (stolen from https://stackoverflow.com/questions/5639346) */
function get_cookie(a) {
    var b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)'); return b ? b.pop() : '';
}

// ----------------------------------------------------------------------------------------------------

// remove shit on document-end (need to wait until html fully loaded)
if (REMOVE_SHIT) {
    document.addEventListener("DOMContentLoaded", remove_shit);
}

// youtube redirects: playlists & standalone embedded vids go to invidious,everything else to hooktube
if (RE_YOUTUBE.test(THIS_URL.hostname)) {
    if (RE_INVIDIOUS_REDIRECT.test(THIS_URL.pathname)) {
        window.location = window.location.toString().replace(/youtube.com/, 'invidio.us');
    } else if (!THIS_URL.searchParams.has(OVERRIDE_QUERY)) {  // go to hooktube if we don't find our override query
        window.location = window.location.toString().replace(/youtube.com/, 'hooktube.com');
    }
}

// hooktube actions
else if (RE_HOOKTUBE.test(THIS_URL.hostname)) {
    if (get_cookie(EMBED_COOKIE) === '') {  // cookie not set, set it to whatever's in the options
        document.cookie = EMBED_COOKIE + '=' + (DEFAULT_INVIDIOUS_EMBED ? 'true' : 'false');
    }
    let pagename = THIS_URL.pathname.split('/')[1];
    if (pagename === 'watch') {  // video page
        if (get_cookie(EMBED_COOKIE) === 'true') {
          var embed_loop = setInterval(embed_invidious, INTERVAL_TIME);  // wait til iframe with yt vid has loaded, and replace it
        }
        document.addEventListener("DOMContentLoaded", modify_video_page);  // always modify video pages
    } else if (pagename === 'channel' || pagename === 'user') {  // channel page
        document.addEventListener("DOMContentLoaded", modify_channel_page);
    }
}

})();