<script lang="ts">
    import { fetching, editing, currentCharacter, currentChat, currentProfile, currentSettings, chatList, creating, localServer, history, deleting } from "../State";
    import { serverRequest } from "./Server.svelte";

    export let id : number = -1
    export let character : ICharacter | null = null
    $: name = character.name
    $: avatar = character.metadata.filepath
    $: url = avatar ? localServer + "/" + encodeURIComponent(avatar.replace("../", "")).replace(/%2F/g, '/').replace(/%3A/g, ':') : ""

    async function SelectCharacter(filepath : string){
        if( $fetching ){
            return;
        }

        $creating = false;
        if( $currentCharacter && $currentCharacter.metadata.filepath == filepath ){
            $editing = $currentCharacter
            return;
        }

        $fetching = true;
        await serverRequest( "/get_character", { filepath: filepath }).then(data => {
            $currentCharacter = data;
            $history = false;
            $deleting = false;
        });

        await serverRequest( "/get_chats", { character: character }).then(async (data) => {
            let latest_time = 0;
            let latest_chat = null;

            if( !data || data.length < 1){
                $chatList = []
                latest_chat = await serverRequest( "/new_chat", { character: character });

            }else{
                // get latest chat
                $chatList = data;
                $chatList.sort((a : IChat, b : IChat) => { return b.last_interaction - a.last_interaction });
                for(let i = 0; i < data.length; i++){
                    let chat = data[i]
                    if( chat.last_interaction > latest_time && chat.messages.length > 0 ){
                        latest_time = chat.last_interaction;
                        latest_chat = chat;
                    }
                }
            }

            $currentChat = latest_chat;
            $editing = null;
            console.debug(`Applied latest chat for ${name}`);
        });

        let body = { 
            api_mode: $currentSettings.api_mode, 
            character: $currentCharacter, 
            user: $currentProfile.name, 
            settings: $currentSettings[ $currentSettings.api_mode ] 
        }

        await serverRequest( "/get_character_tokens", body ).then(data => {
            $currentCharacter.metadata.tokens = data;
            $currentCharacter = $currentCharacter
        })
        
        console.debug(`Selected character ${name} (ID: ${id})`)
        $fetching = false;
    }
</script>

<button 
    style="background-image: url({url}?{character.last_changed})" 
    title={name} 
    on:click={() => SelectCharacter(avatar)}
></button>

<style>
    button{
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        border-radius: 50%;
        border: 0px;
        box-shadow: 0px 0px 0px 0px transparent;
        filter: brightness(0.75);
        min-height: var( --avatar-size );
        min-width: var( --avatar-size );
        outline: 1px solid white;
        padding: 0px;
        transition: all 0.125s ease-out;
    }
    
    button:hover{
        box-shadow: 0px 0px 8px 2px #ffffff80;
        filter: brightness(1);
        outline: 2px solid white;
    }
</style>