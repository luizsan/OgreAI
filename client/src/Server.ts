import type {
    ICharacter,
    IChat,
    IMessage,
    ICandidate,
} from "@shared/types";


import { get } from "svelte/store";
import * as Dialog from "@/modules/Dialog.ts";
import * as Format from "@shared/format.ts";
import * as State from "@/State";
import { tick } from "svelte";

let _heartbeat = null;

export async function request( url : string, json = null, timeout_seconds: number = 0 ): Promise<any>{
    let req : RequestInit;
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
    }
    if( json ){
        req = { method: "POST", body: JSON.stringify(json), headers: headers }
    }else{
        req = { method: "GET", headers: headers }
    }
    if( timeout_seconds > 0 ){
        req.signal = AbortSignal.timeout(timeout_seconds * 1000)
    }
    const response = await fetch(State.localServer + url, req);
    const data = await response.json();
    return data;
}

export function getStatus(){
    fetch( State.localServer + "/status" ).then( response => {
        if( response.ok ){
            _heartbeat = setTimeout( status, 1000 )
        }else{
            console.warn("Disconnected from server!")
            disconnect()
        }
    }).catch(error => {
        console.log(error)
        disconnect()
    })
}

export async function disconnect(){
    State.connected.set(false)
    if( _heartbeat != null ){
        clearTimeout( _heartbeat );
    }
}

export async function initializeData(){
    State.connected.set(null);
    if( _heartbeat != null ){
        clearTimeout( _heartbeat );
    }

    let status = await fetch( State.localServer + "/status" )
    if( !status || !status.ok ){
        disconnect()
        return;
    }

    const startup_requests: Array<Promise<any>> = [
        request( "/get_api_modes" ).then(response => State.availableAPIModes.set(response)),
        request( "/get_profile" ).then(response => State.currentProfile.set(response)),
        request( "/get_main_settings" ).then(response => State.currentSettingsMain.set(response)),
        getCharacterList(),
    ]

    for( let i = 0; i < startup_requests.length; i++ ){
        await startup_requests[i].catch(error => {
            State.characterList.set( [] )
            State.availableAPIModes.set( [] )
            disconnect()
            console.error(error)
        });
    }

    const chatCount = await request( "/count_chats", {} )
    State.chatCount.set( chatCount )

    getStatus()
    let favs = JSON.parse(window.localStorage.getItem("favorites"))
    State.favoritesList.set( favs ? favs : [] )

    const settings = get( State.currentSettingsMain )
    const mode = settings.api_mode
    const post_requests: Array<Promise<any>> = [
        request( "/get_api_defaults", { api_mode: mode }).then(response => State.defaultSettingsAPI.set(response)),
        request( "/get_api_settings", { api_mode: mode }).then(response => State.currentSettingsAPI.set(response)),
        request( "/get_api_prompt", { api_mode: mode }).then(response => State.currentPrompt.set(response)),
        request( "/get_default_prompt" ).then(response => State.defaultPrompt.set(response)),
        request( "/get_presets", {} ).then(response => State.currentPresets.set(response)),
        request( "/get_lorebooks" ).then(response => State.currentLorebooks.set(response)),
    ]

    for ( let i = 0; i < post_requests.length; i++ ){
        await post_requests[i].catch(error => {
            disconnect()
            console.error(error)
        });
    }

    getAPIStatus()
    State.connected.set(true)
}

export async function getAPIStatus(){
    let api = get( State.api )
    if( api === null ){
        return
    }

    let settings_main = get( State.currentSettingsMain )
    let settings_api = get( State.currentSettingsAPI )
    let mode = settings_main.api_mode;

    State.api.set( null );
    let result = await request( "/get_api_status", {
        api_mode: mode, settings: settings_api
    }, 5.0 )
    State.api.set( result )
}

export async function getCharacterList(){
    let list: Array<ICharacter> = await request("/get_characters")
    const count: Record<string, number> = await request("/count_chats", {})
    const latest: Record<string, number> = await request("/latest_chats", {})
    list.forEach((character : ICharacter) => {
        const id = character.temp.filename
        character.temp.chat_count = count[id] || 0
        character.temp.chat_latest = latest[id] || 0
    })
    console.log(`Retrieved character list: %o`, list)
    State.characterList.set( list )
}

export async function getCharacter(filepath : String){
    await request( "/get_character", { filepath: filepath }).then(data => {
        State.currentCharacter.set(data);
    });
}

export async function listChats(character : ICharacter, set_latest = false){
    let list: Array<IChat> = await request( "/list_chats", { character_id: character.temp.filepath });
    let latest_chat: IChat = null;
    if( list && list.length > 0 ){
        list.sort((a : IChat, b : IChat) => { return b.last_interaction - a.last_interaction });
    }
    character.temp.chat_count = list.length
    console.debug(`Retrieved chats for ${character.data.name}`)
    State.chatList.set( null )
    State.chatList.set( list )

    if( set_latest ){
        if( list.length > 0 ){
            latest_chat = await request( "/load_chat", { id: list.at(0).id });
        }else{
            latest_chat = await request( "/new_chat", { character: character });
        }
        character.temp.chat_latest = latest_chat.last_interaction
        State.currentChat.set(null);
        State.currentChat.set(latest_chat);
        await tick()
        document.dispatchEvent(new CustomEvent("autoscroll"))
        console.debug(`Applied latest chat for ${character.data.name}: %o`, latest_chat)
    }
}

export function updateChats(timestamp : number = Date.now()){
    const currentCharacter: ICharacter = get( State.currentCharacter )
    const currentChat: IChat = get( State.currentChat )
    const characterList = get( State.characterList )
    const chatList = get( State.chatList )

    currentCharacter.temp.chat_latest = timestamp
    currentChat.last_interaction = timestamp

    const chatIndex = chatList.findIndex((entry: IChat) => {
        return entry.id === currentChat.id
    })
    const characterIndex = characterList.findIndex((character: ICharacter) => {
        return character.temp.filepath === currentCharacter.temp.filepath
    })

    // update the entry on characterlist
    characterList[characterIndex].temp.chat_latest = timestamp
    // update current chat if not indexed
    if( chatIndex < 0 ){
        chatList.push( currentChat )
        currentCharacter.temp.chat_count = chatList.length
        characterList[characterIndex].temp.chat_count = chatList.length
    }

    State.currentChat.set( currentChat )
    State.chatList.set( chatList )
    State.currentCharacter.set( currentCharacter )
    State.characterList.set( characterList )
}

export async function newChat(){
    const character = get( State.currentCharacter )
    if( !character ){
        return
    }
    await request( "/new_chat", { character: character }).then( data => {
        State.currentChat.set( data )
        State.history.set( false )
        State.swipes.set( null )
    }).catch( error => {
        console.error(error)
        State.currentChat.set( null )
    })
}

export async function getCharacterTokens( character : ICharacter ){
    let settings_main = get( State.currentSettingsMain )
    let settings_api = get( State.currentSettingsAPI )
    let profile = get( State.currentProfile )
    let body = {
        api_mode: settings_main.api_mode,
        character: character,
        user: profile.name,
        settings: settings_api
    }
    return request( "/get_character_tokens", body )
}

export async function saveSettings(): Promise<void>{
    const main_settings = get( State.currentSettingsMain )
    const api_settings = get( State.currentSettingsAPI )
    const mode = main_settings.api_mode
    await request("/save_main_settings", { data: main_settings })
    await request("/save_api_settings", {
        api_mode: mode,
        data: api_settings
    })
}

export async function savePrompt(): Promise<void>{
    await request("/save_api_prompt", {
        api_mode: get( State.currentSettingsMain ).api_mode,
        data: get( State.currentPrompt )
    })
}

export async function loadChat(chat: IChat){
    State.fetching.set(true)
    const new_chat: IChat = await request( "/load_chat", { id: chat?.id});
    if( !new_chat ){
        await Dialog.alert("OgreAI", "Failed to load chat!")
    }else{
        State.currentChat.set( new_chat )
        await tick()
        document.dispatchEvent(new CustomEvent("autoscroll"));
    }
    State.swipes.set(null)
    State.history.set(false)
    State.fetching.set(false)
    console.debug(`Loaded chat: %o`, new_chat)
}

export async function loadLastChat(){
    const charactersList = get( State.characterList )
    if( charactersList.length < 1 )
        return

    let recently_chatted = charactersList.sort((a : ICharacter, b : ICharacter) => {
        return b.temp.chat_latest - a.temp.chat_latest
    })

    if( recently_chatted.length < 1 )
        return
    if( recently_chatted.at(0).temp.chat_latest === 0 )
        return

    State.fetching.set(true)
    const character : ICharacter = recently_chatted.at(0)
    await listChats( character, true )
    let tokens = await getCharacterTokens( character );
    character.temp.tokens = tokens
    State.currentCharacter.set(character)
    State.fetching.set(false);
}

export async function changeChatTitle(chat?: IChat) : Promise<boolean> {
    const currentChat: IChat = chat || get( State.currentChat )
    let new_title = await Dialog.prompt("OgreAI", "Insert the new chat title:", currentChat.title)
    if( new_title?.trim() && new_title !== currentChat.title ){
        currentChat.title = new_title
        const success = await request("/update_chat", { chat: currentChat })
        if( success ){
            await Dialog.alert("OgreAI", "Chat title updated!")
            if( !chat )
                State.currentChat.set( currentChat )
            return true
        }else{
            await Dialog.alert("OgreAI", "Failed to update chat title!")
        }
    }
    return false
}

export async function branchChat(msg_index: number, candidate_index?: number): Promise<number|undefined>{
    // confirmation
    const currentChat: IChat = get( State.currentChat )
    const defaultTitle = `Branch of ${currentChat.title}`
    const title = await Dialog.prompt("OgreAI", "Creating a new chat from the selected message. Insert the new chat title:", defaultTitle)
    if(title?.trim() == null)
        return
    State.fetching.set(true)
    // operations
    const branch: IChat = JSON.parse( JSON.stringify( currentChat ))
    branch.messages = branch.messages.slice(0, msg_index + 1)
    let last: IMessage = branch.messages.at(-1)
    let new_index: number = candidate_index && candidate_index > -1 ? candidate_index : last.index
    let focused: ICandidate = last.candidates[new_index];
    last.candidates = [focused];
    last.index = 0
    const new_id = await request("/duplicate_chat", {
        chat: branch,
        title: title || defaultTitle,
        branch: focused
    })
    if (!new_id){
        await Dialog.alert("OgreAI", "Failed to branch chat!")
    }else{
        await listChats( get(State.currentCharacter), true )
        updateChats();
        await Dialog.alert("OgreAI", "Successfully branched chat!")
    }
    State.fetching.set(false)
}

export async function sendMessage(content: string): Promise<boolean>{
    const currentChat: IChat = get( State.currentChat )
    const currentCharacter: ICharacter = get( State.currentCharacter )
    console.debug( currentChat.messages )
    let new_message: IMessage = {
        participant: -1,
        index: 0,
        timestamp: Date.now(),
        candidates: [{
            text: Format.parseMacros(content, currentChat),
            timestamp: Date.now(),
        }]
    }
    // immediate feedback even if the sent message fails
    // only add non-empty messages
    const has_content = content?.trim().length > 0
    if( has_content ){
        currentChat.messages.push(new_message)
    }
    State.currentChat.set( currentChat )
    let success: boolean = false
    if(!currentChat.id){
        // no ID = no chat in the server, create a new chat and apply it before generating a response
        let created: IChat = await request("/create_chat", {
            character: currentCharacter,
            chat: currentChat
        })
        if(created && created.id){
            State.currentChat.set( created )
            success = true;
        }
    }else if(has_content){
        // overrides the message added by the client with the one from the server
        let added: IMessage = await request("/add_message", {
            chat: currentChat,
            message: new_message
        })
        if(added && added.id){
            let last_index = currentChat.messages.length - 1
            currentChat.messages[last_index] = added
            State.currentChat.set( currentChat )
            success = true;
        }
    }else{
        // no message to be added, consider a success
        success = true
    }
    return success
}

export async function deleteMessages(message_indices: Array<number>): Promise<boolean>{
    if( message_indices.includes(0) )
        return false
    const deleteList: Array<number> = get( State.deleteList )
    if( deleteList.length <= 0 )
        return false
    const ok = await Dialog.confirm("OgreAI", `Are you sure you want to delete ${message_indices.length} message(s)?`)
    if( !ok )
        return false
    State.busy.set(true)
    const currentChat: IChat = get( State.currentChat )
    const success: boolean = await request("/delete_messages", {
        ids: message_indices.map(id => currentChat.messages[id].id)
    })
    State.busy.set(false)
    if( success ){
        currentChat.messages = currentChat.messages.filter((_msg: IMessage, index: number) => {
            return index == 0 || !deleteList.includes(index)
        })
        State.currentChat.set( currentChat )
    }
    return success
}

export async function swipeMessage(message: IMessage, new_index: number): Promise<boolean> {
    const currentChat: IChat = get( State.currentChat )
    const candidates = message.candidates
    const last = message.candidates.length-1

    if( new_index < 0 )
        new_index = 0;
    if( new_index > candidates.length-1 )
        new_index = candidates.length-1;

    if( last ){
        document.dispatchEvent(new CustomEvent("autoscroll"))
    }

    let success = true
    if( message.id ){
        State.busy.set(true)
        success = await request("/swipe_message", {
            message: message,
            index: new_index
        })
        console.log("ogey!")
        State.busy.set(false)
    }

    if( success ){
        message.index = new_index
        State.currentChat.set( currentChat )
    }

    return success
}

export async function deleteCandidate(msg_index: number, candidate_index: number): Promise<boolean>{
    if( msg_index == 0 )
        return
    const ok = await Dialog.confirm("OgreAI", "Are you sure you want to delete this message?")
    if( !ok )
        return
    State.busy.set(true)
    const currentChat: IChat = get( State.currentChat )
    const candidate: ICandidate = currentChat.messages[msg_index].candidates[candidate_index]
    const success: boolean = await request("/delete_candidate", { id: candidate.id })
    if( success ){
        currentChat.messages[msg_index].candidates.splice(candidate_index, 1)
        let num_candidates = currentChat.messages[msg_index].candidates.length;
        if( num_candidates < 1 ){
            currentChat.messages.splice(msg_index, 1)
        }else{
            currentChat.messages[msg_index].index = Math.max(0, Math.min( candidate_index, num_candidates-1 ))
        }
        const last_id = currentChat.messages.length - 1
        await request("/swipe_message", {
            message: currentChat.messages[last_id],
            index: currentChat.messages[last_id].index
        })
        State.currentChat.set( currentChat )
        if( success && last_id == msg_index ){
            document.dispatchEvent(new CustomEvent("autoscroll"))
        }
    }
    State.busy.set(false)
    return success
}

export async function copyMessage(msg_index: number, candidate_index: number): Promise<void>{
    const currentChat: IChat = get( State.currentChat )
    const message: IMessage = currentChat.messages[msg_index]
    const candidate: ICandidate = message.candidates[candidate_index];
    navigator.clipboard.writeText(candidate.text).then(async function(){
        await Dialog.alert("OgreAI", 'Text copied to clipboard!');
    }).catch(async function(err) {
        console.error('Failed to copy text: ', err);
        await Dialog.alert("OgreAI", 'Failed to copy text to clipboard.\n' + err);
    });
}

export function startMessageEdit(message: IMessage){
    const editList = get( State.editList )
    if(!editList.includes(message)){
        editList.push(message)
        State.editList.set( editList )
    }
}

export function cancelMessageEdit(message: IMessage){
    const editList = get( State.editList )
    if(editList.includes(message)){
        editList.splice(editList.indexOf(message), 1)
        State.editList.set( editList )
    }
}

export async function confirmMessageEdit(message: IMessage, content: string, rules?: any){
    content = content.trim()
    content = Format.regexReplace(content, ["on_edit"], rules)
    content = Format.randomReplace(content).trim()

    const currentChat: IChat = get( State.currentChat )
    const index = currentChat.messages.indexOf(message)
    const candidate = message.candidates[message.index]

    let new_candidate: ICandidate = {
        id: candidate.id,
        text: content.trim(),
        timestamp: candidate.timestamp,
        model: candidate.model,
        reasoning: candidate.reasoning,
        timer: candidate.timer,
        tokens: candidate.tokens
    }

    if( !content ){
        await deleteCandidate(index, message.index);
    }else{
        let ok = true
        if(candidate.id){
            ok = await request( "/update_candidate", { candidate: new_candidate })
        }
        if( ok ){
            currentChat.messages[index].candidates[message.index] = new_candidate
            State.currentChat.set( currentChat )
        }
    }
    cancelMessageEdit(message)
}