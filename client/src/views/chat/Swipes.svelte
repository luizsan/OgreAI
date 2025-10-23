<script lang="ts">
    import { tick } from "svelte";

    import type {
        ICandidate,
    } from "@shared/types";

    import {
        swipes,
        busy,
        generating,
        currentProfile,
        currentCharacter,
        currentChat,
    } from "@/State";

    import Search from "@/components/Search.svelte";
    import Content from "@/views/chat/Content.svelte";
    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte";
    import { fade, fly, scale } from "svelte/transition";

    let searchTerm : string = ""
    let searchResults : Array<ICandidate> = $swipes?.candidates || []

    $: lockinput = $busy || $generating
    $: if( $swipes ){
        initialize()
    }

    async function initialize(){
        await tick()
        const searchBar = document.querySelector("#swipe_viewer .search")
        const currentSwipe = document.getElementById("swipe_" + $swipes.index)
        if( !document.body.classList.contains("portrait") && searchBar ){
            (searchBar as HTMLInputElement).focus()
        }
        currentSwipe?.scrollIntoView({ behavior: "instant", block: "start" })
    }

    function searchCondition(candidate : any, search : string){
        search = search.toLowerCase()
        return candidate.text.toLowerCase().includes(search)
    }

    async function selectSwipe(index : number){
        const last = $currentChat.messages.at(-1) == $swipes
        await Server.swipeMessage($swipes, index)
        closeSwipeView()
        if( last ){
            document.dispatchEvent(new CustomEvent("autoscroll"))
        }
    }

    function closeSwipeView(){
        $swipes = null
    }

</script>

{#if !!$swipes}
<div id="swipe_viewer" class="main" inert={lockinput} transition:scale={{duration:250, start: 0.9, opacity: 0}}>
    <div class="top">
        <Search
            bind:search={searchTerm}
            bind:results={searchResults}
            elements={$swipes.candidates}
            condition={searchCondition}
            placeholder="Search swipes..."
        />
        <div class="results">
            Showing ( {searchResults.length} / {$swipes.candidates.length} ) swipes
        </div>
    </div>
    <div class="middle">
        {#each searchResults as candidate, i}
        {@const index = $swipes.candidates.findIndex(c => c === candidate)}

            <div class="candidate" id="swipe_{index}">
                <button class="select normal" title="Select swipe" on:click={async () => await selectSwipe(index)}>{@html SVG.arrow}</button>
                <div class="content">
                    <h2># {index + 1}</h2>
                    <Content
                        reasoning={candidate.reasoning}
                        content={candidate.text.trim()}
                        user={$currentProfile.name}
                        bot={$currentCharacter.data.name}
                        chat={$currentChat}
                    />
                </div>
            </div>

            {#if i < searchResults.length - 1}
                <hr class="component"/>
            {/if}

        {/each}
    </div>
    <div class="bottom center">
        <button class="component" on:click={closeSwipeView}>Back</button>
    </div>
</div>
{/if}

<style>
    .main{
        top: 24px;
        bottom: 48px;
        left: 50%;
        transform: translateX(-50%);
        padding: 0px;
        margin: 0px;
        position: absolute;
        overflow: hidden;
        --scrollbar-bg: var( --sub-bg-color );
        background: var( --sub-bg-color );
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        border: 1px solid hsla(0, 0%, 50%, 0.5);
        box-shadow: 2px 4px 20px 0px #00000040;
        width: calc( 100% - 64px );
        max-width: calc( var( --chat-width) - 64px);
        z-index: 5;
    }

    .main[inert]{
        filter: brightness(0.8);
        cursor: wait;
    }

    h2{
        margin: 0px;
    }

    .top{
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding-bottom: 12px;
    }

    .results{
        font-size: 75%;
        font-weight: bold;
        color: gray;
    }

    .middle{
        height: 100%;
        flex-grow: 1;
        overflow-x: hidden;
        overflow-y: scroll;
        background: var( --component-bg-normal );

        display: flex;
        flex-direction: column;
    }

    .candidate{
        display: flex;
        flex-direction: row;
        gap: 8px;
        font-size: 1em;
        align-items: flex-start;
    }

    .content{
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .select{
        height: 100%;
        min-width: 56px;
    }

    .select :global(svg){
        width: 32px;
        height: 32px;
    }

    .select:hover{
        background: var( --component-bg-hover );
    }

    .bottom{
        padding: 20px;
        width: 100%;
    }
</style>