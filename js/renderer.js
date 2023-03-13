"use strict";

// ============================================================================
// MODULES
// ============================================================================

const { clipboard, ipcRenderer } = require('electron');
const { marked } = require('marked');

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const Utils = require("./js/modules/utils.js")

const { Chat } = require("./js/modules/chat.js")
const { Character } = require("./js/modules/character.js")
const { Profile } = require("./js/modules/profile.js")
const { Settings } = require("./js/modules/settings.js")
const { SaveData, LoadData } = require("./js/modules/data.js")

const { Pygmalion } = require("./js/api/pygmalion.js")
const { OpenAI } = require("./js/api/openai.js")


const marked_renderer = new marked.Renderer();
marked_renderer.del = function(text){ return "~" + text + "~"; };
marked_renderer.pre = function(text){ return text; };
marked_renderer.code = function(text){ return text; };
marked.setOptions({
    breaks: true,
    renderer: marked_renderer,
})

// ============================================================================
// VARIABLES
// ============================================================================

var __busy = false;
var __creating = false;
var __status_check = null;

var CURRENT_SETTINGS = new Settings()
var CURRENT_PROFILE = new Profile()
var CURRENT_CHARACTER = null;
var CURRENT_CREATE = null;
var CURRENT_CHAT = null;
var CURRENT_LIST = [];

var PATH_DATA = {}

// ============================================================================
// CONST
// ============================================================================

const heartbeat_timer = 3000;
const editing_token_threshold = 2048 - 512;

const default_avatar_user = "./img/user_default.png";
const default_avatar_bot = "./img/bot_default.png";


// ============================================================================
// EVENTS
// ============================================================================

document.addEventListener("keydown", (e) => {
    // document-wide shortcuts
    
    if( e.ctrlKey && e.key == ' ' ){
        console.debug("Pressed REGENERATE shortcut (Ctrl+Space)")
        DOM_CHAT_OPTIONS_REGENERATE.click()
    }
    
    if( document.activeElement === DOM_INPUT_FIELD) return;
    
    if( e.ctrlKey && e.key == 'Delete' ){
        console.debug("Pressed DELETE shortcut (Ctrl+Delete)")
        DOM_CHAT_OPTIONS_DELETE.click()
    }
});

document.addEventListener("message", (data) => {
    if(data && data.detail && data.detail.message){
        ReceiveMessage(data.detail.message, data.detail.swipe)
    }
    ToggleSendButton(true)
})

document.addEventListener("server_status", (data) => {
    if(data && data.detail){
        SetServerStatus(data.detail.code)
        if( data.detail.heartbeat){
            __status_check = setTimeout(() => { 
                GetAPI().GetStatus( CURRENT_SETTINGS.api_target) 
            }, heartbeat_timer )
        }
    }
})

DOM_INPUT_FIELD.addEventListener("keydown", (e) => {
    if( !e.shiftKey && e.key == 'Enter' ){
        console.debug("Pressed SEND shortcut (Enter)")
        DOM_INPUT_SEND.click()
        e.preventDefault()
    }
});

DOM_HEADER_CHARACTERS_BUTTON.addEventListener("click", () => ToggleClass(DOM_SIDEBAR_LEFT, "active"));
DOM_HEADER_SETTINGS_BUTTON.addEventListener("click", () => ToggleClass(DOM_SIDEBAR_RIGHT, "active"));
DOM_INPUT_OPTIONS_BUTTON.addEventListener("click", () => ToggleClass(DOM_INPUT_OPTIONS_WINDOW, "hidden"));
DOM_INPUT_FIELD.addEventListener("input", () => ResizeInputField());
DOM_EDIT_CLOSE.addEventListener("click", () => SetClass(DOM_SECTION_EDITING, "hidden", true));
// DOM_SETTINGS_RESET.addEventListener("click", () => ResetSettings());

DOM_INPUT_SEND.addEventListener("click", () => SendMessage());
DOM_DELETE_CONFIRM.addEventListener("click", () => DeleteMessages());
DOM_SETTINGS_CONNECT.addEventListener("click", () => Connect());
DOM_SETTINGS_DISCONNECT.addEventListener("click", () => Disconnect());
DOM_CHAT_OPTIONS_NEW.addEventListener("click", () => {
    NewChat( CURRENT_CHARACTER );
    ToggleChat( true );
});

DOM_SETTINGS_API_MODE.addEventListener("change", () => {
    Disconnect();
})

DOM_CHAT_OPTIONS_REGENERATE.addEventListener("click", () => RegenerateLastMessage( CURRENT_CHARACTER, CURRENT_CHAT, CURRENT_SETTINGS));
DOM_CHAT_OPTIONS_HISTORY.addEventListener("click", () => ToggleChatHistory(true));
DOM_CHAT_OPTIONS_DELETE.addEventListener("click", () => ToggleDeleteMode(true));
DOM_DELETE_CANCEL.addEventListener("click", () => ToggleDeleteMode(false));
DOM_HISTORY_BACK.addEventListener("click", () => ToggleChat( true ))

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

DOM_EDIT_DELETE.addEventListener("click", () => {
    if(!CURRENT_CHARACTER) return;

    ipcRenderer.send("show_message", { 
        event: "delete_character", 
        options: {
            type: "warning",
            title: "OgreAI", 
            message: `Delete character confirmation`, 
            noLink: true,
            detail: `Are you sure you want to delete character "${CURRENT_CHARACTER.name}"?\nThis is irreversible and the character will be lost forever!`,
            buttons: [ "Cancel", "Confirm" ]
        }
    })
});

DOM_SECTION_EDITING.addEventListener("change", () => {
    if( !__creating ){
        GetCharacter( CURRENT_CHARACTER )
        UpdateCharacterEditingTokens( CURRENT_CHARACTER );
        let new_avatar = CURRENT_CHARACTER.metadata.filepath
        
        if( CURRENT_CHARACTER.metadata.avatar ){
            new_avatar = CURRENT_CHARACTER.metadata.avatar;
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

DOM_SETTINGS_API_MODE.addEventListener("change", (e) => {
    CURRENT_SETTINGS.api_mode = DOM_SETTINGS_API_MODE.value
    CreateSettings( CURRENT_SETTINGS.api_mode )
    ApplySettings( CURRENT_SETTINGS )
})

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

ipcRenderer.on("delete_character", (_event, args) => {
    if( args >= 1 ){
        DeleteCharacter( CURRENT_CHARACTER )
    }
})

// ============================================================================
// METHODS
// ============================================================================

function GetRootPath(){
    if( PATH_DATA.is_packaged ){
        return path.dirname( PATH_DATA.exe_path )
    }else{
        return __dirname
    }
}

function CreateSettings( mode ){
    let keys = Object.keys( Settings.subsets[mode] )
    RemoveAllChildren( DOM_SETTINGS_SUBSET )

    let advanced_section = false;

    let advanced_div = document.createElement("div");
    let advanced_button = document.createElement("button")
    let advanced_content = document.createElement("div")
    let advanced_container = document.createElement("div")

    advanced_div.classList.add("section")
    advanced_button.classList.add("deselect", "component", "collapsible")
    advanced_content.classList.add("collapsible-content")
    advanced_container.classList.add("collapsible-container")

    advanced_button.innerHTML = "Advanced Settings"

    for( let i = 0; i < keys.length; i++ ){
        let key = keys[i]
        let upper = key.toUpperCase()
        let def = Settings.subsets[ mode ][ key ]
        let dom = CreateSettingField( key, def )
        let field = dom.children[2].children[0]

        if( def.advanced ){
            advanced_section = true;
            advanced_container.appendChild( dom )
        }else{
            DOM_SETTINGS_SUBSET.appendChild( dom )
        }

        DOM_SETTINGS_SECTION[ upper ] = dom
        DOM_SETTINGS_FIELD[ upper ] = field
    }

    advanced_div.appendChild( advanced_button )
    advanced_div.appendChild( advanced_content )
    advanced_content.appendChild( advanced_container )
    
    SetClass( advanced_div, "hidden", !advanced_section )
    DOM_SETTINGS_SUBSET.appendChild( advanced_div )

    // create reset button
    console.debug(`Created ${keys.length} settings fields`)

    DOM_SETTINGS_API_TARGET.setAttribute("placeholder", Settings.placeholders[mode] )

    BuildCollapsible( advanced_button )
    BuildSettings();
}

function CreateSettingField( key, def ){
    let _div = document.createElement("div")

    _div.id = "setting_" + key;
    _div.classList.add("setting")
    
    let _title = document.createElement("p")
    _title.classList.add("title")

    let _explanation = document.createElement("p")
    _explanation.classList.add("explanation")

    let _field = document.createElement("input")
    _field.id = "field_" + key;
    _field.setAttribute("type", "text" )
    _field.classList.add( "component", "single" )
    _field.defaultValue = def.default
    
    let _slider = document.createElement("input")
    _slider.id = "slider_" + key;
    _slider.setAttribute("type", "range" )
    _slider.classList.add( "component" )
    _slider.step = def.step
    _slider.max = def.max
    _slider.min = def.min
    _slider.defaultValue = def.default
    
    let _inputs = document.createElement("div")
    _inputs.appendChild(_field)
    _inputs.appendChild(_slider)

    _title.innerHTML = def.title
    _explanation.innerHTML = `${def.description} Default: ${def.default}`

    _div.appendChild(_title)
    _div.appendChild(_explanation)
    _div.appendChild(_inputs)

    return _div
}

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
        CURRENT_CREATE.metadata.avatar = path.join( __dirname, default_avatar_bot );
    }
    
    let target_path = path.join( Character.path, CURRENT_CREATE.name + ".png")
    SetClass(DOM_SECTION_EDITING, "hidden", true)
    
    await CURRENT_CREATE.WriteToFile( CURRENT_CREATE.metadata.avatar, target_path )
    
    CURRENT_LIST = []
    CURRENT_LIST = Character.LoadFromDirectory( Character.path );
    BuildCharactersList( CURRENT_LIST )
    
    ipcRenderer.send("show_message", {
        options: {
            title: "OgreAI", 
            type: "info",
            message: `Character created successfully!`, 
            detail: `${CURRENT_CREATE.name} was created at\n${target_path}`,
            // icon: `${CURRENT_CREATE.metadata.avatar}`, 
        }
    })
}

function DeleteCharacter( character ){
    if( !character ) return;
    character.metadata.menu_item.remove()
    fs.unlinkSync( character.metadata.filepath )
    if( character == CURRENT_CHARACTER ){
        CURRENT_CHARACTER = null;
        ToggleChat( false )
        SetClass(DOM_SECTION_EDITING, "hidden", true);
    }
    console.debug(`Deleted character ${character.name}`)
}

function NewChat( character ){
    if( __busy ) return;
    if( !character ) return;

    CURRENT_CHAT = new Chat( character )
    BuildChat( CURRENT_CHAT )
}

function GetChat( character ){
    if( __busy ) return;
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

function GetAPI(){
    switch( CURRENT_SETTINGS.api_mode ){
        case "pygmalion": return Pygmalion;
        case "openai": return OpenAI;
        default: return Pygmalion;
    }
}

function SendMessage(){
    if(__busy) return;

    ReceiveMessage({ 
        "participant": -1, 
        "candidate":{ 
            "timestamp": Date.now(), 
            "text": DOM_INPUT_FIELD.value.trim() 
        }
    }, false)

    ClearTextArea();
    ResizeInputField();
    ToggleSendButton(false);

    let prompt = GetAPI().MakePrompt( 
        CURRENT_CHARACTER, 
        CURRENT_CHAT.messages, 
        CURRENT_PROFILE.name, 
        CURRENT_SETTINGS 
    );

    GetAPI().Generate(prompt, CURRENT_SETTINGS)
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
    if( __busy && state ) return;
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
    if( __busy && state ) return;
    if( !CURRENT_CHARACTER ) return;

    SetClass(DOM_MESSAGES, "hidden", state)
    SetClass(DOM_INPUT, "hidden", state)
    SetClass(DOM_HISTORY, "hidden", !state)
    SetClass(DOM_HISTORY_OPTIONS, "hidden", !state)

    if( state ){
        RemoveAllChildren( DOM_HISTORY )
        let chats = Chat.GetAllChats( CURRENT_CHARACTER )
        chats.sort((a,b) => { return b.last_interaction - a.last_interaction });

        for( let i = 0; i < chats.length; i++ ){
            let chat = chats[i]
            let history = CreateChatHistoryItem( chat )
            history.addEventListener("click", () => {
                CURRENT_CHAT = chat;
                BuildChat( CURRENT_CHAT )
                ToggleChat( true );
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
    _text = Utils.ParseNames( _text, CURRENT_PROFILE.name, chat.participants[ msg.participant ] )

    _right.innerHTML = `<strong>${_author}:</strong> ${_text}`;

    let _div = document.createElement("div");
    _div.classList.add("section")
    _div.style.display = "flex";
    _div.style.gap = "4px";
    
    let _delete = document.createElement("button");
    _delete.title = "Delete chat";
    _delete.classList.add("delete")
    _delete.classList.add("danger")
    _delete.innerHTML = SVG.delete;

    let _copy = document.createElement("button");
    _copy.title = "Duplicate chat";
    _copy.classList.add("delete")
    _copy.classList.add("info")
    _copy.innerHTML = SVG.copy;

    _delete.children[0].style.marginTop = "5px";
    _copy.children[0].style.marginTop = "5px";

    _left.appendChild(_title)
    _left.appendChild(_num)
    _left.appendChild(_last)
    _left.appendChild(_created)

    _div.appendChild(_delete)
    _div.appendChild(_copy)

    _left.appendChild(_div)
    
    _delete.addEventListener("click", () => {
        Chat.Delete( CURRENT_CHARACTER, chat.created )
        if( CURRENT_CHAT.created == chat.created ){
            NewChat( CURRENT_CHARACTER )
        }
        btn.disabled = true;
        btn.remove();
    })

    _copy.addEventListener("click", () => {
        let new_chat = new Chat( CURRENT_CHARACTER )
        new_chat.SetFrom( chat )
        new_chat.created = Date.now()
        new_chat.last_interaction = Date.now()
        new_chat.title = Date.now().toString()

        btn.disabled = true;
        let _success = new_chat.Save( CURRENT_CHARACTER )

        if( _success ){
            ToggleChatHistory( true )
            ipcRenderer.send("show_message", { 
                options: {
                    type: "info",
                    title: "OgreAI", 
                    message: `Chat copied successfully!`, 
                    noLink: true,
                    detail: `Copied chat with ${new_chat.messages.length} message(s) to "${new_chat.title}.json"`,
                }
            })
        }

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
        if( __busy ) return;
        
        // prevent swiping greetings
        if( msg === CURRENT_CHAT.messages[0] ) return;

        ToggleSendButton(false);
        let prompt = GetAPI().MakePrompt( 
            CURRENT_CHARACTER, CURRENT_CHAT.messages, 
            CURRENT_PROFILE.name, CURRENT_SETTINGS, 1);
            
        GetAPI().Generate(prompt, CURRENT_SETTINGS, true)
        return;
    }
        
    msg.index = new_index

    let content = msg.dom.getElementsByClassName("content")[0]
    let swipes = msg.dom.getElementsByClassName("count")[0]
    let text = msg.candidates[ msg.index ].text;

    text = marked.parse( text )
    text = Utils.ParseNames( text, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )

    content.innerHTML = text;
    swipes.innerHTML = `${ msg.index + 1} / ${ msg.candidates.length }`
    DOM_MESSAGES.scrollTo( 0, DOM_MESSAGES.scrollHeight );
    
}

function DeleteMessages(){
    if( __busy ) return;
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
    if( __busy ) return;
    if( !chat || !chat.messages || chat.messages.length < 2 ) return
    let last = chat.messages.pop()
    if( last.dom ){
        last.dom.remove()
    }
    chat.last_interaction = Date.now()
    chat.Save( CURRENT_CHARACTER )
}

function RegenerateLastMessage(character, chat, settings){
    if( __busy ) return;
    if( !chat || !chat.messages || chat.messages.length < 2 ) return

    SetClass(DOM_INPUT_OPTIONS_WINDOW, "hidden", true);

    if( chat.messages.at(-1).participant > -1 ){
        // RemoveLastMessage(chat);
        DeleteCandidate( chat.messages.length-1 );
    }
    
    ToggleSendButton(false);
    let last_message = chat.messages.at(-1)
    let swipe = last_message.participant > -1;
    let prompt = GetAPI().MakePrompt( character, chat.messages, CURRENT_PROFILE.name, settings, swipe ? 1 : 0 );
    GetAPI().Generate(prompt, settings, swipe)
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
    _message = Utils.ParseNames( _message, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )
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

        if(!e.shiftKey && e.key == "Enter"){
            ConfirmEdit(index, content, _area.value)
        }
    }
    
    _controls.classList.add("controls")
    _controls.style.textAlign = "right"
    _controls.innerHTML = `Esc to <i class="info clickable" onclick=CancelEdit()>Cancel</i>, `
    _controls.innerHTML += `Enter to <i class="info clickable" onclick=ConfirmEdit()>Save changes</i>`;

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
    old_value = Utils.ParseNames( old_value, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )
    content.innerHTML = marked.parse( old_value );
    console.debug(`Cancelled editing message at index ${index}, swipe ${msg.index}`)
}

function ConfirmEdit(index, content, new_value){
    let msg = CURRENT_CHAT.messages[index]
    msg.dom.classList.remove("edit")
    msg.candidates[ msg.index ].text = new_value;
    new_value = Utils.ParseNames( new_value, CURRENT_PROFILE.name, CURRENT_CHARACTER.name )
    content.innerHTML = marked.parse( new_value );
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
    image.setAttribute("src", path.join( GetRootPath(), json.metadata.filepath ));
    image.classList.add("avatar");

    button.appendChild(image);
    return button;
}

function Connect(){
    if(!CURRENT_SETTINGS.api_target) return;
    SetServerStatus(null);
    GetAPI().GetStatus(CURRENT_SETTINGS.api_target);
}

function Disconnect(){
    clearInterval(__status_check)
    SetServerStatus(-1);
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

function UpdateUserAvatar(file){
    if(!file) return;

    let filepath = default_avatar_user;
    if(file){
        filepath = file.path;
        CURRENT_PROFILE.avatar = filepath;
    }else{
        CURRENT_PROFILE.avatar = "";
    }

    DOM_PROFILE_AVATAR.setAttribute("src", filepath);
    SetAvatarCSS("user", filepath );
}

function UpdateCharacterAvatar(file){
    if(!file){
        if(CURRENT_CHARACTER && CURRENT_CHARACTER.metadata){
            CURRENT_CHARACTER.metadata.avatar = undefined;
        }
        return;
    }

    DOM_EDIT_AVATAR.setAttribute("src", file.path)
    if(__creating){
        CURRENT_CREATE.metadata.avatar = file.path;
    }else{
        CURRENT_CHARACTER.metadata.avatar = file.path;
    }
}

function SelectCharacter(character){
    if( __busy ) return;

    DOM_EDIT_AVATAR_UPLOAD.value = "";
    
    if(character){
        __creating = false;
        CURRENT_CHARACTER = character;
        ApplyCharacter(character);
        GetChat(character);
        ToggleChat( true );
        
        let avatar = default_avatar_bot;
        if( CURRENT_CHARACTER.metadata.filepath ){
            avatar = CURRENT_CHARACTER.metadata.filepath;
            avatar = path.join( GetRootPath(), avatar )
        }
    
        SetAvatarCSS( "bot", avatar )
        UpdateCharacterEditingTokens( CURRENT_CHARACTER );
    }else{
        __creating = true;
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
    }else{
        DOM_EDIT_NAME.value = obj.name;
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
    obj.api_target = DOM_SETTINGS_API_TARGET.value.trim()
    obj.api_mode = DOM_SETTINGS_API_MODE.value

    let keys = Object.keys( Settings.subsets[ obj.api_mode ] );
    for( let i = 0; i < keys.length; i++ ){
        let key = keys[i]
        let upper = key.toUpperCase()
        if( DOM_SETTINGS_FIELD[ upper ] ){
            obj[obj.api_mode][key] = parseFloat( DOM_SETTINGS_FIELD[ upper ].value )
        }
    }

    console.debug("Wrote settings from DOM to object")
}

function ApplyProfile(json){
    DOM_PROFILE_NAME.value = json.name;
    let _avatar = json.avatar ? json.avatar : default_avatar_user
    DOM_PROFILE_AVATAR.setAttribute("src", _avatar);
    SetAvatarCSS("user", _avatar)
}

function ApplyCharacter(json){
    let _avatar = json.metadata.filepath ? path.join( GetRootPath(), json.metadata.filepath ) : default_avatar_bot
    DOM_EDIT_AVATAR.setAttribute( "src", _avatar );
    DOM_EDIT_NAME.value = json.name;
    DOM_EDIT_DESCRIPTION.value = json.description;
    DOM_EDIT_GREETING.value = json.greeting;
    DOM_EDIT_PERSONALITY.value = json.personality;
    DOM_EDIT_SCENARIO.value = json.scenario;
    DOM_EDIT_DIALOGUE.value = json.dialogue;
}

function ApplySettings(json){
    DOM_SETTINGS_API_TARGET.value = json.api_target
    DOM_SETTINGS_API_MODE.value = json.api_mode

    let mode = json.api_mode 
    let keys = Object.keys( Settings.subsets[ mode ] );
    for( let i = 0; i < keys.length; i++ ){
        let key = keys[i]
        let upper = key.toUpperCase()
        if( DOM_SETTINGS_FIELD[ upper ] && json[ mode ][ key ] ){
            DOM_SETTINGS_FIELD[ upper ].value = json[ mode ][ key ]
        }
    }

    let elem = document.querySelectorAll(`#settings input[type="text"]`);
    for( let i = 0; i < elem.length; i++ ){
        elem[i].dispatchEvent(new Event("change"))
    }

    console.debug("Read settings from object to DOM")
}

function UpdateCharacterEditingTokens( character ){
    if( !character ) return;
    let tokens = GetAPI().GetTokenConsumption( character, CURRENT_PROFILE.name )

    DOM_EDIT_TOKENS.innerHTML = `${tokens.total} of ${editing_token_threshold} Tokens`
    SetClass( DOM_EDIT_TOKENS, "confirm", tokens.total <= editing_token_threshold )
    SetClass( DOM_EDIT_TOKENS, "danger", tokens.total > editing_token_threshold )
}

function BuildCharactersList(list){
    if( __busy ) return;
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

ipcRenderer.invoke('get_paths').then((resolve) => {
    console.debug("Received path data from Main process")
    PATH_DATA = resolve;

    CURRENT_PROFILE.SetFrom( LoadData( Profile.path, new Profile()) );
    CURRENT_SETTINGS.SetFrom( LoadData( Settings.path, new Settings()) );
    CreateSettings( CURRENT_SETTINGS.api_mode )

    CURRENT_LIST = Character.LoadFromDirectory( Character.path );
    BuildCharactersList( CURRENT_LIST )

    SetAvatarCSS( "bot", default_avatar_bot )
    SetAvatarCSS( "user", default_avatar_user )

    ApplySettings( CURRENT_SETTINGS );
    ApplyProfile( CURRENT_PROFILE );

    ApplySVG();
    ClearTextArea();
    ResizeInputField();
    BuildCollapsible( DOM_EDIT_ADVANCED );
    BuildTabs();

    SetClass(DOM_CHAT, "hidden", true)

    Connect();
})
