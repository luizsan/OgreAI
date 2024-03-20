<script lang="ts">
    import { characterList, favoritesList, creating, editing, fetching, sectionCharacters, currentProfile } from "../State";
    import Character from './Character.svelte'
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "../modules/Server.svelte";
    import { clickOutside } from "../utils/ClickOutside";
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";

    let searchField : HTMLInputElement;
    let searchResults : Array<ICharacter> = $characterList;
    let sortField : HTMLSelectElement;
    let sortMode : number = parseInt( window.localStorage.getItem("sort_mode"))
    let exclusion : Array<HTMLElement>;

    let mainElement : HTMLElement;
    let separatorElement : HTMLElement;
    
    let pinned = false;
    let scrolled = 0;

    $: {
        if( $characterList || $favoritesList ){
            searchResults = UpdateList()
        }
    }

    onMount(() => {
        sortField.selectedIndex = sortMode;
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

    function sortByCreateDate(a : ICharacter, b : ICharacter){
        return b.metadata.created - a.metadata.created
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

    function UpdateList(){
        // search filter
        if( !searchField || !searchField.value ){
            searchResults = [...$characterList];
        }else{
            searchResults = [...$characterList].filter(character => {
                return character.data.name.toLowerCase().indexOf(searchField.value.toLowerCase()) > -1;
            })
        }

        // sort
        if( sortMode === undefined || sortMode === null ){
            sortMode = 0;
        }

        if( sortField ){
            sortMode = sortField.selectedIndex;
        }

        switch(sortMode){
            case 0: 
                searchResults = searchResults.sort(sortByCreateDate); 
                break;

            case 1: 
                searchResults = searchResults.sort(sortByCreateDate); 
                searchResults = searchResults.reverse();
                break;

            case 2: 
                searchResults = searchResults.sort(sortByName);    
                break;

            case 3: 
                searchResults = searchResults.sort(sortByName);    
                searchResults = searchResults.reverse();
                break;

            default: 
                break;
        }

        window.localStorage.setItem("sort_mode", sortMode.toString() )

        // favorites first
        let a = searchResults.filter(item => $favoritesList.indexOf(item.temp.filepath.replaceAll("../user/characters/", "")) > -1)
        let b = searchResults.filter(item => $favoritesList.indexOf(item.temp.filepath.replaceAll("../user/characters/", "")) < 0)
        searchResults = [...a, ...b]
        
        return searchResults
    }

    function ClearSearch(){
        if(searchField){
            searchField.value = "";
            UpdateList();
        }
    }

    function RefreshScroll(){
        scrolled = mainElement ? mainElement.scrollTop : -1; 
    }

    function BackToTop(){
        if( !mainElement ){
            return
        }
        mainElement.scrollTo({top: 0, behavior: "smooth"})
    }

</script>


<div class="main" class:active={$sectionCharacters} use:clickOutside={exclusion} on:outclick={Close}>

    <div class="container" bind:this={mainElement} on:scroll={RefreshScroll}>
        <div class="section horizontal" style="justify-content: end">
            <button class="pin {pinned ? "info" : "unpin"}" on:click={togglePin}>{@html SVG.pin}</button>
        </div>

        <div class="section horizontal">
            <button class="component normal wide" title="New character" on:click={NewCharacter}>{@html SVG.add}New character</button>
            <!-- <button class="system">{@html SVG.download}</button> -->
            <button class="component normal wide" title="Reload characters" on:click={Server.getCharacterList}>{@html SVG.refresh}Reload list</button>
        </div>
    
        <div class="section select">
            <label for="sort" class="deselect">Sort order</label>
            <select name="sort" class="component" on:change={UpdateList} bind:this={sortField}>
                <option>Creation date (newest)</option>
                <option>Creation date (oldest)</option>
                <option>Alphabetical (ascending)</option>
                <option>Alphabetical (descending)</option>
            </select>
            <div class="icon">{@html SVG.sort}</div>
        </div>
    
        <div class="search">
            <input name="search" type="text" class="component" autocomplete="off" placeholder="Search characters..." bind:this={searchField} on:input={UpdateList}>
            <div class="icon">{@html SVG.search}</div>
        </div>

        {#if searchField && searchField.value}
            <button class="normal cancel" on:click={ClearSearch}>{@html SVG.close} Clear search results</button>
        {/if}

        <div class="separator" bind:this={separatorElement}/>

        {#if searchResults && searchResults.length > 0}
            {#each searchResults as char, i}
                <Character id={i} character={char} label={true} />
            {/each}
        {:else}
            <p class="unavailable deselect">No characters available</p>
        {/if}
    </div>

    {#if scrolled > separatorElement?.offsetTop}
        <button class="component normal top" transition:fly={{duration: 250, y: -16, opacity: 0}} on:click={BackToTop}>Back to top</button>
    {/if}

</div>


<style>
    div{
        box-sizing: border-box;
    }

    input[type="text"]{
        width: 100%;
    }
    
    .main{
        --scrollbar-bg: hsl(0, 0%, 15%);

        background: hsl(210, 3%, 15%);
        /* border-right: 1px solid hsl(0, 0%, 33%); */
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        top: var( --header-size );
        left: 0px;

        position: fixed;
        width: var( --side-width );
        max-width: 100%;

        /* box-shadow: 4px 0px 4px 0px #00000040; */

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

    .separator{
        min-height: 8px;
    }

    .active{
        translate: 0 0 0;
    }

    .component{
        flex-direction: column;
        justify-content: center;
        font-size: 80%;
    }

    .component :global(svg){
        width: 24px;
        height: 24px;
    }

    .select, .search{
        position: relative;
        top: 0px;
    }
    
    .select select, .search input[type="text"]{
        padding-left: 32px;
    }

    .icon{
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        bottom: 0px;
        left: 0px;
        width: 40px;
        height: 32px;
        color: gray;
    }

    .cancel{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 8px;
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

    .select{
        display: flex;
        flex-direction: column;
    }

    .select label{
        font-size: 80%;
        font-weight: bolder;
        color: gray;
    }

    .unavailable{
        font-size: 90%;
        color: gray;
        font-style: italic;
        text-align: center;
        opacity: 0.5;
    }

    .top{
        position: fixed;
        top: 32px;
        left: 50%;
        translate: -50% 0;
        display: flex;
        flex-direction: row;
        gap: 8px;
        box-shadow: 0px 5px 20px 15px hsla(210, 3%, 15%, 1);
    }

    .top:after{
        content: "▲";
    }

</style>