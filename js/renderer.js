"use strict";

const { clipboard, ipcRenderer } = require('electron');
const { marked } = require('marked');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { encode } = require('gpt-3-encoder');

var status_check = null;
const heartbeat_timer = 3000;
const message_cutoff = /\n.*\:/i
const editing_token_threshold = 2048 - 512;

const error_message = {
    "service_unavailable": {
        title: "Service unavailable!",
        message: "Server is busy, please try again later.",
    },
    "request_error":{
        title: "Could not complete the request!", 
        message: "Something went wrong while sending your message. Check your API connectivity and try again.", 
    }
}

const { Chat } = require("./js/modules/chat.js")
const { Character } = require("./js/modules/character.js")
const { Profile } = require("./js/modules/profile.js")
const { Settings } = require("./js/modules/settings.js")
const { SaveData, LoadData } = require("./js/modules/data.js")

const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text) {
    return "~" + text + "~";
};

marked_renderer.pre = function(text) {
    return text;
}

marked_renderer.code = function(text) {
    return text;
}

marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})

// ============================================================================
// VARIABLES
// ============================================================================

var busy = false;
var creating = false;
var message_chunk = ""
var debounce = false;

var CURRENT_SETTINGS = {};
var CURRENT_PROFILE = {};
var CURRENT_CHARACTER = null;
var CURRENT_CREATE = null;
var CURRENT_CHAT = null;
var CURRENT_LIST = [];

// ============================================================================
// EVENTS
// ============================================================================

document.addEventListener("keydown", (e) => {
    if( !debounce ){
        if( e.ctrlKey && e.key == 'Enter' ){
            console.debug("Pressed SEND shortcut (Ctrl+Enter)")
            DOM_INPUT_SEND.click()
        }
    }

    if( e.ctrlKey && e.key == ' ' ){
        console.debug("Pressed REGENERATE shortcut (Ctrl+Space)")
        DOM_CHAT_OPTIONS_REGENERATE.click()
    }
    
    if( e.ctrlKey && e.key == 'Delete' ){
        if( DOM_INPUT_FIELD.value.length > 0) return;
        console.debug("Pressed DELETE shortcut (Ctrl+Delete)")
        DOM_CHAT_OPTIONS_DELETE.click()
    }

    debounce = false;
});

DOM_INPUT_SEND.addEventListener("click", () => SendMessage());
DOM_DELETE_CONFIRM.addEventListener("click", () => DeleteMessages());
DOM_SETTINGS_CONNECT.addEventListener("click", () => Connect());
DOM_SETTINGS_DISCONNECT.addEventListener("click", () => Disconnect());
DOM_CHAT_OPTIONS_NEW.addEventListener("click", () => {
    NewChat( CURRENT_CHARACTER );
    ToggleChatActive();
});
DOM_CHAT_OPTIONS_REGENERATE.addEventListener("click", () => RegenerateLastMessage( CURRENT_CHARACTER, CURRENT_CHAT, CURRENT_SETTINGS));
DOM_CHAT_OPTIONS_HISTORY.addEventListener("click", () => ToggleChatHistory(true));
DOM_CHAT_OPTIONS_DELETE.addEventListener("click", () => ToggleDeleteMode(true));
DOM_DELETE_CANCEL.addEventListener("click", () => ToggleDeleteMode(false));
DOM_HISTORY_BACK.addEventListener("click", () => ToggleChatActive())

DOM_HISTORY_IMPORT_CAI.addEventListener("click", () => {
    ipcRenderer.send("open_file", { 
        event: "import_cai",
        options: {
            filters: [{ name: 'Character.AI chat dumps', extensions: ['json'] }],
        }
    })
})

DOM_HISTORY_IMPORT_TAVERN.addEventListener("click", () => {
    ipcRenderer.send("open_file", { 
        event: "import_tavern", 
        options: { 
            properties: [ "multiSelections" ],
            filters: [{ name: 'TavernAI chat files', extensions: ['jsonl'] }],
        }
    })
})

DOM_CHARACTER_ADD.addEventListener("click", () => {
    SelectCharacter(null);
    OpenCharacterEditing(null);
});

DOM_CHARACTER_IMPORT.addEventListener("click", () => {
    ipcRenderer.send("import_character");
});

DOM_EDIT_CREATE.addEventListener("click", () => {
    TryCreateCharacter();
});

DOM_SECTION_EDITING.addEventListener("change", () => {
    if( !creating ){
        GetCharacter( CURRENT_CHARACTER )
        UpdateCharacterEditingTokens( CURRENT_CHARACTER );
        let new_avatar = CURRENT_CHARACTER.metadata.filepath
        
        if( CURRENT_CHARACTER.metadata.avatar ){
            new_avatar = CURRENT_CHARACTER.metadata.avatar.replaceAll("\\", "/")
            if( CURRENT_CHARACTER.metadata.menu_item ){
                let img = CURRENT_CHARACTER.metadata.menu_item.children[0]
                img.setAttribute("src", new_avatar)
            }
            SetAvatarCSS( "bot", new_avatar )
        }

        CURRENT_CHARACTER.WriteToFile( new_avatar, CURRENT_CHARACTER.metadata.filepath )
        CURRENT_CHARACTER.metadata.avatar = undefined;
    }else{
        GetCharacter( CURRENT_CREATE )
        UpdateCharacterEditingTokens( CURRENT_CREATE );
    }
})

DOM_SECTION_PROFILE.addEventListener("change", () => {
    GetProfile( CURRENT_PROFILE )
    SaveData(Profile.path, CURRENT_PROFILE)
});

DOM_SECTION_SETTINGS.addEventListener("change", () => {
    GetSettings( CURRENT_SETTINGS )
    SaveData(Settings.path, CURRENT_SETTINGS)
});

DOM_EDIT_AVATAR_UPLOAD.addEventListener("change", (event) => {
    UpdateCharacterAvatar( event.target.files[0] );
})

DOM_PROFILE_UPLOAD.addEventListener("change", (event) => {
    UpdateUserAvatar( event.target.files[0] );
})

// ============================================================================
// CALLBACKS
// ============================================================================

ipcRenderer.on("import_tavern", (_event, args) => {
    if( !args ) return;
    Chat.ImportTavern( CURRENT_CHARACTER, args )
    ToggleChatHistory(true)
})

ipcRenderer.on("import_cai", (_event, args) => {
    if( !args ) return;
    Chat.ImportCAI( CURRENT_CHARACTER, args[0] )
    ToggleChatHistory(true)
})

// ============================================================================
// METHODS
// ============================================================================

async function TryCreateCharacter(){
    GetCharacter( CURRENT_CREATE )
    
    if( !CURRENT_CREATE.name ){
        ipcRenderer.send("show_error", { 
            title: "Error creating character!", 
            message: "Name is empty or invalid. Please input a valid name and try again.",
            type: "error", 
        })
        return;
    }

    if( !CURRENT_CREATE.metadata.avatar ){
        CURRENT_CREATE.metadata.avatar = default_avatar_bot;
    }
    
    let file_path = path.join( __dirname, Character.path, CURRENT_CREATE.name + ".png")
    SetClass(DOM_SECTION_EDITING, "hidden", true)
    
    await CURRENT_CREATE.WriteToFile( CURRENT_CREATE.metadata.avatar, file_path )
    
    CURRENT_LIST = []
    CURRENT_LIST = Character.LoadFromDirectory( Character.path );
    BuildCharactersList( CURRENT_LIST )
    
    ipcRenderer.send("show_message", { 
        title: "OgreAI", 
        message: `Character created successfully!`, 
        detail: `${CURRENT_CREATE.name} was created at ${file_path}`,
        icon: `${CURRENT_CREATE.metadata.avatar}`, 
    })
}

function NewChat( character ){
    if( busy ) return;
    if( !character ) return;

    CURRENT_CHAT = new Chat( character )
    BuildChat( CURRENT_CHAT )
}

function GetChat( character ){
    if( busy ) return;
    if( !character ) return;

    let new_chat = Chat.GetLatestChat( character )
    if( new_chat ){
        CURRENT_CHAT = new_chat
        BuildChat( CURRENT_CHAT )
    }
}

function BuildChat(chat){
    try{
        RemoveAllChildren( DOM_MESSAGES );
        for( let i = 0; i < chat.messages.length; i++ ){
            let msg = chat.messages[i]
            let is_bot = msg.participant > -1;
            let author = is_bot ? chat.participants[ msg.participant ] : CURRENT_PROFILE.name;
            chat.messages[i].dom = CreateMessage(null, author, msg )
        }
    }catch(error){
        console.warn(error)
    }
}

function SendMessage(){
    if(busy) return;

    ReceiveMessage({ "participant": -1, "candidate":{ "timestamp": Date.now(), "text": DOM_INPUT_FIELD.value.trim() }}, false)
    ClearTextArea();
    ResizeInputField();
    ToggleSendButton(false);
    let prompt = MakePrompt( CURRENT_CHARACTER, CURRENT_CHAT.messages, CURRENT_SETTINGS );
    Generate(prompt, CURRENT_SETTINGS)
}

function ReceiveMessage(msg, swipe = false){
    if(msg){
        let is_bot = msg.participant > -1;
        if(!msg.candidate || !msg.candidate.text || msg.candidate.text.length < 1){
            console.warn("Received an empty message. Skipping.");
        }else{
            let is_bot = msg.participant > -1;
            let bot_name = CURRENT_CHAT.participants[ msg.participant ]
            let author = is_bot ? bot_name : CURRENT_PROFILE.name;

            if( swipe ){
                let lastMessage = CURRENT_CHAT.messages.at(-1)
                lastMessage.candidates.push( msg.candidate )
                SwipeMessage( -1, lastMessage.candidates.length-1 )
            }else{
                let entry = {
                    participant: msg.participant,
                    index: 0,
                    candidates: [ msg.candidate ],
                }
                entry.dom = CreateMessage(null, author, entry )
                CURRENT_CHAT.messages.push(entry)
            }

            CURRENT_CHAT.last_interaction = Date.now()
            CURRENT_CHAT.Save( CURRENT_CHARACTER );
        }
        if(is_bot){
            ToggleSendButton(true);
        }
    }
}

function ToggleDeleteMode(state){
    if( busy && state ) return;
    SetClass(DOM_INPUT_OPTIONS_WINDOW, "hidden", true);

    let elem = document.getElementsByClassName("msg");
    for( let i = 0; i < elem.length; i++ ){
        elem[i].classList.remove("delete");
        var checkbox = elem[i].children[2]
        checkbox.checked = false;
    }

    if(state){
        DOM_MESSAGES.scrollTo(0, DOM_MESSAGES.scrollHeight);
        SetClass(DOM_MESSAGES, "delete-mode", true);
        SetClass(DOM_INPUT, "hidden", true);
        SetClass(DOM_DELETE, "hidden", false);
        DOM_CHAT.style.gridTemplateRows = "auto 72px";
    }else{
        SetClass(DOM_MESSAGES, "delete-mode", false);
        SetClass(DOM_INPUT, "hidden", false);
        SetClass(DOM_DELETE, "hidden", true);
        ResizeInputField();
    }

    console.debug("Toggled deleted mode to " + state)
}

function ToggleChatHistory(state){
    if( busy && state ) return;
    if( !CURRENT_CHARACTER ) return;

    SetClass(DOM_MESSAGES, "hidden", state)
    SetClass(DOM_INPUT, "hidden", state)
    SetClass(DOM_HISTORY, "hidden", !state)
    SetClass(DOM_HISTORY_OPTIONS, "hidden", !state)

    if( state ){
        RemoveAllChildren( DOM_HISTORY )
        let chats = Chat.GetAllChats( CURRENT_CHARACTER )

        for( let i = 0; i < chats.length; i++ ){
            let chat = chats[i]
            let history = CreateChatHistoryItem( chat )
            history.addEventListener("click", () => {
                CURRENT_CHAT = chat;
                BuildChat( CURRENT_CHAT )
                ToggleChatActive();
            })

            DOM_HISTORY.appendChild( history )
        }

        DOM_CHAT.style.gridTemplateRows = "auto 72px";
        console.debug(`Loaded ${chats.length} in chat history for character ${CURRENT_CHARACTER.name}`)
    }
}

function CreateChatHistoryItem( chat ){
    let btn = document.createElement("button")
    btn.classList.add("history")

    let _left = document.createElement("div")
    _left.classList.add("history-info")

    let _right = document.createElement("div")
    _right.classList.add("history-chat")

    let _title = document.createElement("div")
    _title.classList.add("title")
    _title.innerHTML = "<p>" + (chat.title ? chat.title : chat.created) + "</p>";
    _title.style.gridColumnStart = "1"
    _title.style.gridColumnEnd = "3"

    let _num = document.createElement("p")
    _num.classList.add("explanation", "info", "disabled")
    _num.innerHTML = `${chat.messages.length} ${(chat.messages.length > 1 ? "messages" : "message")}`;

    let _last = document.createElement("p")
    let _dateLast = new Date( chat.last_interaction )
    _last.classList.add("explanation")
    _last.innerHTML = `Last message: ${ _dateLast.toLocaleString("ja-JP", date_options) }`

    let _created = document.createElement("p")
    let _dateCreated = new Date( chat.created )
    _created.classList.add("explanation")
    _created.innerHTML = `Created: ${ _dateCreated.toLocaleString("ja-JP", date_options) }`

    let msg = chat.messages.at(-1)
    let _text = msg.candidates[ msg.index ].text
    let _author = msg.participant > -1 ? chat.participants[ msg.participant ] : CURRENT_PROFILE.name
    _text = marked.parse( _text )
    _text = ParseNames( _text, CURRENT_PROFILE.name, chat.participants[ msg.participant ] )

    _right.innerHTML = `<strong>${_author}:</strong> ${_text}`;

    let _delete = document.createElement("button");
    _delete.title = "Delete chat history";
    _delete.classList.add("delete")
    _delete.classList.add("danger")
    _delete.innerHTML = SVG.delete;

    _delete.children[0].style.marginTop = "5px";

    _left.appendChild(_title)
    _left.appendChild(_num)
    _left.appendChild(_last)
    _left.appendChild(_created)
    _left.appendChild(_delete)
    
    _delete.addEventListener("click", () => {
        Chat.Delete( CURRENT_CHARACTER, chat.created )
        if( CURRENT_CHAT.created == chat.created ){
            NewChat( CURRENT_CHARACTER )
        }
        btn.disabled = true;
        btn.remove();
    })

    btn.appendChild(_left)
    btn.appendChild(_right)

    return btn;
}

function DeleteCandidate( index, swipe = -1 ){
    if( !CURRENT_CHAT ) return;
    if( !CURRENT_CHAT.messages || CURRENT_CHAT.messages.length < 2 ) return;

    if( swipe < 0 ){
        swipe = CURRENT_CHAT.messages[index].index;
    }else if( swipe > CURRENT_CHAT.messages[index].candidates.length-1 ){
        swipe = CURRENT_CHAT.messages[index].candidates.length-1
    }

    CURRENT_CHAT.messages[ index ].candidates.splice( swipe, 1 )
    console.debug(`Deleted candidate at message index ${index}, swipe ${swipe}`)
    
    if( CURRENT_CHAT.messages[ index ].candidates.length < 1 ){
        CURRENT_CHAT.messages[ index ].dom.remove();
        CURRENT_CHAT.messages[ index ] = null;
        CURRENT_CHAT.messages = CURRENT_CHAT.messages.filter((item) => { return item });
        console.debug(`Deleted message at message index ${index}`)
    }else{
        ClampMessageIndex( CURRENT_CHAT.messages[ index ] )
        SwipeMessage( index, CURRENT_CHAT.messages[ index ].index )
    }

    CURRENT_CHAT.Save( CURRENT_CHARACTER )
}

function ClampMessageIndex( msg ){
    if( msg.index < 0)
        msg.index = 0;

    if( msg.index > msg.candidates.length-1 )
        msg.index = msg.candidates.length-1
}

function SwipeMessage( message_at, new_index ){
    if( !CURRENT_CHAT ) return;
    if( !CURRENT_CHAT.messages || CURRENT_CHAT.messages < 2 ) return;

    // for now, always swipe the last message
    let msg = CURRENT_CHAT.messages.at( message_at )
    if( msg.participant < 0 ) return;

    if( new_index < 0 )
        new_index = 0;

    if( new_index > msg.candidates.length-1 ){
        new_index = msg.candidates.length-1;
        if( busy ) return;
        
        // prevent swiping greetings
        if( msg === CURRENT_CHAT.messages[0] ) return;

        ToggleSendButton(false);
        let prompt = MakePrompt( CURRENT_CHARACTER, CURRENT_CHAT.messages, CURRENT_SETTINGS, 1 );
        Generate(prompt, CURRENT_SETTINGS, true)
        return;
    }
        
    msg.index = new_index

    let content = msg.dom.getElementsByClassName("content")[0]
    let swipes = msg.dom.getElementsByClassName("count")[0]
    let text = msg.candidates[ msg.index ].text;

    text = marked.parse( text )
    text = ParseNames( text, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )

    content.innerHTML = text;
    swipes.innerHTML = `${ msg.index + 1} / ${ msg.candidates.length }`
    DOM_MESSAGES.scrollTo( 0, DOM_MESSAGES.scrollHeight );
    
}

function DeleteMessages(){
    if( busy ) return;
    let candidates = document.getElementsByClassName("delete")
    if( !candidates || candidates.length < 1 ){
        ToggleDeleteMode(false);
        return;
    }
    
    let indices = []
    for( let i = 0; i < candidates.length; i++ ){
        let index = GetElementIndex( DOM_MESSAGES, candidates[i] )
        if( index > -1 ){
            indices.push( index );
        }
    }

    let count = 0;
    for( let j = 0; j < indices.length; j++ ){
        if( indices[j] == 0 ) continue;
        CURRENT_CHAT.messages[ indices[j] ].dom.remove();
        CURRENT_CHAT.messages[ indices[j] ] = null;
        count += 1;
    }
    
    CURRENT_CHAT.last_interaction = Date.now()
    CURRENT_CHAT.messages = CURRENT_CHAT.messages.filter((item) => { return item });
    console.debug(`Deleted ${count} message(s) at: [${indices.join(",")}]`)
    CURRENT_CHAT.Save( CURRENT_CHARACTER )
    ToggleDeleteMode(false);
}

function RemoveLastMessage(chat){
    if( busy ) return;
    if( !chat || !chat.messages || chat.messages.length < 2 ) return
    let last = chat.messages.pop()
    if( last.dom ){
        last.dom.remove()
    }
    chat.last_interaction = Date.now()
    chat.Save( CURRENT_CHARACTER )
}

function RegenerateLastMessage(character, chat, settings){
    if( busy ) return;
    if( !chat || !chat.messages || chat.messages.length < 2 ) return

    SetClass(DOM_INPUT_OPTIONS_WINDOW, "hidden", true);

    if( chat.messages.at(-1).participant > -1 ){
        // RemoveLastMessage(chat);
        DeleteCandidate( chat.messages.length-1 );
    }
    
    ToggleSendButton(false);
    let last_message = chat.messages.at(-1)
    let swipe = last_message.participant > -1;
    let prompt = MakePrompt( character, chat.messages, settings, swipe ? 1 : 0 );
    Generate(prompt, settings, swipe)
}

function CopyMessageContent(index){
    let swipe = CURRENT_CHAT.messages[index].index;
    clipboard.writeText( CURRENT_CHAT.messages[index].candidates[swipe].text )
}

function GetMessageIndexFromDOM(dom){
    if( !CURRENT_CHAT ) return -1;
    if( !CURRENT_CHAT.messages ) return -1;

    for( let i = 0; i < CURRENT_CHAT.messages.length; i++ ){
        if( CURRENT_CHAT.messages[i].dom === dom){
            return i;
        }
    }
    return -1;
}

function CreateMessage(id, author, msg){
    let _div = document.createElement("div");
    if( id ){
        _div.id = id
    }

    _div.classList.add("msg");
    let is_bot = msg.participant > -1;

    if(is_bot){
        _div.classList.add("bot");
    }else{
        _div.classList.add("user");
    }

    let _img = document.createElement("div");
    _img.classList.add("avatar", "deselect");

    let _text = document.createElement("div");
    _text.classList.add("text");

    let _author = document.createElement("div");
    _author.classList.add("author");
    
    ClampMessageIndex( msg )

    let _date = new Date( msg.candidates[ msg.index ].timestamp )
    let _timestamp = document.createElement("span")
    _timestamp.classList.add("timestamp")
    _timestamp.innerHTML = `${ _date.toLocaleString("ja-JP", date_options) }`

    _author.innerHTML = author;
    _author.appendChild(_timestamp)
    
    let _content = document.createElement("div");
    _content.classList.add("content");


    let _message = msg.candidates[ msg.index ].text;
    _message = marked.parse( _message )
    _message = ParseNames( _message, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )
    _content.innerHTML = marked.parse( _message );

    let _footer = document.createElement("div");
    _footer.classList.add("footer");
    
    _text.appendChild(_author);
    _text.appendChild(_content);
    _text.appendChild(_footer);

    CreatePostActions(_div, _footer);

    if(is_bot){
        CreatePostSwipes( msg, _footer);
        CreatePostRatings( msg, _footer);
    }

    _div.appendChild(_img);
    _div.appendChild(_text);

    CreateDeleteCheckbox(_div);

    _div.addEventListener("click", (e) => MarkDelete(_div, e));

    DOM_MESSAGES.appendChild(_div)
    DOM_MESSAGES.scrollTo(0, DOM_MESSAGES.scrollHeight);
    return _div;
}

function CreatePostRatings(msg, parent){
    let _ratings = document.createElement("div");
    _ratings.classList.add("ratings");
    _ratings.classList.add("footer-item");

    let _up = document.createElement("button");
    _up.title = "Good"
    _up.classList.add("normal", "fade", "confirm");
    _up.innerHTML = SVG.thumbsup;
    
    let _down = document.createElement("button");
    _down.title = "Bad"
    _down.classList.add("normal", "fade", "danger");
    _down.innerHTML = SVG.thumbsup;
    _down.style.transform = "rotate(180deg)";

    _ratings.appendChild(_up);
    _ratings.appendChild(_down);

    parent.appendChild(_ratings);
}

function CreatePostSwipes(msg, parent){
    let _swipes = document.createElement("div");
    _swipes.classList.add("swipes", "footer-item");

    let _prev = document.createElement("button");
    _prev.title = "Previous candidate";
    _prev.classList.add("normal");
    _prev.innerHTML = SVG.arrow;

    let _count = document.createElement("div");
    _count.classList.add("count");
    _count.innerHTML = `${msg.index+1} / ${msg.candidates.length}`

    let _next = document.createElement("button");
    _next.title = "Next candidate";
    _next.classList.add("normal");
    _next.innerHTML = SVG.arrow;
    _next.style.transform = "scaleX(-100%)";

    _prev.addEventListener("click", () => {
        SwipeMessage( -1, msg.index - 1 )
    })
    
    _next.addEventListener("click", () => {
        SwipeMessage( -1, msg.index + 1 )
    })
    // let index = GetElementIndex( DOM_MESSAGES, msg );
    // let swipe = CURRENT_CHAT.messages[index].index;
    // let content = msg.getElementsByClassName("content")[0]

    _swipes.appendChild(_prev);
    _swipes.appendChild(_count);
    _swipes.appendChild(_next);

    parent.appendChild(_swipes);
}

function CreatePostActions(msg, parent){
    let _dots = document.createElement("button");
    _dots.title = "More"
    _dots.classList.add("dots", "normal", "footer-item");
    _dots.innerHTML = SVG.dots;

    let _actions = document.createElement("div");
    _actions.classList.add("auto-close", "actions", "hidden");

    let _copy = document.createElement("button");
    _copy.title = "Copy message";
    _copy.classList.add("info")
    _copy.innerHTML = SVG.copy;
    
    let _edit = document.createElement("button");
    _edit.title = "Edit message";
    _edit.classList.add("confirm")
    _edit.innerHTML = SVG.edit;
    
    let _delete = document.createElement("button");
    _delete.title = "Delete candidate";
    _delete.classList.add("danger")
    _delete.innerHTML = SVG.delete;

    _actions.appendChild(_copy);
    _actions.appendChild(_edit);
    _actions.appendChild(_delete);

    _dots.onclick = function(){
        if(_actions.classList.contains("hidden")){
            _actions.classList.remove("hidden");
        }else{
            _actions.classList.add("hidden");
        }
    }

    _copy.onclick = function(){
        _actions.classList.add("hidden");
        let index = GetElementIndex( DOM_MESSAGES, msg );
        CopyMessageContent( index )
    }

    _edit.onclick = function(){
        msg.classList.add("edit");
        _actions.classList.add("hidden");
        CreateEditMode(msg)
    }

    _delete.onclick = function(){
        _actions.classList.add("hidden");

        let index = GetElementIndex( DOM_MESSAGES, msg );
        if(index < 1) return;
        DeleteCandidate( index )
    }

    parent.appendChild(_dots);
    parent.appendChild(_actions);
}

function CreateEditMode(dom){
    let index = GetMessageIndexFromDOM( dom );
    let msg = CURRENT_CHAT.messages[index];
    let content = dom.getElementsByClassName("content")[0]
    RemoveAllChildren(content)

    let _old = msg.candidates[ msg.index ].text;
    let _area = document.createElement("textarea");
    let _controls = document.createElement("div");

    _area.innerHTML = _old;
    _area.oninput = (e) => ResizeTextArea(e.target);

    _area.onkeydown = function(e){
        if(e.key == "Escape"){
            CancelEdit(index, content, _old)
        }

        if(e.ctrlKey && e.key == "Enter"){
            ConfirmEdit(index, content, _area.value)
        }
    }
    
    _controls.classList.add("controls")
    _controls.style.textAlign = "right"
    _controls.innerHTML = `Esc to <i class="info clickable" onclick=CancelEdit()>Cancel</i>, `
    _controls.innerHTML += `Ctrl+Enter to <i class="info clickable" onclick=ConfirmEdit()>Save changes</i>`;

    _controls.children[0].onclick = () => CancelEdit(index, content, _old)
    _controls.children[1].onclick = () => ConfirmEdit(index, content, _area.value)
    
    content.appendChild(_area);
    content.appendChild(_controls);

    ResizeTextArea(_area);

    _area.autofocus = true;
    _area.focus();
    _area.setSelectionRange( _area.value.length, _area.value.length );
}

function CancelEdit(index, content, old_value){
    let msg = CURRENT_CHAT.messages[index]
    msg.dom.classList.remove("edit")
    old_value = ParseNames( old_value, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )
    content.innerHTML = marked.parse( old_value );
    console.debug(`Cancelled editing message at index ${index}, swipe ${msg.index}`)
}

function ConfirmEdit(index, content, new_value){
    let msg = CURRENT_CHAT.messages[index]
    msg.dom.classList.remove("edit")
    msg.candidates[ msg.index ].text = new_value;
    new_value = ParseNames( new_value, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )
    content.innerHTML = marked.parse( new_value );
    debounce = true;
    console.debug(`Successfully edited message at index ${index}, swipe ${msg.index}`)
    if( CURRENT_CHAT.messages.length > 1 ){
        CURRENT_CHAT.Save( CURRENT_CHARACTER )
    }
}

function CreateDeleteCheckbox(parent){
    let _checkbox = document.createElement("input");
    _checkbox.setAttribute("type", "checkbox");
    _checkbox.classList.add("delete");
    _checkbox.oninput = function(e){
        if(e.target.checked){
            parent.classList.add("delete")
        }else{
            parent.classList.remove("delete")
        }
    }

    parent.appendChild(_checkbox);
}

function AddCharacterItem(json){
    let button = document.createElement("button");
    button.classList.add("character")
    button.classList.add("deselect")
    button.title = json.name;

    let image = document.createElement("img");
    image.setAttribute("src", json.metadata.filepath);
    image.classList.add("avatar");

    button.appendChild(image);
    return button;
}

function Connect(){
    if(!CURRENT_SETTINGS.api_url) return;
    SetServerStatus(null);
    GetStatus(CURRENT_SETTINGS.api_url);
}

function Disconnect(){
    clearInterval(status_check)
    SetServerStatus(-1);
}

function GetStatus(url){
    url = url.replaceAll("localhost", "127.0.0.1");
    let protocol = http;
    if(url.startsWith("https")){
        protocol = https;
    }

    try{
        protocol.get(url + "/v1/model", (response) => {
            SetServerStatus(response.statusCode)
            if(response.statusCode == 200){
                status_check = setTimeout( () => GetStatus(url), heartbeat_timer )
            }
        }).on("error", (error) => {
            console.warn("Network error!\n" + error.message);
            SetServerStatus(-1)
        })
    }catch( error ){
        ipcRenderer.send("show_error", { 
            title: "Network Error!", 
            message: error.message 
        })
        SetServerStatus(-1)
    }
}

function UpdateUserAvatar(file){
    if(!file) return;

    let filepath = default_avatar_user;
    if(file){
        filepath = file.path.replaceAll("\\", "/")
        CURRENT_PROFILE.avatar = filepath;
    }else{
        CURRENT_PROFILE.avatar = "";
    }

    DOM_PROFILE_AVATAR.setAttribute("src", filepath);
    SetAvatarCSS("user", filepath);
}

function UpdateCharacterAvatar(file){
    if(!file){
        if(CURRENT_CHARACTER && CURRENT_CHARACTER.metadata){
            CURRENT_CHARACTER.metadata.avatar = undefined;
        }
        return;
    }

    DOM_EDIT_AVATAR.setAttribute("src", file.path)
    if(creating){
        CURRENT_CREATE.metadata.avatar = file.path;
    }else{
        CURRENT_CHARACTER.metadata.avatar = file.path;
    }
}

function SelectCharacter(character){
    if( busy ) return;

    DOM_EDIT_AVATAR_UPLOAD.value = "";
    
    if(character){
        creating = false;
        CURRENT_CHARACTER = character;
        ApplyCharacter(character);
        GetChat(character);
        ToggleChatActive();
        
        let avatar = default_avatar_bot;
        if( CURRENT_CHARACTER.metadata.filepath ){
            avatar = CURRENT_CHARACTER.metadata.filepath.replaceAll("\\", "/");
        }
    
        SetAvatarCSS( "bot", avatar )
        UpdateCharacterEditingTokens( CURRENT_CHARACTER );
    }else{
        creating = true;
        CURRENT_CREATE = new Character();
        CURRENT_CREATE.author = CURRENT_PROFILE.name;
        ApplyCharacter( CURRENT_CREATE );
        UpdateCharacterEditingTokens( CURRENT_CREATE );
    }
}

function GetProfile(obj){
    if(!obj) return;
    obj.name = DOM_PROFILE_NAME.value.trim()
    obj.avatar = obj.avatar ? obj.avatar.trim() : ""
}

function GetCharacter(obj){
    if(!obj) return;

    if( DOM_EDIT_NAME.value.trim().length > 0 ){
        obj.name = DOM_EDIT_NAME.value.trim()
    }
    
    obj.description = DOM_EDIT_DESCRIPTION.value.trim()
    obj.greeting = DOM_EDIT_GREETING.value.trim()
    obj.personality = DOM_EDIT_PERSONALITY.value.trim()
    obj.scenario = DOM_EDIT_SCENARIO.value.trim()
    obj.dialogue = DOM_EDIT_DIALOGUE.value.trim()
    obj.author = obj.author ? obj.author.trim() : ""
    obj.create_date = obj.create_date ? obj.create_date : Date.now()
    obj.metadata.filepath = obj.metadata && obj.metadata.filepath ? obj.metadata.filepath.trim() : ""
}

function GetSettings(obj){
    if(!obj) return;
    obj.api_url = DOM_SETTINGS_API_URL.value.trim()
    obj.max_length = parseInt(DOM_SETTINGS_MAX_LENGTH.value)
    obj.context_size = parseInt(DOM_SETTINGS_CONTEXT_SIZE.value)
    obj.temperature = parseFloat(DOM_SETTINGS_TEMPERATURE.value)
    obj.repetition_penalty = parseFloat(DOM_SETTINGS_REPETITION_PENALTY.value)
    obj.repetition_slope = parseFloat(DOM_SETTINGS_PENALTY_SLOPE.value)
    obj.penalty_range = parseInt(DOM_SETTINGS_PENALTY_RANGE.value)
    obj.top_p = parseFloat(DOM_SETTINGS_TOP_P.value)
    obj.top_k = parseFloat(DOM_SETTINGS_TOP_K.value)
    obj.typical_p = parseFloat(DOM_SETTINGS_TYPICAL_P.value)
}

function ParseNames(text, user, bot){
    if(!text) return text;
    text = text.replaceAll("[NAME_IN_MESSAGE_REDACTED]", user)
    text = text.replaceAll("{{user}}", user)
    text = text.replaceAll("<USER>", user)
    text = text.replaceAll("{{char}}", bot)
    text = text.replaceAll("<BOT>", bot)
    return text
}

function GetCharacterTokens( character ){
    if( !character ){ return [] }
    let prompt = MakePrompt( character, null, CURRENT_SETTINGS )
    let tokens = encode(prompt)
    return tokens
}

function UpdateCharacterEditingTokens( character ){
    let tokens = GetCharacterTokens( character )
    DOM_EDIT_TOKENS.innerHTML = `${tokens.length} of ${editing_token_threshold} Tokens`
    SetClass( DOM_EDIT_TOKENS, "confirm", tokens.length <= editing_token_threshold )
    SetClass( DOM_EDIT_TOKENS, "danger", tokens.length > editing_token_threshold )
}

function MakePrompt( character, messages, settings, offset = 0 ){
    var prompt = ""
    prompt += `${character.name}'s Persona: ${character.description.trim()}\n`

    if(character.personality)
        prompt += `Personality: ${character.personality.trim()}\n`
    
    if(character.scenario)
        prompt += `Scenario: ${character.scenario.trim()}\n`
    
    if(character.dialogue)
        prompt += `${character.dialogue.trim()}\n`

    prompt += "<START>\n"
    prompt = ParseNames( prompt, CURRENT_PROFILE.name, character.name )

    let ending = character.name + ":"
    let token_count_prompt = encode(prompt).length;
    let token_count_ending = encode(ending).length;

    if( messages ){
        let msg_section = "";

        for( let i = messages.length - 1 - Math.abs(offset); i >= 0; i -= 1 ){
            let prefix = messages[i].participant > -1 ? character.name : "You";
            let candidate = messages[i].candidates[ messages[i].index ].text
            
            let msg = `${prefix}: ${candidate}\n`
            let token_count_messages = encode(msg_section).length
            let token_count_line = encode(msg).length
            if( token_count_prompt + token_count_messages + token_count_line + token_count_ending > settings.context_size ){
                break;
            }
            msg_section = msg + msg_section
        }
        prompt += msg_section
    }

    prompt += ending;
    return prompt;
}

function Generate(prompt, settings, swipe = false){
    let url = settings.api_url;
    url = url.replaceAll("localhost", "127.0.0.1");

    let protocol = http;
    if(url.startsWith("https")){
        protocol = https;
    }

    let final_token_count = encode(prompt).length;
    if( final_token_count > settings.context_size ){
        console.warn(`Attempting to make a prompt with ${final_token_count} tokens, which is ${final_token_count - settings.context_size} more than the ${settings.context_size} allowed!`)
    }

    let outgoing_data = {
        prompt: prompt,
        max_context_length: settings.context_size,
        max_length: settings.max_length,
        rep_pen: settings.repetition_penalty,
        rep_pen_range: settings.penalty_range,
        rep_pen_slope: settings.repetition_slope,
        temperature: settings.temperature,
        tfs: 0.9,
        top_a: 0,
        top_k: settings.top_k,
        top_p: settings.top_p,
        typical: settings.typical_p,
        sampler_order: [ 6, 0, 1, 2, 3, 4, 5 ]
    };

    let json_data = JSON.stringify(outgoing_data)
    let buffer_length = Buffer.byteLength( json_data );

    let options = {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': buffer_length,
        },
    }

    try{
        console.debug("Sending prompt %o", outgoing_data)
        const req = protocol.request(url + "/v1/generate", options, (response) => {
            response.setEncoding("utf8")
            response.on("data", (incoming) => {
                let incoming_json = JSON.parse(incoming);

                if(incoming_json.results){
                    let text_content = incoming_json.results[0].text;
                    console.debug(`Raw generated ${swipe ? "swipe" : "message"}:\n${text_content}`)

                    let cut = text_content.search(message_cutoff)
                    if( cut > -1 ){
                        text_content = text_content.slice(0, cut)
                        if(message_chunk.length < 1){
                            text_content = text_content.trim()
                        }
                        message_chunk += text_content;
                        ReceiveMessage({ 
                            "participant": 0, 
                            "candidate":{ 
                                "timestamp": Date.now(), 
                                "text": message_chunk 
                            }
                        }, swipe);
                        message_chunk = "";
                    }else{
                        message_chunk += text_content;
                        outgoing_data.prompt += message_chunk;
                        Generate(outgoing_data.prompt, settings, swipe)
                    }

                }else if(incoming_json.detail){
                    if( error_message[incoming_json.detail] ){
                        ipcRenderer.send("show_error", error_message[incoming_json.detail] )
                    }else{
                        ipcRenderer.send("show_error", { 
                            title: incoming_json.detail.type, 
                            message: incoming_json.detail.msg
                        })
                    }
                    ToggleSendButton(true);
                }
            });
        });

        req.on("error", (error) => {
            ipcRenderer.send("show_error", error_message["request_error"]);
            ToggleSendButton(true);
        });

        req.write( json_data );
        req.end();

    }catch( error ){
        ipcRenderer.send("show_error", { 
            title: "Network Error!", 
            message: error.message 
        });

        ReceiveMessage(null);
        ToggleSendButton(true);
    }
}

function BuildCharactersList(list){
    if( busy ) return;
    RemoveAllChildren( DOM_CHARACTER_LIST );

    if(!list) return;
    list.sort((a,b) => { return b.create_date - a.create_date });

    for( let i = 0; i < list.length; i++ ){
        let file = list[i].metadata.filepath
        let item = AddCharacterItem( list[i] );
        item.addEventListener("click", () => {
            try{
                let char = Character.ReadFromFile( file )
                let open = CURRENT_CHARACTER != null && CURRENT_CHARACTER.metadata.filepath === char.metadata.filepath;
                
                char.metadata.menu_item = item;
                SelectCharacter( char )

                if( open ){
                    OpenCharacterEditing( CURRENT_CHARACTER )
                }
            }catch(error){
                ipcRenderer.send("show_error",{
                    title: "An error occurred while reading the character",
                    message: error.message,
                })
            }
        })

        DOM_CHARACTER_LIST.appendChild( item );
    }
}

// ============================================================================
// SETUP
// ============================================================================

CURRENT_PROFILE = LoadData( Profile.path, new Profile());
CURRENT_SETTINGS = LoadData( Settings.path, new Settings());
CURRENT_LIST = Character.LoadFromDirectory( Character.path );
BuildCharactersList( CURRENT_LIST )

ApplyProfile( CURRENT_PROFILE );
ApplySettings( CURRENT_SETTINGS );
Connect();