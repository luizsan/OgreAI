<script lang="ts">
    import type { ICharacter } from "@shared/types";
    import {
        characterList,
        favoritesList,
        creating,
        editing,
        fetching,
        sectionCharacters,
        currentProfile,
        characterSearch,
        localServer,
        generating,
        busy
    } from "@/State";

    import Character from './Character.svelte'
    import Search from '@/components/Search.svelte'
    import Sidebar from "@/components/Sidebar.svelte";

    import * as Prefs from "@/modules/Preferences";
    import * as SVG from "@/svg/Common.svelte";
    import * as Server from "@/Server";
    import { fly } from "svelte/transition";

    const sortModes = {
        creation_date: {
            label: "Creation date",
            order: (list : Array<ICharacter>) => {
                list.sort((a,b) => b.metadata.created - a.metadata.created)
                if( isReverse ){
                    list.reverse()
                }
                return list
            }
        },
        alphabetical: {
            label: "Alphabetical",
            order: (list : Array<ICharacter>) => {
                list.sort(sortByName)
                if( isReverse ){
                    list.reverse()
                }
                return list
            }
        },
        recently_chatted: {
            label: "Recently chatted",
            order: (list : Array<ICharacter>) => {
                // let recent_list : Array<ICharacter> = list.filter((char: ICharacter) => char.temp.chat_latest > 0)
                list = list.sort((a,b) => b.temp.chat_latest - a.temp.chat_latest)
                if( isReverse ){
                    list.reverse()
                }
                return list
            }
        },
        chat_count: {
            label: "Chat count",
            order: (list : Array<ICharacter>) => {
                // let count_list: Array<ICharacter> = list.filter((char: ICharacter) => char.temp.chat_count > 0)
                list.sort((a,b) => b.temp.chat_count - a.temp.chat_count)
                if( isReverse ){
                    list.reverse()
                }
                return list
            }
        }
    }

    let searchResults : Array<ICharacter> = Array.from($characterList) || []
    let currentSortMode : string = Prefs.getPreference("sort_mode", Object.keys(sortModes).at(0))
    let isReverse : boolean = (Prefs.getPreference("order_mode")) === "true"

    let self : HTMLElement;
    let separator : HTMLElement; // threshold to show "Back to top" button
    let scrolled = 0; // amount of pixels scrolled so far

    $: lockinput = $generating || $busy

    $: {
        // reactively check for changes in $characterList and $favoritesList
        // update the search results
        if( $characterList || $favoritesList ){
            searchResults = orderResults(searchResults)
        }

        if( !$sectionCharacters ){
            scrolled = 0
        }
    }

    $: size = searchResults.length < $characterList.length ? `${searchResults.length} / ${$characterList.length}` : $characterList.length;

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
        if( $editing ){
            return
        }
        $sectionCharacters = false;
    }

    async function reloadCharacterList(){
        $fetching = true
        await Server.getCharacterList()
        searchResults = orderResults(searchResults)
        $fetching = false
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

    function orderResults(list : Array<ICharacter>){
        if(Object.keys(sortModes).includes(currentSortMode)){
            list = sortModes[currentSortMode].order(list)
        }
        list = getFavoritesFirst(list)
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
        Prefs.setPreference("sort_mode", currentSortMode)
        searchResults = Array.from($characterList)
        searchResults = orderResults(searchResults)
        $characterSearch = $characterSearch
    }

    function changeOrder(){
        isReverse = !isReverse
        Prefs.setPreference("order_mode", String(isReverse))
        searchResults = Array.from($characterList)
        searchResults = orderResults(searchResults)
        $characterSearch = $characterSearch
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

    function searchCondition(char : ICharacter, search : string){
        search = search.toLowerCase()

        if(search.startsWith("#")){
            search = search.slice(1)
            return char.data.tags.length > 0 && char.data.tags.some((tag) => {
               return tag.toLowerCase().includes(search)
            })
        }

        if(search.startsWith("@")){
            search = search.slice(1)
            const creator = char.data.creator.toLowerCase()
            return !!(creator) && creator.includes(search)
        }

        return char.data.name.toLowerCase().includes(search)
    }

</script>


<Sidebar width={460} enabled={$sectionCharacters}>

<div class="main anchor">

    <div class="container" bind:this={self} on:scroll={refreshScroll}>

        <div class="section top" class:blocked={lockinput}>
            <button class="component normal wide confirm" title="Create" on:click={NewCharacter}>{@html SVG.add}Create Character</button>

            <div class="section horizontal">
                <button class="component normal wide blocked" title="Import">{@html SVG.download}Import</button>
                <button class="component normal wide" title="Reload" on:click={reloadCharacterList}>{@html SVG.refresh}Reload</button>
            </div>
        </div>

        <div/>

        <div class="section">
            <div class="label explanation">Character List — {size}</div>
            <div class="anchor section horizontal wide">
                <select class="component wide" bind:value={currentSortMode} on:change={changeSort}>
                    {#each Object.keys(sortModes) as key}
                    <option value={key}>{sortModes[key].label}</option>
                    {/each}
                </select>

                <div class="icon disabled">{@html SVG.sort}</div>

                <button class="component normal deselect compact" on:click={changeOrder}>
                {#if isReverse}
                    {@html SVG.ascending}
                {:else}
                    {@html SVG.descending}
                {/if}
                </button>
            </div>

            <Search
                bind:search={$characterSearch}
                elements={$characterList}
                bind:results={searchResults}
                placeholder="Search characters..."
                condition={searchCondition}
                after={(list) => orderResults(list)}
            />
        </div>

        <div class="separator" bind:this={separator}/>

        <div class="section characters">
            {#if searchResults && searchResults.length > 0}
                {#each searchResults as char, i}
                    <Character id={i} character={char} label={true} sort={currentSortMode}/>
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
</Sidebar>


<style>
    div{
        box-sizing: border-box;
    }

    .main{
        background: var( --background-neutral-400 );
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        inset: 0px;
        overflow-y: auto;
        height: 100%;
        position: relative;
        max-width: 100%;

        border-right: 1px solid var( --background-neutral-500 );
    }

    .container{
        position: relative;
        width: 100%;
        overflow-y: scroll;
        padding: 20px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
    }

    .label{
        font-weight: bold;
        font-size: 0.75em;
    }

    .unavailable{
        font-size: 90%;
        color: gray;
        font-style: italic;
        text-align: center;
        opacity: 0.5;
    }

    .back{
        position: absolute;
        top: 32px;
        left: 50%;
        translate: -50% 0;
        display: flex;
        flex-direction: row;
        gap: 8px;
        box-shadow: 0px 5px 30px 30px var( --background-neutral-400 );
    }

    .back:after{
        content: "▲";
    }

    .characters{
        gap: 0px;
    }

</style>