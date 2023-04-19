<script lang="ts">
    import { localServer, editing, currentCharacter, currentChat } from "./State";

    export let id : number = -1
    export let character = null
    $: name = character.name
    $: avatar = character.metadata.filepath

    async function SelectCharacter(){
        if( $currentCharacter == character ){
            $editing = true;
            return;
        }

        let options = { 
            method: "POST", 
            body: JSON.stringify(character),
            headers: { 
                "Content-Type": "application/json",
                "Content-Length": name.length.toString(),
            }, 
        }
        await fetch(localServer + "/get_latest_chat", options).then((response) => {
            if(!response.ok){
                return;
            }

            response.json().then((body) => {
                $currentCharacter = character;
                $currentChat = body;
                $editing = false;
                console.debug(`Received latest chat for ${name}`);
            })
        });
        
        console.debug(`Selected character ${name} (ID: ${id})`)
    }
</script>

<button 
    style="background-image: url({encodeURIComponent(avatar)})" 
    title={name} 
    on:click={SelectCharacter}
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