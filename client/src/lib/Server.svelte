<script context="module" lang="ts">
    import { get } from "svelte/store";
    import * as State from "../State";
    
    let _heartbeat = null;

    export async function serverRequest( url : string, json = {}){
        const req = {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify(json)
        }

        const response = await fetch(State.localServer + url, req);
        const data = await response.json();
        console.log(`${State.localServer + url}:\n%o`, data)
        return data;
    }

    export function localServerStatus(){
        fetch( State.localServer + "/status" ).then( response => {
            if( response.ok ){
                _heartbeat = setTimeout( localServerStatus, 1000 )
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

        const init_requests = [
            serverRequest( "/get_profile" ),
            serverRequest( "/get_settings" ),
            serverRequest( "/get_api_modes" ),
            serverRequest( "/get_characters" ),
        ]

        await Promise.all(init_requests).then(async responses => {
            State.currentProfile.set( responses[0] )
            State.currentSettings.set( responses[1] )
            State.availableAPIModes.set( responses[2] )
            
            const _characters = responses[3]
            _characters.sort((a : ICharacter, b : ICharacter) => { return b.create_date - a.create_date });
            State.characterList.set( _characters)
            State.connected.set(true)
            
            localServerStatus()
            console.debug("ogey!")
            
        }).catch(error => {
            State.characterList.set( [] )
            State.availableAPIModes.set( [] )
            disconnect()
            console.error(error)
        })
        
        const settings = get( State.currentSettings )
        const mode = settings.api_mode

        const post_requests = [
            serverRequest( "/get_api_settings", { api_mode: mode } ),
            serverRequest( "/get_api_status", settings ),
        ]

        await Promise.all(post_requests).then(async responses => {
            State.availableAPISettings.set( responses[0] )
            State.api.set( responses[1] )
        }).catch((error) => {
            disconnect()
            console.error(error)
        })
    }

    export async function getCharacterList(){
        await serverRequest("/get_characters").then( async response => {
            if( response ){
                response.sort((a : ICharacter, b : ICharacter) => { return b.create_date - a.create_date });
                State.characterList.set( response )
            }
        })
    }



    

</script>