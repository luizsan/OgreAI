<script context="module" lang="ts">
    import * as State from "./State";

    export async function serverRequest( url : string, json = {}){
        const req = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json)
        }

        const response = await fetch(State.localServer + url, req);
        const data = await response.json();
        return data;
    }

    export async function initializeData(){
        State.connected.set(null);

        const requests = [
            serverRequest( "/get_profile" ),
            serverRequest( "/get_settings" ),
            serverRequest( "/get_api_modes" ),
            serverRequest( "/get_characters" ),
            serverRequest( "/get_api_settings", { api_mode: "openai" } ),
        ]

        await Promise.all(requests).then((responses) => {
            State.currentProfile.set( responses[0] )
            State.currentSettings.set( responses[1] )
            State.availableAPIModes.set( responses[2] )
            
            const _characters = responses[3]
            _characters.sort((a,b) => { return b.create_date - a.create_date });
            State.characterList.set( _characters)
            State.availableAPISettings.set( responses[4] )
            State.connected.set(true)
            console.debug("ogey!")
            
        }).catch((error) => {
            State.characterList.set( [] )
            State.availableAPIModes.set( [] )
            State.connected.set(false)
            console.error(error)
        })
    }

    

</script>