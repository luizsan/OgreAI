<script lang="ts">
    import type {
        ICharacter
    } from "@shared/types";

    import {
        fetching,
        editing,
        favoritesList,
        characterList,
        currentCharacter,
        creating,
        localServer,
        history,
        deleting,
        busy,
        tabEditing,
        sectionCharacters,
        generating,

        swipes

    } from "@/State";

    import{
        displayOrientation
    } from "@/modules/Theme";

    import * as Format from "@shared/format.ts";
    import * as SVG from "@/svg/Common.svelte";
    import * as Server from "@/Server";
    import { LazyLoad } from "@/utils/LazyLoad";

    export let id : number = -1
    export let character : ICharacter | null = null
    export let label : boolean = false;
    export let sort : string = "";

    let loaded : boolean = false

    $: lockinput = $busy || $generating || $fetching

    $: filepath = (character?.temp?.filepath ?? "") as string
    $: favorited = ($favoritesList.indexOf(filepath) > -1) as boolean

    $: createdTime = (character?.metadata?.created ?? character?.temp ?? 0) as number
    $: chatLatest = (character?.temp?.chat_latest ?? 0) as number
    $: chatCount = (character?.temp?.chat_count ?? 0) as number
    $: labelCount = `${chatCount == 1 ? "chat" : "chats"}`

    $: isPortrait = ($displayOrientation === "portrait") as boolean

    function getImageAddress(path){
        if( !path )
            return ""
        path = encodeURIComponent(path.replace("../", ""))
        path = path.replace(/%2F/g, '/')
        path = path.replace(/%3A/g, ':')
        return localServer + "/user/characters/" + path
    }

    function getFilename(path){
        return path.replaceAll("../user/characters/", "")
    }

    function getImageURL(path){
        const address = getImageAddress(path)
        return `${address}?${character.metadata.modified}`
    }

    async function SelectCharacter(filepath : string){
        if( lockinput ){
            return;
        }

        $creating = false;

        if( $currentCharacter && $currentCharacter.temp.filepath == filepath ){
            $editing = $currentCharacter
            $tabEditing = 0
            return;
        }

        $fetching = true;
        await Server.getCharacter( filepath );
        await Server.listChats( $currentCharacter, true )
        $swipes = null;
        $history = false;
        $deleting = false;
        $editing = null;

        let tokens = await Server.getCharacterTokens( $currentCharacter );
        $currentCharacter.temp.tokens = tokens
        $currentCharacter = $currentCharacter

        console.debug(`Selected character ${name} (ID: ${id})`)

        if(isPortrait)
            $sectionCharacters = false;

        $fetching = false;
    }

    function FavoriteCharacter(s : string){
        let i = $favoritesList.indexOf(s)
        if( i > -1 ){
            $favoritesList.splice(i, 1)
        }else{
            $favoritesList.push(s)
        }
        $favoritesList = $favoritesList.filter((fav) => $characterList.find((char) => char.temp.filepath == fav))
        window.localStorage.setItem("favorites", JSON.stringify($favoritesList))
    }
</script>


<div class="container" use:LazyLoad on:lazyload={() => loaded = true} class:blocked={lockinput}>
    <button class="main" on:click={() => SelectCharacter(filepath)}>
        <div class="avatar" style="background-image: url({loaded ? getImageURL(filepath) : ""})"/>
        {#if label}
            <div class="label" class:invisible={!loaded}>
                <div class="name normal">{character.data.name}</div>
                 <div class="sub">

                    {#if sort.startsWith("creation_date")}
                        {@const date = new Date(createdTime).toLocaleString()}
                        <p title={date}>{Format.relativeTime(createdTime, true)}</p>

                    {:else if sort.startsWith("recently_chatted")}
                        {@const date = new Date(chatLatest).toLocaleString()}
                        {#if chatLatest > 0}
                            <p title={date}>{Format.relativeTime(chatLatest, true)}</p>
                        {:else}
                            <p>Never</p>
                        {/if}

                    {:else if sort.startsWith("chat_count")}
                        {chatCount} {labelCount}
                    {:else}
                        {getFilename(filepath)}
                    {/if}

                </div>
            </div>
        {/if}
        <button class="favorite special" class:checked={favorited} title={favorited ? "Remove from favorites" : "Add to favorites"} on:click|stopPropagation={() => FavoriteCharacter(filepath)}>{@html SVG.star}</button>
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
        background-color: #00000040;
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
        color: var( --default-font-color );
    }

    .sub{
        /* direction: rtl; */
        overflow: hidden;
        text-overflow: ellipsis;

        padding: 0px;
        font-size: 80%;
        color: gray;
    }

    .main:hover .sub{
        color: var( --accent-color-light );
    }

    :global(body.light) .main:hover .sub{
        color: var( --accent-color-normal );
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