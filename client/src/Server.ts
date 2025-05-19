import type {
    ICharacter,
    IChat,
    ISettings,
} from "@shared/types";
import { get } from "svelte/store";
import * as State from "@/State";

let _heartbeat = null;

export async function request( url : string, json = null, timeout_seconds: number = 0 ){
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

    const init_requests = [
        request( "/get_api_modes" ),
        request( "/get_profile" ),
        request( "/get_main_settings" ),
    ]

    await Promise.all(init_requests).then(async responses => {
        State.availableAPIModes.set( responses[0] )
        State.currentProfile.set( responses[1] )
        State.currentSettingsMain.set( responses[2] )
        getStatus()

    }).catch(error => {
        State.characterList.set( [] )
        State.availableAPIModes.set( [] )
        disconnect()
        console.error(error)
    })

    await getCharacterList()

    let favs = JSON.parse(window.localStorage.getItem("favorites"))
    State.favoritesList.set( favs ? favs : [] )


    const settings = get( State.currentSettingsMain )
    const mode = settings.api_mode
    const post_requests = [
        request( "/get_api_settings", { api_mode: mode }),
        request( "/get_api_defaults", { api_mode: mode }),
        request( "/get_presets", {} ),
        request( "/get_prompt" ),
        request( "/get_lorebooks" ),
    ]

    await Promise.all(post_requests).then(async responses => {
        State.currentSettingsAPI.set( responses[0] )
        State.defaultSettingsAPI.set( responses[1] )
        State.currentPresets.set( responses[2] )
        State.defaultPrompt.set( responses[3] )
        State.currentLorebooks.set( responses[4] )
        getAPIStatus()
    }).catch((error) => {
        disconnect()
        console.error(error)
    })

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
    await request("/get_characters").then( async response => {
        if( response ){
            response.sort((a : ICharacter, b : ICharacter) => { return b.metadata.created - a.metadata.created });
            State.characterList.set( response )
        }
    })
}

export async function getCharacter(filepath : String){
    await request( "/get_character", { filepath: filepath }).then(data => {
        State.currentCharacter.set(data);
    });
}

export async function getChats(character : ICharacter, set_latest = false){
    let list = await request( "/get_chats", { character: character });
    let latest_time = 0;
    let latest_chat = null;

    if( list && list.length > 0 ){
        list.sort((a : IChat, b : IChat) => { return b.last_interaction - a.last_interaction });
    }

    console.debug(`Retrieved chats for ${character.data.name}`)
    State.chatList.set( null )
    State.chatList.set( list )

    if( set_latest ){
        if( list.length > 0 ){
            list.forEach((chat : IChat) => {
                if( chat.last_interaction > latest_time && chat.messages.length > 0 ){
                    latest_time = chat.last_interaction;
                    latest_chat = chat;
                }
            })
        }else{
            latest_chat = await request( "/new_chat", { character: character });
        }
        State.currentChat.set(null);
        State.currentChat.set(latest_chat);
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
    const api_settings = get( State.currentSettingsAPI)
    const mode = main_settings.api_mode
    await request("/save_main_settings", { data: main_settings })
    await request("/save_api_settings", { api_mode: mode, data: api_settings })
}

export async function addToRecentlyChatted(character: ICharacter): Promise<void>{
    // parse the recents list if it exists in local storage
    const path : string = character.temp.filepath.replaceAll("../user/characters/", "")
    const currentSettingsMain: ISettings = get( State.currentSettingsMain )
    if( !currentSettingsMain.recents || !Array.isArray( currentSettingsMain.recents )){
        currentSettingsMain.recents = []
    }
    if (currentSettingsMain.recents.at(-1) === path){
        return
    }
    const index = currentSettingsMain.recents.findIndex((item : string) => item === path)
    if(index > -1){
        currentSettingsMain.recents.splice(index, 1)
    }
    currentSettingsMain.recents.push(path)
    await request("/save_main_settings", {data: currentSettingsMain})
}