<script lang="ts">
    import { fetching, editing, favoritesList, currentCharacter, creating, localServer, history, deleting, busy } from "../State";
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "./Server.svelte";

    export let id : number = -1
    export let character : ICharacter | null = null
    export let label : boolean = false;

    $: name = character.name
    $: avatar = character.metadata.filepath
    $: url = avatar ? localServer + "/" + encodeURIComponent(avatar.replace("../", "")).replace(/%2F/g, '/').replace(/%3A/g, ':') : ""
    $: filename = character.metadata.filepath.replaceAll("../user/characters/", "")
    $: favorited = $favoritesList.indexOf(filename) > -1

     async function SelectCharacter(filepath : string){
        if( $fetching || $busy ){
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

    function FavoriteCharacter(s : String){
        let i = $favoritesList.indexOf(s)
        if( i > -1 ){
            $favoritesList.splice(i, 1)
        }else{
            $favoritesList.push(s)
        }
        $favoritesList = $favoritesList
        window.localStorage.setItem("favorites", JSON.stringify($favoritesList))
    }
</script>

<div class="container">
    <button class="main" on:click={() => SelectCharacter(avatar)}>
        <div class="avatar" style="background-image: url({url}?{character.last_changed})"/>
        {#if label}
            <div class="label">
                <div class="name">{character.name}</div>
                <div class="sub">{filename}</div>
            </div>
            
        {/if}
        <button class="favorite" class:special={favorited} class:normal={!favorited} on:click|stopPropagation={() => FavoriteCharacter(filename)}>{@html SVG.star}</button>
    </button>
</div>


<style>
    .container{
        position: relative;
    }

    .main{
        display: flex;
        flex-direction: row;
        gap: 16px;
        font-family: var( --default-font-face );
        font-size: var( --default-font-size );
        width: 100%;
        background: transparent;
    }

    .label{
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    .avatar{
        position: relative;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        border-radius: 50%;
        border: 0px;
        box-shadow: 0px 0px 0px 0px transparent;
        filter: brightness(0.75);
        min-width: var( --avatar-size );
        min-height: var( --avatar-size );
        max-width: var( --avatar-size );
        max-height: var( --avatar-size );
        outline: 1px solid white;
        padding: 0px;
        transition: all 0.125s ease-out;
    }
    
    .main:hover .avatar{
        box-shadow: 0px 0px 8px 2px #ffffff80;
        filter: brightness(1);
        outline: 2px solid white;
    }

    .label{
        text-align: left;
        font-family: var( --default-font-face );
        font-size: 100%;
        gap: 2px;

        overflow: hidden;
        white-space: nowrap;

        margin-right: 40px;
    }
    
    .name{
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: bolder;
        color: white;
    }
    
    .sub{
        direction: rtl;
        overflow: hidden;
        text-overflow: ellipsis;

        padding: 0px;
        font-size: 80%;
        color: gray;
    }

    .main:hover .sub{
        color: var( --accent-color-light );
    }
    
    .favorite{
        position: absolute;
        top: 50%;
        translate: 0 -50% 0;
        right: 0px;
        background: hsl(0, 0%, 10%);
        border: 1px solid hsl(0, 0%, 20%);
        border-radius: 50%;
        width: 32px;
        height: 32px;
    }

    .favorite :global(svg){
        margin-top: 2px;
        width: 16px;
        height: 16px;
    }


</style>