<script lang="ts">
    import type { ICharacter } from "@shared/types";
    import { characterList, favoritesList, creating, editing, fetching, sectionCharacters, currentProfile, currentSettingsMain, localServer } from "../State";
    import Character from './Character.svelte'
    import Search from '../components/Search.svelte'
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "../modules/Server.svelte";
    import { clickOutside } from "../utils/ClickOutside";
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";

    const path_prefix : string = "../user/characters/";
    const sortModes = {
        creation_date_new: {
            label: "Creation date (newest)",
            order: (list : Array<ICharacter>) => {
                list.sort((a,b) => b.metadata.created - a.metadata.created)
                return list
            }
        },
        creation_date_old: {
            label: "Creation date (oldest)",
            order: (list : Array<ICharacter>) => {
                list.sort((a,b) => a.metadata.created - b.metadata.created)
                return list
            }
        },
        alphabetical_ascending: {
            label: "Alphabetical (ascending)",
            order: (list : Array<ICharacter>) => {
                list.sort(sortByName)
                return list
            }
        },
        alphabetical_descending: {
            label: "Alphabetical (descending)",
            order: (list : Array<ICharacter>) => {
                list.sort(sortByName)
                list.reverse()
                return list
            }
        },
        recently_chatted: {
            label: "Recently chatted",
            order: (list : Array<ICharacter>) => {
                let recent_list : Array<ICharacter> = $currentSettingsMain.recents.map((path : string) => $characterList.find((char : ICharacter) => {
                    return char.temp.filepath == path;
                }));
                recent_list = recent_list.filter((item : ICharacter) => item && list.includes(item))
                recent_list.reverse()
                return recent_list
            }
        }
    }

    let searchResults : Array<ICharacter> = Array.from($characterList) || []
    let currentSortMode : string = window.localStorage.getItem("sort_mode") || Object.keys(sortModes)[0]

    let self : HTMLElement;
    let exclusion : Array<HTMLElement>; // "click outside" excluded elements

    let pinned = false;
    let separator : HTMLElement; // threshold to show "Back to top" button
    let scrolled = 0; // amount of pixels scrolled so far

    $: {
        // reactively check for changes in $characterList and $favoritesList
        // update the search results
        if( $characterList || $favoritesList ){
            searchResults = orderResults(searchResults)
        }
    }

    $: size = searchResults.length < $characterList.length ? `${searchResults.length} / ${$characterList.length}` : $characterList.length;

    onMount(() => {
        exclusion = [document.getElementById("header")]
    })

    async function NewCharacter(){
        $fetching = true;
        await Server.request( "/new_character" ).then(data => {
            $creating = true;
            $editing = data;
            $editing.data.name = "New character"
            $editing.data.creator = $currentProfile.name ?? ""
            $editing.data.character_version = "main"
            $editing.temp.tokens = {}
            $editing.temp.filepath = ""
            $editing.temp.avatar = localServer + "/img/bot_default.png"
        });

        let tokens = await Server.getCharacterTokens($editing)
        $editing.temp.tokens = tokens;
        $fetching = false;
    }

    function Close(){
        if( pinned || $editing ){
            return
        }
        $sectionCharacters = false;
    }

    async function reloadCharacterList(){
        await Server.getCharacterList()
        searchResults = []
        searchResults = $characterList

    }

    function sortByName(a : ICharacter, b : ICharacter){
        let nameA = a.data.name.toLowerCase()
        let nameB = b.data.name.toLowerCase()
        if( nameA < nameB ){
            return -1
        }else if( nameA > nameB ){
            return 1
        }else{
            return 0
        }
    }

    function togglePin(){
        pinned = !pinned;
    }

    function orderResults(list : Array<ICharacter>){
        if(Object.keys(sortModes).includes(currentSortMode)){
            list = sortModes[currentSortMode].order(list)
        }
        list = getFavoritesFirst(list)
        console.log(list)
        return list
    }

    function getFavoritesFirst(list : Array<ICharacter>){
        let a = [] // fav
        let b = [] // non-fav

        list.forEach((char) => {
            if($favoritesList.find((item) => item == char.temp.filepath)){
                a.push(char)
            }else{
                b.push(char)
            }
        })

        return a.concat(b)
    }

    function changeSort(){
        window.localStorage.setItem("sort_mode", currentSortMode)
        searchResults = Array.from($characterList)
        searchResults = orderResults(searchResults)
    }

    function refreshScroll(){
        scrolled = self ? self.scrollTop : -1;
    }

    function backToTop(){
        if( !self ){
            return
        }
        self.scrollTo({top: 0, behavior: "smooth"})
    }

</script>


<div class="main" class:active={$sectionCharacters} use:clickOutside={exclusion} on:outclick={Close}>

    <div class="container" bind:this={self} on:scroll={refreshScroll}>

        <div class="section horizontal" style="justify-content: end">
            <button class="pin {pinned ? "info" : "unpin"}" on:click={togglePin}>{@html SVG.pin}</button>
        </div>

        <div class="section">
            <button class="component normal wide confirm" title="Create" on:click={NewCharacter}>{@html SVG.plus}Create Character</button>

            <div class="section horizontal">
                <button class="component normal wide disabled" title="Import">{@html SVG.download}Import</button>
                <button class="component normal wide" title="Reload" on:click={reloadCharacterList}>{@html SVG.refresh}Reload</button>
            </div>
        </div>

        <div/>

        <div class="section">
            <div class="label explanation">Character List — {size}</div>
            <div class="section horizontal wide select">
                <select class="component wide" bind:value={currentSortMode} on:change={changeSort}>
                    {#each Object.keys(sortModes) as key}
                    <option value={key}>{sortModes[key].label}</option>
                    {/each}
                </select>
                <div class="icon disabled">{@html SVG.sort}</div>

            </div>

            <Search
                elements={$characterList}
                bind:results={searchResults}
                placeholder="Search characters..."
                item={(char) => char.data.name}
                condition={(obj, arg) => obj.toLowerCase().includes(arg.toLowerCase())}
                after={(list) => orderResults(list)}
            />
        </div>

        <div class="separator" bind:this={separator}/>

        <div class="section characters">
            {#if searchResults && searchResults.length > 0}
                {#each searchResults as char, i}
                    <Character id={i} character={char} label={true} />
                {/each}
            {:else}
                <p class="unavailable deselect">No characters available</p>
            {/if}
        </div>
    </div>

    {#if scrolled > separator?.offsetTop}
        <button class="component normal back" transition:fly={{duration: 250, y: -16, opacity: 0}} on:click={backToTop}>Back to top</button>
    {/if}

</div>


<style>
    div{
        box-sizing: border-box;
    }

    .main{
        --scrollbar-bg: hsl(0, 0%, 15%);

        background: hsl(210, 3%, 15%);
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        top: var( --header-size );
        left: 0px;

        position: fixed;
        width: var( --side-width );
        max-width: 100%;

        transition: translate 0.15s ease;
        translate: -100% 0 0;
    }

    .container{
        position: absolute;
        width: 100%;
        overflow-y: scroll;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
    }

    .active{
        translate: 0 0 0;
    }

    .icon{
        position: absolute;
        display: flex;
        place-items: center;
        top: 0px;
        left: 12px;
        width: 16px;
        height: 100%;
        color: gray;
    }

    .unpin{ color: hsl(0, 0%, 75%); }
    .unpin:hover{ color: hsl(0, 0%, 100%); }
    .unpin:active{ color: hsla(0, 0%, 66%, 0.5); }

    .pin{
        width: 24px;
        height: 24px;
        padding: 0px;
    }

    .pin :global(svg){
        width: 20px;
        height: 20px;
    }

    .label{
        font-weight: bold;
        font-size: 0.75em;
    }

    .select{
        position: relative;
    }

    select{
        position: relative;
        padding-left: 32px;
    }

    .unavailable{
        font-size: 90%;
        color: gray;
        font-style: italic;
        text-align: center;
        opacity: 0.5;
    }

    .back{
        position: fixed;
        top: 32px;
        left: 50%;
        translate: -50% 0;
        display: flex;
        flex-direction: row;
        gap: 8px;
        box-shadow: 0px 5px 20px 15px hsla(210, 3%, 15%, 1);
    }

    .back:after{
        content: "▲";
    }

    .characters{
        gap: 0px;
    }

</style>