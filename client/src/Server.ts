import type {
    ICharacter,
    IChat,
    IMessage,
    ICandidate,
} from "@shared/types";
import { get } from "svelte/store";
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
        req = {
            method: "POST",
            body: JSON.stringify(json),
            headers: headers
        }
    }else{
        req = {
            method: "GET",
            headers: headers
        }
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

export async function ListChats(character : ICharacter, set_latest = false){
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
        console.debug(`Applied latest chat for ${character.data.name}`)
    }
}

export async function newChat(){
    const character = get( State.currentCharacter )
    if( !character ){
        return
    }
    await request( "/new_chat", { character: character }).then( data => {
        State.currentChat.set( data )
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
    await ListChats( character, true )
    let tokens = await getCharacterTokens( character );
    character.temp.tokens = tokens
    State.currentCharacter.set(character)
    State.fetching.set(false);
}

export async function branchChat(id: number, title: string): Promise<number|undefined>{
    const currentChat: IChat = get( State.currentChat )
    const branchChat: IChat = JSON.parse( JSON.stringify( currentChat ))
    branchChat.messages = branchChat.messages.slice(0, id + 1)
    let last: IMessage = branchChat.messages.at(-1)
    let focused: ICandidate = last.candidates[last.index];
    last.candidates = [focused];
    last.index = 0
    return await request("/duplicate_chat", {
        chat: branchChat,
        title: title || `Branch of ${currentChat.title}`,
        branch: focused
    })
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
    currentChat.messages.push(new_message)
    State.currentChat.set( currentChat )
    let success: boolean = false
    if(!currentChat.id){
        let created: IChat = await request("/create_chat", {
            character: currentCharacter,
            chat: currentChat
        })
        if(created && created.id){
            State.currentChat.set( created )
            success = true;
        }
    }else{
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
    }
    return success
}

export async function deleteMessages(message_ids: Array<number>): Promise<boolean>{
    const currentChat: IChat = get( State.currentChat )
    const deleteList: Array<number> = get( State.deleteList )
    const success: boolean = await request("/delete_messages", {
        ids: message_ids.map(id => currentChat.messages[id].id)
    })
    if( success ){
        currentChat.messages = currentChat.messages.filter((_msg: IMessage, index: number) => {
            return index == 0 || !deleteList.includes(index)
        })
        State.currentChat.set( currentChat )
    }
    return success
}

export async function deleteCandidate(id: number, index: number): Promise<boolean>{
    const currentChat: IChat = get( State.currentChat )
    const candidate: ICandidate = currentChat.messages[id].candidates[index]
    const success: boolean = await request("/delete_candidate", { id: candidate.id })
    if( !success )
        return
    currentChat.messages[id].candidates.splice(index, 1)
    let num_candidates = currentChat.messages[id].candidates.length;
    if( num_candidates < 1 ){
        currentChat.messages.splice(id, 1)
    }else{
        currentChat.messages[id].index = Math.max(0, Math.min( index, num_candidates-1 ))
    }
    const last_id = currentChat.messages.length - 1
    await request("/swipe_message", {
        message: currentChat.messages[last_id],
        index: currentChat.messages[last_id].index
    })
    State.currentChat.set( currentChat )
    return success
}