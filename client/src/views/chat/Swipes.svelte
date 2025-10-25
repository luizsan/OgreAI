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
    import { scale } from "svelte/transition";

    let searchTerm : string = ""
    let searchResults : Array<ICandidate> = $swipes?.candidates || []
    let messageIndex : number = -1

    $: lockinput = $busy || $generating
    $: if( $swipes ){
        initialize()
    }

    async function initialize(){
        messageIndex = $currentChat.messages.findIndex(m => m.id === $swipes?.id)
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

    async function deleteSwipe(candidateIndex: number){
        await Server.deleteCandidate(messageIndex, candidateIndex)
        $swipes = $swipes;
    }

    async function branchSwipe(candidateIndex: number){
        await Server.branchChat(messageIndex, candidateIndex)
        closeSwipeView()
        document.dispatchEvent(new CustomEvent("autoscroll"))
    }

    async function selectSwipe(candidateIndex : number){
        const last = $currentChat.messages.at(-1) == $swipes
        await Server.swipeMessage($swipes, candidateIndex)
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
        {@const selected = index === $swipes.index}

            <div class="candidate" id="swipe_{index}">
                <div class="content">
                    <div class="header section horizontal">
                        <span class="index"># {index + 1}</span>
                        <div style="margin-left: auto"></div>
                        <button class="component danger small" title="Delete swipe"on:click={async () => await deleteSwipe(index)}>{@html SVG.trashcan}</button>
                        <button class="component normal small" title="Branch from swipe" on:click={async () => await branchSwipe(index)}>{@html SVG.split}</button>
                        {#if selected}
                            <button class="component confirm medium" on:click={closeSwipeView}>Selected<div style="transform: translateY(2px);">{@html SVG.confirm}</div></button>
                        {:else}
                            <button class="component normal medium" on:click={async () => await selectSwipe(index)}>Select Swipe<div style="transform: scaleX(-1) translateY(2px);">{@html SVG.arrow}</div></button>
                        {/if}
                    </div>

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
        gap: 16px;
        display: flex;
        flex-direction: column;
    }

    .candidate{
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 1em;
        align-items: flex-start;
    }

    .content{
        padding: 20px 32px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .bottom{
        padding: 20px;
        width: 100%;
    }

    .header .index{
        font-size: 2em;
        font-weight: 900;
        text-wrap: nowrap;
        align-self: center;
    }

    button.component{
        height: 32px;
    }

    button.component.small{
        padding: 6px 10px;
    }

    button.component.medium{
        padding: 6px 12px;
        width: 128px;
    }
</style>