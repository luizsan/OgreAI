<script lang="ts">
    import { characterList, favoritesList, creating, editing, fetching, sectionCharacters } from "../State";
    import Character from './Character.svelte'
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from "./Server.svelte";
    import { clickOutside } from "../utils/ClickOutside";

    let searchField : HTMLInputElement;
    let searchResults : Array<ICharacter> = $characterList;
    $: {
        if( $favoritesList ){
            searchResults = UpdateList()
        }
    }

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

    function UpdateList(){
        if( !searchField || !searchField.value ){
            searchResults = [...$characterList];
        }else{
            searchResults = [...$characterList].filter(character => {
                return character.name.toLowerCase().indexOf(searchField.value.toLowerCase()) > -1;
            })
        }

        searchResults = [
            ...searchResults.filter(item => $favoritesList.indexOf(item.metadata.filepath.replaceAll("../user/characters/", "")) > -1),
            ...searchResults.filter(item => $favoritesList.indexOf(item.metadata.filepath.replaceAll("../user/characters/", "")) < 0)
        ]
        
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

    <div>
        <button class="component wide" title="New character" on:click={NewCharacter}>{@html SVG.add}New character</button>
        <!-- <button class="system">{@html SVG.download}</button> -->
        <button class="component wide" title="Reload characters" on:click={Server.getCharacterList}>{@html SVG.refresh}Reload list</button>
    </div>

    <input name="search" type="text" class="search component" autocomplete="off" placeholder="Search characters..." bind:this={searchField} on:input={UpdateList}>
    {#if searchField && searchField.value}
    <button class="normal cancel" on:click={ClearSearch}>{@html SVG.close} Clear search results</button>
    {/if}
    
    <hr/>

    {#each searchResults as char, i}
        <Character id={i} character={char} label={true} />
    {/each}
</div>


<style>
    *::-webkit-scrollbar{
        width: 0px;
    }

    div{
        box-sizing: border-box;
    }

    input[type="text"]{
        width: 100%;
    }

    .main{
        background: hsl(0, 0%, 15%);
        border-right: 1px solid hsl(0, 0%, 33%);
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        display: flex;
        flex-direction: column;
        gap: 12px;
        top: var( --header-size );
        left: 0px;
        bottom: 0px;
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 16px;
        position: fixed;
        width: var( --side-width );
        max-width: 100%;

        transition: translate 0.15s ease;
        translate: -100% 0 0;
    }

    hr{
        width: 100%;
        opacity: 0.25;
    }

    .active{
        translate: 0 0 0;
    }

    .component{
        justify-content: center;
    }

    .component :global(svg){
        width: 20px;
        height: 20px;
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

</style>