<script lang="ts">
    import { fetching, editing, currentCharacter, creating, localServer, history, deleting } from "@/State";
    import * as Server from "@/lib/Server.svelte";

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
        await Server.getCharacter(filepath);
        await Server.getChats( $currentCharacter, true )
        $history = false;
        $deleting = false;
        $editing = null;

        let tokens = await Server.getCharacterTokens( $currentCharacter );
        $currentCharacter.metadata.tokens = tokens
        $currentCharacter = $currentCharacter
        
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