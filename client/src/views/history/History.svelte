<script lang="ts">
    import { get } from "svelte/store";
    import { tick } from "svelte";

    import type {
        IChat
    } from "@shared/types";

    import {
        history,
        chatList
    } from "@/State";

    import Record from "@/views/history/Record.svelte";
    import Background from "@/views/main/Background.svelte";

    import * as Dialog from "@/modules/Dialog";
    import * as SVG from "@/svg/Common.svelte";
    import Search from "@/components/Search.svelte";

    let displayMode : string = window.localStorage.getItem("history_display") || "extended"
    let searchTerm : string = ""
    let searchResults : Array<IChat> = Array.from($chatList) || []

    $: if( $chatList ){
        searchResults = $chatList.filter((chat: IChat) => searchCondition(chat, searchTerm))
    }

    function setDisplayMode(mode: string){
        displayMode = mode
        window.localStorage.setItem("history_display", mode.toString())
    }

    function searchCondition(item : IChat, arg : string) : boolean{
        return item.title.toLowerCase().includes(arg.toLowerCase())
    }

    async function closeHistory(){
        $history = false;
        await tick()
        document.dispatchEvent(new CustomEvent("autoscroll"));
    }
</script>

<div class="container" inert={get(Dialog.data) !== null}>
    <Background/>

    <div class="main">
        <div class="top">
            <Search
                elements={$chatList}
                bind:search={searchTerm}
                bind:results={searchResults}
                condition={searchCondition}
                placeholder="Search chats..."
            />

            <select class="component" bind:value={displayMode} on:change={() => setDisplayMode(displayMode)}>
                <option value="list">List</option>
                <option value="simple">Simple</option>
                <option value="extended">Extended</option>
            </select>
        </div>

        {#if searchResults?.length > 0}
            <div class="history {displayMode}">
                {#each searchResults as chat}
                    <Record chat={chat} display={displayMode}/>
                {/each}
            </div>
        {:else}
            <div class="center">
                No chats available
            </div>
        {/if}

        <div class="bottom">
            <button class="component normal" title="Close" on:click={closeHistory}>Back</button>
        </div>
    </div>
</div>


<style>
    .container{
        --input-bg-normal: hsl(0, 0%, 33%);
        --input-border-normal: 1px solid hsla(0, 0%, 50%, 0.5);
        --input-outline-normal: 1px solid hsla(0, 0%, 10%, 0.5);
    }

    :global(body.light) .container{
        --input-bg-normal: hsl(0, 0%, 100%);
        --input-border-normal: 1px solid hsla(0, 0%, 75%, 0.5);
        --input-outline-normal: 1px solid hsla(0, 0%, 33%, 0.5);
    }

    .container{
        align-items: stretch;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        inset: 0px;
        min-width: 480px;
        width: 100%;
        background: var( --default-bg-color );
    }

    :global(body.portrait) .container{
        position:absolute;
    }

    .main{
        align-self: center;
        display: flex;
        flex-direction: column;
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0px;
        bottom: 0px;
        max-width: var( --chat-width );
    }

    .top{
        display: flex;
        position: relative;
        border-bottom: 1px solid #80808024;
        padding: 24px;
        gap: 16px;
    }

    .top select{
        min-width: 120px;
    }

    .history{
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        overflow-y: scroll;
        position: relative;
        gap: 8px;
        margin: 0px var(--chat-padding);
        padding: 8px 4px 8px 16px;
    }

    .bottom{
        min-height: 72px;
        bottom: 0px;
        width: 100%;
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        place-content: center;
        gap: 16px;
        border-top: 1px solid #80808024;
    }

    .bottom *{
        margin: 0px;
    }
</style>