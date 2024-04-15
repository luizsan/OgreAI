<script lang="ts">
    import { characterList, favoritesList, creating, editing, fetching, sectionCharacters, currentProfile } from "../State";
    import Character from './Character.svelte'
    import Search from '../components/Search.svelte'
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "../modules/Server.svelte";
    import { clickOutside } from "../utils/ClickOutside";
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";

    let searchResults : Array<ICharacter> = $characterList || []
    let currentSortMode : string = window.localStorage.getItem("sort_mode")

    let self : HTMLElement;
    let exclusion : Array<HTMLElement>; // "click outside" excluded elements

    let pinned = false;
    let separator : HTMLElement; // threshold to show "Back to top" button
    let scrolled = 0; // amount of pixels scrolled so far

    const sortModes = {
        creation_date_new: {
            label: "Creation date (newest)",
            sort: (list : Array<ICharacter>) => {
                list = list.sort((a,b) => b.metadata.created - a.metadata.created)
            }
        },
        creation_date_old: {
            label: "Creation date (oldest)",
            sort: (list : Array<ICharacter>) => {
                list = list.sort((a,b) => a.metadata.created - b.metadata.created)
            }
        },
        alphabetical_ascending: {
            label: "Alphabetical (ascending)",
            sort: (list : Array<ICharacter>) => {
                list = list.sort(sortByName)
            }
        },
        alphabetical_descending: {
            label: "Alphabetical (descending)",
            sort: (list : Array<ICharacter>) => {
                list = list.sort(sortByName)
                list.reverse()
            }
        }
    }

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
            $editing.temp.filepath = "./img/bot_default.png"
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
            list.sort(sortModes[currentSortMode].sort(list))
        }
        list = getFavoritesFirst(list)
        return list
    }

    function getFavoritesFirst(list : Array<ICharacter>){
        let a = [] // fav
        let b = [] // non-fav

        list.forEach((char) => {
            if($favoritesList.find((item) => item == char.temp.filepath.replaceAll("../user/characters/", ""))){
                a.push(char)
            }else{
                b.push(char)
            }
        })

        return a.concat(b)
    }

    function changeSort(){
        window.localStorage.setItem("sort_mode", currentSortMode)
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
                <button class="component normal wide" title="Reload" on:click={Server.getCharacterList}>{@html SVG.refresh}Reload</button>
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
        gap: 16px;
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