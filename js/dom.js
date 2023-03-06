"use strict";

// ============================================================================
// DEFAULTS
// ============================================================================

const default_avatar_user = "img/user_default.png";
const default_avatar_bot = "img/bot_default.png";

const default_profile = {
    "name": "You",
    "avatar": "",
}

const default_settings = {
    "api_url": "",
    "max_length": 128,
    "context_size": 1024,
    "temperature": 0.5,
    "repetition_penalty": 1.05,
    "repetition_slope": 1,
    "penalty_range": 1024,
    "top_p": 0.9,
    "top_k": 40,
    "typical_p": 1,
}

// ============================================================================
// CONST
// ============================================================================

const SVG = {
    add: `<svg viewBox="-3 -3 28 28" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M19.25 1a.75.75 0 01.75.75V4h2.25a.75.75 0 010 1.5H20v2.25a.75.75 0 01-1.5 0V5.5h-2.25a.75.75 0 010-1.5h2.25V1.75a.75.75 0 01.75-.75zM9 6a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM4 9.5a5 5 0 117.916 4.062 7.973 7.973 0 015.018 7.166.75.75 0 11-1.499.044 6.469 6.469 0 00-12.932 0 .75.75 0 01-1.499-.044 7.973 7.973 0 015.059-7.181A4.993 4.993 0 014 9.5z"/></svg>`,
    arrow: `<svg viewBox="0 0 24 20" version="1.1" xmlns="http://www.w3.org/2000/svg"><polygon points="15 4 17 6 11 12 17 18 15 20 7 12"></polygon></svg>`,
    close: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" stroke-width="2" d="M3,3 L21,21 M3,21 L21,3"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    delete: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="48" width="448" height="80" rx="32" ry="32"/><path d="M74.45,160a8,8,0,0,0-8,8.83L92.76,421.39a1.5,1.5,0,0,0,0,.22A48,48,0,0,0,140.45,464H371.54a48,48,0,0,0,47.67-42.39l0-.21,26.27-252.57a8,8,0,0,0-8-8.83ZM323.31,340.69a16,16,0,1,1-22.63,22.62L256,318.63l-44.69,44.68a16,16,0,0,1-22.63-22.62L233.37,296l-44.69-44.69a16,16,0,0,1,22.63-22.62L256,273.37l44.68-44.68a16,16,0,0,1,22.63,22.62L278.62,296Z"/></svg>`,
    dots: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10.001 7.8a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 10 7.8zm-7 0a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 3 7.8zm14 0a2.2 2.2 0 1 0 0 4.402A2.2 2.2 0 0 0 17 7.8z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m18.988 2.012 3 3L19.701 7.3l-3-3zM8 16h3l7.287-7.287-3-3L8 13z"/><path d="M19 19H8.158c-.026 0-.053.01-.079.01-.033 0-.066-.009-.1-.01H5V5h6.847l2-2H5c-1.103 0-2 .896-2 2v14c0 1.104.897 2 2 2h14a2 2 0 0 0 2-2v-8.668l-2 2V19z"/></svg>`,
    history: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0H24V24H0z"/><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12h2c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-8-8-8C9.25 4 6.824 5.387 5.385 7.5H8v2H2v-6h2V6c1.824-2.43 4.729-4 8-4zm1 5v4.585l3.243 3.243-1.415 1.415L11 12.413V7h2z"/></svg>`,
    import: `<svg viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" ><path d="M13,13.1752814 L16.2426407,9.93264074 L17.6568542,11.3468543 L12,17.0037086 L6.34314575,11.3468543 L7.75735931,9.93264074 L11,13.1752814 L11,2 L13,2 L13,13.1752814 Z M4,16 L6,16 L6,20 L18,20 L18,16 L20,16 C20,17.3333333 20,18.6666667 20,20 C20,21.1000004 19.1000004,22 18,22 C18,22 6,22 6,22 C4.9000001,22 4,21.037204 4,20 C4,20 4,18.6666667 4,16 Z"/></svg>`,
    menu: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M16.4 9H3.6c-.552 0-.6.447-.6 1 0 .553.048 1 .6 1h12.8c.552 0 .6-.447.6-1s-.048-1-.6-1zm0 4H3.6c-.552 0-.6.447-.6 1 0 .553.048 1 .6 1h12.8c.552 0 .6-.447.6-1s-.048-1-.6-1zM3.6 7h12.8c.552 0 .6-.447.6-1s-.048-1-.6-1H3.6c-.552 0-.6.447-.6 1s.048 1 .6 1z"/></svg>`,
    new: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9 10V8h2v2h2v2h-2v2H9v-2H7v-2h2zM0 3c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3zm2 2v12h16V5H2z"/></svg>`,
    reload: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" ><path d="M484.08,296.216c-5.1-5.128-11.848-7.936-19.032-7.936H330.516c-14.828,0-26.86,12.036-26.86,26.868v22.796 c0,7.168,2.784,14.064,7.884,19.16c5.092,5.088,11.82,8.052,18.976,8.052H366.1c-31.544,30.752-74.928,50.08-120.388,50.08 c-71.832,0-136.028-45.596-159.744-113.344c-5.392-15.404-19.972-25.784-36.28-25.784c-4.316,0-8.592,0.708-12.7,2.144 c-9.692,3.396-17.48,10.352-21.932,19.596c-4.456,9.248-5.04,19.684-1.648,29.368c34.496,98.54,127.692,164.74,232.144,164.74 c64.132,0,123.448-23.948,169.572-67.656v25.22c0,14.836,12.384,27.108,27.224,27.108h22.792c14.84,0,26.86-12.272,26.86-27.108 V315.24C492,308.056,489.2,301.304,484.08,296.216z"/><path d="M478.628,164.78C444.132,66.244,350.916,0.044,246.464,0.044c-64.136,0-123.464,23.952-169.588,67.66v-25.22 c0-14.832-12.344-27.112-27.184-27.112H26.896C12.06,15.372,0,27.652,0,42.484V176.76c0,7.18,2.824,13.868,7.944,18.964 c5.096,5.128,11.86,7.932,19.044,7.932l-0.08,0.06h134.604c14.84,0,26.832-12.028,26.832-26.86v-22.8 c0-14.836-11.992-27.216-26.832-27.216h-35.576c31.544-30.752,74.932-50.076,120.392-50.076 c71.832,0,136.024,45.596,159.74,113.348c5.392,15.404,19.968,25.78,36.28,25.78c4.32,0,8.588-0.704,12.7-2.144 c9.696-3.396,17.48-10.348,21.932-19.596C481.432,184.9,482.02,174.472,478.628,164.78z"/></svg>`,
    loading: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" r="36" class="loading-outer" stroke-width="10" fill="none"/><circle cx="50" cy="50" r="36" class="loading-inner" stroke-width="8" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;180 50 50;720 50 50" keyTimes="0;0.5;1"/><animate attributeName="stroke-dasharray" repeatCount="indefinite" dur="1s" values="18.84955592153876 169.64600329384882;94.2477796076938 94.24777960769377;18.84955592153876 169.64600329384882" keyTimes="0;0.5;1"/></circle></svg>`,
    send: `<svg viewBox="-32 -32 320 320" xmlns="http://www.w3.org/2000/svg"><path d="M102.162,181.973l57.091-75.709-81.129,59.29s-4.34,3.953-8.013,3.649a14.023,14.023,0,0,1-6.01-1.824L7.011,148.223S0.2,145.5,0,141.838c-0.334-6.081,8.013-9.122,8.013-9.122L240.381,13.223s6.47-4.323,12.02-.912c5.534,3.4,3,9.122,3,9.122L219.348,210.25s-0.45,4.845-5.008,6.385a12.074,12.074,0,0,1-8.013,0l-57.09-18.243-31.049,40.135S115.517,244,110.175,244c-8.013,0-8.013-7.3-8.013-7.3v-54.73Z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9.954 2.21a9.99 9.99 0 0 1 4.091-.002A3.993 3.993 0 0 0 16 5.07a3.993 3.993 0 0 0 3.457.261A9.99 9.99 0 0 1 21.5 8.876 3.993 3.993 0 0 0 20 12c0 1.264.586 2.391 1.502 3.124a10.043 10.043 0 0 1-2.046 3.543 3.993 3.993 0 0 0-3.456.261 3.993 3.993 0 0 0-1.954 2.86 9.99 9.99 0 0 1-4.091.004A3.993 3.993 0 0 0 8 18.927a3.993 3.993 0 0 0-3.457-.26A9.99 9.99 0 0 1 2.5 15.121 3.993 3.993 0 0 0 4 11.999a3.993 3.993 0 0 0-1.502-3.124 10.043 10.043 0 0 1 2.046-3.543A3.993 3.993 0 0 0 8 5.071a3.993 3.993 0 0 0 1.954-2.86zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>`,
    share: `<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" ><path d="M45.975,37.031c-3.049,0-5.783,1.314-7.69,3.4l-16.566-7.968c0.396-1.103,0.622-2.282,0.622-3.521 c0-1.237-0.227-2.418-0.622-3.521l16.566-7.966c1.907,2.085,4.644,3.402,7.69,3.402c5.759,0,10.429-4.669,10.429-10.428 C56.404,4.669,51.734,0,45.975,0c-5.76,0-10.429,4.669-10.429,10.429c0,0.552,0.056,1.09,0.139,1.619l-17.635,8.479 c-1.724-1.26-3.842-2.012-6.141-2.012c-5.759,0-10.428,4.668-10.428,10.425c0,5.762,4.669,10.43,10.428,10.43 c2.299,0,4.417-0.752,6.14-2.014l17.634,8.481c-0.082,0.529-0.139,1.067-0.139,1.619c0,5.76,4.67,10.428,10.43,10.428 c5.759,0,10.428-4.668,10.428-10.428C56.402,41.697,51.734,37.031,45.975,37.031z"/></svg>`,
    thumbsup: `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M466.27 286.69C475.04 271.84 480 256 480 236.85c0-44.015-37.218-85.58-85.82-85.58H357.7c4.92-12.81 8.85-28.13 8.85-46.54C366.55 31.936 328.86 0 271.28 0c-61.607 0-58.093 94.933-71.76 108.6-22.747 22.747-49.615 66.447-68.76 83.4H32c-17.673 0-32 14.327-32 32v240c0 17.673 14.327 32 32 32h64c14.893 0 27.408-10.174 30.978-23.95 44.509 1.001 75.06 39.94 177.802 39.94 7.22 0 15.22.01 22.22.01 77.117 0 111.986-39.423 112.94-95.33 13.319-18.425 20.299-43.122 17.34-66.99 9.854-18.452 13.664-40.343 8.99-62.99zm-61.75 53.83c12.56 21.13 1.26 49.41-13.94 57.57 7.7 48.78-17.608 65.9-53.12 65.9h-37.82c-71.639 0-118.029-37.82-171.64-37.82V240h10.92c28.36 0 67.98-70.89 94.54-97.46 28.36-28.36 18.91-75.63 37.82-94.54 47.27 0 47.27 32.98 47.27 56.73 0 39.17-28.36 56.72-28.36 94.54h103.99c21.11 0 37.73 18.91 37.82 37.82.09 18.9-12.82 37.81-22.27 37.81 13.489 14.555 16.371 45.236-5.21 65.62zM88 432c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"/></svg>`,
}

const date_options = {
    "hour12": false,
    "hourCycle": "h23",
    "year": "numeric",
    "month": "2-digit",
    "day": "2-digit",
    "hour": "2-digit",
    "minute": "2-digit",
}

// ============================================================================
// DOM
// ============================================================================

const DOM_CHAT = document.getElementById("chat")
const DOM_MESSAGES = document.getElementById("messages")
const DOM_INPUT = document.getElementById("input")

const DOM_INPUT_OPTIONS_BUTTON = document.getElementById("options-button")
const DOM_INPUT_OPTIONS_WINDOW = document.getElementById("options")

const DOM_INPUT_AREA = document.getElementById("input")
const DOM_INPUT_FIELD = document.getElementById("input-field")
const DOM_INPUT_SEND = document.getElementById("input-send")
const DOM_INPUT_LOADING = document.getElementById("input-loading")

const DOM_CHAT_OPTIONS_SHARE = document.getElementById("chat-share")
const DOM_CHAT_OPTIONS_NEW = document.getElementById("chat-new")
const DOM_CHAT_OPTIONS_HISTORY = document.getElementById("chat-history")
const DOM_CHAT_OPTIONS_REGENERATE = document.getElementById("chat-regenerate")
const DOM_CHAT_OPTIONS_DELETE = document.getElementById("chat-delete")

const DOM_DELETE = document.getElementById("delete")
const DOM_DELETE_CANCEL = document.getElementById("delete-cancel")
const DOM_DELETE_CONFIRM = document.getElementById("delete-confirm")

const DOM_HISTORY = document.getElementById("history")
const DOM_HISTORY_OPTIONS = document.getElementById("history-options")
const DOM_HISTORY_IMPORT_CAI = document.getElementById("history-import-cai")
const DOM_HISTORY_IMPORT_TAVERN = document.getElementById("history-import-tavern")
const DOM_HISTORY_BACK = document.getElementById("history-back")

const DOM_CHARACTER_ADD = document.getElementById("add")
const DOM_CHARACTER_IMPORT = document.getElementById("import")
const DOM_CHARACTER_LIST = document.getElementById("list")

const DOM_SIDEBAR_LEFT = document.getElementById("sidebar-left")
const DOM_SIDEBAR_RIGHT = document.getElementById("sidebar-right")

const DOM_EDIT_CLOSE = document.getElementById("edit-close")
const DOM_EDIT_AVATAR = document.getElementById("edit-avatar")
const DOM_EDIT_AVATAR_UPLOAD = document.getElementById("edit-avatar-upload")
const DOM_EDIT_NAME = document.getElementById("edit-name")
const DOM_EDIT_DESCRIPTION = document.getElementById("edit-description")
const DOM_EDIT_GREETING = document.getElementById("edit-greeting")
const DOM_EDIT_PERSONALITY = document.getElementById("edit-personality")
const DOM_EDIT_SCENARIO = document.getElementById("edit-scenario")
const DOM_EDIT_DIALOGUE = document.getElementById("edit-dialogue")
const DOM_EDIT_TOKENS = document.getElementById("edit-tokens")

const DOM_EDIT_CREATE = document.getElementById("edit-create")
const DOM_EDIT_EXPORT = document.getElementById("edit-export")
const DOM_EDIT_DELETE = document.getElementById("edit-delete")

const DOM_PROFILE_NAME = document.getElementById("field-profile-name")
const DOM_PROFILE_AVATAR = document.getElementById("image-profile-avatar")
const DOM_PROFILE_UPLOAD = document.getElementById("profile-avatar-upload")

const DOM_SETTINGS_STATUS = document.getElementById("setting-status")
const DOM_SETTINGS_CONNECT = document.getElementById("setting-api_connect")
const DOM_SETTINGS_DISCONNECT = document.getElementById("setting-api_disconnect")
const DOM_SETTINGS_RESET = document.getElementById("setting-reset")

const DOM_SETTINGS_API_URL = document.getElementById("field-api_url")
const DOM_SETTINGS_MAX_LENGTH = document.getElementById("field-max_length")
const DOM_SETTINGS_CONTEXT_SIZE = document.getElementById("field-context_size")
const DOM_SETTINGS_TEMPERATURE = document.getElementById("field-temperature")
const DOM_SETTINGS_REPETITION_PENALTY = document.getElementById("field-repetition_penalty")
const DOM_SETTINGS_PENALTY_RANGE = document.getElementById("field-penalty_range")
const DOM_SETTINGS_PENALTY_SLOPE = document.getElementById("field-rep_pen_slope")
const DOM_SETTINGS_TOP_P = document.getElementById("field-top_p")
const DOM_SETTINGS_TOP_K = document.getElementById("field-top_k")
const DOM_SETTINGS_TYPICAL_P = document.getElementById("field-typical_p")

const DOM_SECTION_EDITING = document.getElementById("editing")
const DOM_SECTION_PROFILE = document.getElementById("profile")
const DOM_SECTION_SETTINGS = document.getElementById("settings")

const DOM_HEADER_CHARACTERS_BUTTON = document.getElementById("header-characters-button")
const DOM_HEADER_SETTINGS_BUTTON = document.getElementById("header-settings-button")

// ============================================================================
// METHODS
// ============================================================================

function ClearTextArea(){
    DOM_INPUT_FIELD.value = "";
    console.debug("Cleared text area");
}

function ResizeTextArea(target){
    let temp = target.style.height;
    target.style.height = "0px";
    target.style.height = (target.scrollHeight) + "px";
    if( temp != target.style.height ){
        console.debug("Resized input area to " + DOM_INPUT_FIELD.style.height);
    }
}

function ResizeInputField(){
    let temp = DOM_INPUT_FIELD.style.height;
    DOM_INPUT_FIELD.style.height = "0px";
    DOM_INPUT_FIELD.style.height = (DOM_INPUT_FIELD.scrollHeight) + "px";
    DOM_CHAT.style.gridTemplateRows = "auto " + (DOM_INPUT_AREA.clientHeight + 36) + "px 0px";
    if( temp != DOM_INPUT_FIELD.style.height ){
        console.debug("Resized text area to " + DOM_INPUT_FIELD.style.height);
    }
}

function ToggleSendButton(b){
    busy = !b;
    DOM_INPUT_SEND.disabled = !b;
    SetClass(DOM_INPUT_SEND, "hidden", !b)
    SetClass(DOM_INPUT_LOADING, "hidden", b)
}

function ToggleChat(state = true){
    SetClass( DOM_CHAT, "hidden", !state )
    SetClass( DOM_MESSAGES, "hidden", !state )
    SetClass( DOM_INPUT, "hidden", !state )
    SetClass( DOM_DELETE, "hidden", true )
    SetClass( DOM_HISTORY, "hidden", true )
    SetClass( DOM_HISTORY_OPTIONS, "hidden", true )
    
    if( state ){
        ResizeInputField();
        DOM_MESSAGES.scrollTo( 0, DOM_MESSAGES.scrollHeight )
    }
}

function OpenCharacterEditing(json){
    // hack to re-trigger the fade-in animation
    /**/ SetClass(DOM_SECTION_EDITING, "hidden", true);
    /**/ void DOM_SECTION_EDITING.offsetWidth;
    /**/ SetClass(DOM_SECTION_EDITING, "hidden", false);

    DOM_SECTION_EDITING.scrollTo(0,0);
    
    if(json){
        SetClass(DOM_EDIT_CREATE, "hidden", true);
        SetClass(DOM_EDIT_EXPORT, "hidden", true);
        SetClass(DOM_EDIT_DELETE, "hidden", false);
    }else{
        SetClass(DOM_EDIT_CREATE, "hidden", false);
        SetClass(DOM_EDIT_EXPORT, "hidden", true);
        SetClass(DOM_EDIT_DELETE, "hidden", true);
    }
}

function ApplyProfile(json){
    DOM_PROFILE_NAME.value = json.name;
    DOM_PROFILE_AVATAR.setAttribute("src", json.avatar ? json.avatar : "img/user_default.png");
    SetAvatarCSS("user", json.avatar ? json.avatar : "img/user_default.png" )
}

function ApplyCharacter(json){
    DOM_EDIT_AVATAR.setAttribute( "src", json.metadata.filepath ? json.metadata.filepath : "img/bot_default.png" );
    DOM_EDIT_NAME.value = json.name;
    DOM_EDIT_DESCRIPTION.value = json.description;
    DOM_EDIT_GREETING.value = json.greeting;
    DOM_EDIT_PERSONALITY.value = json.personality;
    DOM_EDIT_SCENARIO.value = json.scenario;
    DOM_EDIT_DIALOGUE.value = json.dialogue;
}

function ApplySettings(json){
    DOM_SETTINGS_API_URL.value = json.api_url;
    DOM_SETTINGS_MAX_LENGTH.value = json.max_length;
    DOM_SETTINGS_CONTEXT_SIZE.value = json.context_size;
    DOM_SETTINGS_TEMPERATURE.value = json.temperature;
    DOM_SETTINGS_REPETITION_PENALTY.value = json.repetition_penalty;
    DOM_SETTINGS_PENALTY_RANGE.value = json.penalty_range;
    DOM_SETTINGS_TOP_P.value = json.top_p;
    DOM_SETTINGS_TOP_K.value = json.top_k;
    DOM_SETTINGS_TYPICAL_P.value = json.typical_p;

    let elem = document.querySelectorAll(`#settings input[type="text"]`);
    for( let i = 0; i < elem.length; i++ ){
        elem[i].dispatchEvent(new Event("change"))
    }
}

function ApplySVG(){
    let total = 0;
    for( const[key,value] of Object.entries(SVG)){
        var elem = document.querySelectorAll(".svg-" + key)
        if( elem == null ) continue;
        for( let i = 0; i < elem.length; i++ ){
            elem[i].innerHTML = value + elem[i].innerHTML
            total += 1;
        }
    }
    console.debug(`Applied inline SVG to ${total} element(s)`)
}

function BuildCollapsibles(){
    var elem = document.getElementsByClassName("collapsible");

    for (let i = 0; i < elem.length; i++) {
        elem[i].addEventListener("click", function() {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            content.scrollIntoView(true);
            if (content.style.maxHeight){
                content.style.maxHeight = null;
            } else {
                // content.style.maxHeight = content.scrollHeight + "px";
                content.style.maxHeight = "fit-content"
            } 
        });
    }

    console.debug(`Applied functionality to ${elem.length} collapsible section(s)`)
}

function BuildSettings(){
    var elem = document.getElementsByClassName("setting");

    for(let i = 0; i < elem.length; i++){
        let dom = elem[i]

        let text = null;
        let range = null;

        let fields = dom.getElementsByTagName("input")
        for( let j = 0; j < fields.length; j++){
            switch(fields[j].getAttribute("type")){
                case "text": text = fields[j]; break;
                case "range": range = fields[j]; break;
                default: break;
            }
        }

        if(text && range){
            text.addEventListener("change", (e) => {
                let val = parseFloat(text.value)
                if(isNaN(val)){
                    text.value = text.defaultValue;
                    range.value = text.defaultValue;
                    return;
                }
                
                let _min = parseFloat(range.min)
                let _max = parseFloat(range.max)
                
                if(val < _min){ val = _min; }
                if(val > _max){ val = _max; }
                
                text.value = val;
                range.value = val;
            });

            range.addEventListener("input", (e) => {
                text.value = e.target.value;
            });
        }
    }

    console.debug(`Applied functionality to ${elem.length} settings section(s)`)
}

function BuildTabs(){
    let tabGroups = document.getElementsByClassName("tab-group")
    for(let i = 0; i < tabGroups.length; i++){
        let currentGroup = tabGroups[i]

        for(let g = 0; g < currentGroup.children.length; g++){
            let currentTab = currentGroup.children[g]
        
            currentTab.onclick = function(){
                let allTabs = currentTab.parentNode.getElementsByClassName("tab")
                for(let k = 0; k < allTabs.length; k++){
                    allTabs[k].classList.remove("selected")
                }
    
                currentTab.classList.add("selected")
    
                let containers = currentTab.parentNode.parentNode.getElementsByClassName("tab-container")
                for(let j = 0; j < containers.length; j++){
                    containers[j].classList.add("hidden")
                    if( currentTab.id.replaceAll("target-", "") == containers[j].id ){
                        containers[j].classList.remove("hidden")
                    }
                }
            }
        }
    }
    console.debug(`Applied functionality to ${tabGroups.length} tab group(s)`)
}

function GetElementIndex(parent, dom){
    return Array.prototype.indexOf.call(parent.children, dom )
}

function ResetSettings(){
    let inputs = DOM_SECTION_SETTINGS.getElementsByTagName("input");
    for( let i = 0; i < inputs.length; i++ ){
        if( inputs[i].id == "field-api_url" ) continue;
        inputs[i].value = inputs[i].defaultValue;
    }
    DOM_SECTION_SETTINGS.dispatchEvent(new Event("change"))
}

function MarkDelete(target, e){
    if( !DOM_MESSAGES.classList.contains("delete-mode") ) return;

    let main_checkbox = target.children[2]
    if( e.target == main_checkbox ) return;

    let _found = false;
    let _messages = document.getElementsByClassName("msg");

    for( let i = 0; i < _messages.length; i++ ){
        let msg = _messages[i];
        let checkbox = msg.children[2];
        
        msg.classList.remove("delete");
        checkbox.checked = false;
        
        if(_found || msg == target){
            msg.classList.add("delete");
            checkbox.checked = true;
            _found = true;
        }
    }
}


function SetAvatarCSS(rule, url){
    let prefix = `.msg.${rule} .avatar`;
    let style = `{ background-image: url("${url}"); }`;

    let tags = document.head.getElementsByTagName("style")
    for(let i = 0; i < tags.length; i++){
        if(tags[i].innerHTML.startsWith(prefix)){
            tags[i].innerHTML = `${prefix}${style}`
            return;
        }
    }

    let tag = document.createElement("style")
    tag.innerHTML = `${prefix}${style}`
    document.head.appendChild(tag);
}

function SetServerStatus(code){
    if(code == null){
        DOM_SETTINGS_STATUS.innerHTML = "Connecting...";
        DOM_SETTINGS_STATUS.classList.remove("confirm");
        DOM_SETTINGS_STATUS.classList.remove("danger");
    }else if(code == 200){
        DOM_SETTINGS_STATUS.innerHTML = "Connected";
        DOM_SETTINGS_STATUS.classList.add("confirm")
        DOM_SETTINGS_STATUS.classList.remove("danger")
    }else{
        DOM_SETTINGS_STATUS.innerHTML = "Not connected";
        DOM_SETTINGS_STATUS.classList.add("danger")
        DOM_SETTINGS_STATUS.classList.remove("confirm")
    }
}

function SetClass(element, css, state){
    if(element != null){
        if(state){
            element.classList.add(css);
        }else{
            element.classList.remove(css);
        }
    }
}

function ToggleClass(element, css){
    if(element != null){
        element.classList.toggle(css);
    }
}

function RemoveAllChildren(dom){
    while (dom.lastElementChild) {
        dom.removeChild(dom.lastElementChild);
    }
}

// ============================================================================
// EVENTS
// ============================================================================

window.addEventListener('click', function (e) {
    let elements = document.getElementsByClassName("auto-close");
    for( let i = 0; i < elements.length; i++ ){
        if(!elements[i].contains(e.target) && !elements[i].previousElementSibling.contains(e.target)){
            elements[i].classList.add("hidden");
        }
    }
});

// ============================================================================
// SETUP
// ============================================================================

SetAvatarCSS( "bot", "img/bot_default.png" )
SetAvatarCSS( "user", "img/user_default.png" )

DOM_HEADER_CHARACTERS_BUTTON.addEventListener("click", () => ToggleClass(DOM_SIDEBAR_LEFT, "active"));
DOM_HEADER_SETTINGS_BUTTON.addEventListener("click", () => ToggleClass(DOM_SIDEBAR_RIGHT, "active"));
DOM_INPUT_OPTIONS_BUTTON.addEventListener("click", () => ToggleClass(DOM_INPUT_OPTIONS_WINDOW, "hidden"));
DOM_INPUT_FIELD.addEventListener("input", () => ResizeInputField());
DOM_EDIT_CLOSE.addEventListener("click", () => SetClass(DOM_SECTION_EDITING, "hidden", true));
DOM_SETTINGS_RESET.addEventListener("click", () => ResetSettings());

ApplySVG();
ClearTextArea();
ResizeInputField();
BuildCollapsibles();
BuildSettings();
BuildTabs();
SetClass(DOM_CHAT, "hidden", true)
