<script lang="ts">
    import { fetching, editing, favoritesList, currentCharacter, creating, localServer, history, deleting, busy, tabEditing } from "../State";
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "../modules/Server.svelte";
    import { LazyLoad } from "../utils/LazyLoad";

    export let id : number = -1
    export let character : ICharacter | null = null
    export let label : boolean = false;

    let loaded : boolean = false

    $: name = character.data.name
    $: avatar = character.temp.filepath
    $: address = getImageAddress(avatar)
    $: filename = character.temp.filepath.replaceAll("../user/characters/", "")
    $: favorited = $favoritesList.indexOf(filename) > -1

    $: url = `${address}?${character.metadata.modified}`

    function getImageAddress(path){
        if( !path )
            return ""
        path = encodeURIComponent(path.replace("../", ""))
        path = path.replace(/%2F/g, '/')
        path = path.replace(/%3A/g, ':')
        return localServer + "/" + path
    }

    async function SelectCharacter(filepath : string){
        if( $fetching || $busy ){
            return;
        }

        $creating = false;

        if( $currentCharacter && $currentCharacter.temp.filepath == filepath ){
            $editing = $currentCharacter
            $tabEditing = 0
            return;
        }

        $fetching = true;
        await Server.getCharacter(filepath);
        await Server.getChats( $currentCharacter, true )
        $history = false;
        $deleting = false;
        $editing = null;

        let tokens = await Server.getCharacterTokens( $currentCharacter );
        $currentCharacter.temp.tokens = tokens
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

<div class="container" use:LazyLoad on:lazyload={() => loaded=true}>
    <button class="main" on:click={() => SelectCharacter(avatar)}>
        <div class="avatar" style="background-image: url({loaded ? url : ""})"/>
        {#if label}
            <div class="label">
                <div class="name">{character.data.name}</div>
                <div class="sub">{filename}</div>
            </div>
            
        {/if}
        <button class="favorite special" class:checked={favorited} title={favorited ? "Remove from favorites" : "Add to favorites"} on:click|stopPropagation={() => FavoriteCharacter(filename)}>{@html SVG.star}</button>
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
        padding: 8px 0px;
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
        outline: 0px solid white;
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
        color: hsl(0, 0%, 85%);
    }
    
    .sub{
        /* direction: rtl; */
        overflow: hidden;
        text-overflow: ellipsis;

        padding: 0px;
        font-size: 80%;
        color: gray;
    }

    .main:hover .name{
        color: white;
    }

    .main:hover .sub{
        color: var( --accent-color-light );
    }
    
    .favorite{
        position: absolute;
        top: 0px;
        right: 0px;
        width: 24px;
        height: 100%;
        opacity: 0.15;
        filter: grayscale(0.666666);
        
    }
    
    .checked{
        opacity: 1;
        filter:grayscale(0);
    }
    
    .favorite :global(svg){
        margin-top: 2px;
    }


</style>