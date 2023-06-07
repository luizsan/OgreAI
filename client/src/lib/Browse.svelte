<script lang="ts">
    import { characterList, favoritesList, creating, editing, fetching, sectionCharacters } from "../State";
    import Character from './Character.svelte'
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "./Server.svelte";
    import { clickOutside } from "../utils/ClickOutside";
    import { onMount } from "svelte";

    let searchField : HTMLInputElement;
    let searchResults : Array<ICharacter> = $characterList;
    let sortField : HTMLSelectElement;
    let sortMode : number = parseInt( window.localStorage.getItem("sort_mode"))

    $: {
        if( $characterList || $favoritesList ){
            searchResults = UpdateList()
        }
    }

    onMount(() => {
        sortField.selectedIndex = sortMode;
    })
    
    async function NewCharacter(){
        $fetching = true;
        await Server.request( "/new_character" ).then(data => {
            $creating = true;
            $editing = data;
            $editing.name = "New character"
            $editing.metadata.tokens = {}
            $editing.metadata.filepath = "./img/bot_default.png"
        });

        let tokens = await Server.getCharacterTokens($editing)
        $editing.metadata.tokens = tokens;
        $fetching = false;
    }

    function Close(){
        if( $editing ){
            return
        }
        $sectionCharacters = false;
    }

    function sortByCreateDate(a : ICharacter, b : ICharacter){
        return b.create_date - a.create_date
    }

    function sortByName(a : ICharacter, b : ICharacter){
        let nameA = a.name.toLowerCase()
        let nameB = b.name.toLowerCase()
        if( nameA < nameB ){ 
            return -1 
        }else if( nameA > nameB ){ 
            return 1 
        }else{ 
            return 0
        } 
    }

    function UpdateList(){
        // search filter
        if( !searchField || !searchField.value ){
            searchResults = [...$characterList];
        }else{
            searchResults = [...$characterList].filter(character => {
                return character.name.toLowerCase().indexOf(searchField.value.toLowerCase()) > -1;
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
        let a = searchResults.filter(item => $favoritesList.indexOf(item.metadata.filepath.replaceAll("../user/characters/", "")) > -1)
        let b = searchResults.filter(item => $favoritesList.indexOf(item.metadata.filepath.replaceAll("../user/characters/", "")) < 0)
        searchResults = [...a, ...b]
        
        return searchResults
    }

    function ClearSearch(){
        if(searchField){
            searchField.value = "";
            UpdateList();
        }
    }
</script>


<div class="main" class:active={$sectionCharacters} use:clickOutside on:outclick={Close}>
        <div class="section horizontal">
            <button class="component wide" title="New character" on:click={NewCharacter}>{@html SVG.add}New character</button>
            <!-- <button class="system">{@html SVG.download}</button> -->
            <button class="component wide" title="Reload characters" on:click={Server.getCharacterList}>{@html SVG.refresh}Reload list</button>
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
    
        <div class="separator"/>

        {#each searchResults as char, i}
            <Character id={i} character={char} label={true} />
        {/each}

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

        background: hsl(0, 0%, 15%);
        border-right: 1px solid hsl(0, 0%, 33%);
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        display: flex;
        flex-direction: column;
        top: var( --header-size );
        left: 0px;
        bottom: 0px;

        position: fixed;
        width: var( --side-width );
        max-width: 100%;

        padding: 20px;
        gap: 12px;
        overflow-y: scroll;
        /* box-shadow: 4px 0px 4px 0px #00000040; */

        transition: translate 0.15s ease;
        translate: -100% 0 0;
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

    .icon :global(svg){
        width: 16px;
        height: 16px;
    }

    .cancel{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        gap: 8px;

    }

    .cancel :global(svg){
        width: 16px;
        height: 16px;
    }

    .select{
        display: flex;
        flex-direction: column;
        align-items: left;
    }

    .select label{
        font-size: 80%;
        font-weight: bolder;
        color: gray;
    }

</style>