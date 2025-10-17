<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";

    import {
        data,
        index,
        message,
        type ContextData
    } from "@/modules/Actions";

    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte"
    import { editList } from "@/State";

    let self: HTMLElement;
    let x: number = 0;
    let y: number = 0;
    let offset: number = 6;
    let gap: number = 12;

    onMount(() => {
        if( $data ){
            refreshPosition($data)
        }
        return () => { self = undefined }
    })

    $: if( self ){
        refreshPosition($data);
    }

    function refreshPosition(data: ContextData){
        if( !self )
            return;
        if( !data?.opener )
            return;
        const opener_rect: DOMRect = data.opener.getBoundingClientRect();
        if( opener_rect.right > window.innerWidth * 0.5 ){
            x = opener_rect.right - self.offsetWidth + offset;
        }else{
            x = opener_rect.left - offset;
        }
        if( opener_rect.bottom > window.innerHeight * 0.5 ){
            y = opener_rect.top - self.offsetHeight - gap;
        }else{
            y = opener_rect.bottom + gap;
        }
    }

    const deleteCandidate = () => { Server.deleteCandidate($index, $message.index) }
    const branchChat = () => { Server.branchChat($index) }
    const copyMessage = () => { Server.copyMessage($index, $message.index) }
    const editMessage = () => { Server.startMessageEdit($message) }
</script>


{#if !!$data}
<div class="main" transition:fly={{duration:250, y: 10}}>
    <div bind:this={self} class="actions" style="left: {x}px; top: {y}px">
        {#if $index > 0}
            <button class="component borderless star disabled" disabled><span>Add To Favorites</span> {@html SVG.star}</button>
        {/if}

        <button class="component borderless list normal disabled" disabled title="List swipes"><span>List Swipes</span> {@html SVG.menu}</button>
        <hr class="component">
        <button class="component borderless copy normal" title="Copy text" class:disabled={!navigator.clipboard} disabled={!navigator.clipboard} on:click={copyMessage}><span>Copy Text</span>{@html SVG.copy}</button>
        <button class="component borderless edit normal" title="Edit message" on:click={editMessage}><span>Edit Message</span> {@html SVG.edit}</button>

        {#if $index > 0}
            <button class="component borderless branch normal" title="Branch from this message" on:click={branchChat}><span>Branch Chat</span> {@html SVG.split}</button>
            <hr class="component">
            <button class="component borderless delete danger" title="Delete message" on:click={deleteCandidate}><span>Delete Message</span> {@html SVG.trashcan}</button>
            <button class="component borderless id normal hidden" title="Copy message ID" on:click={() => {}}><span>Copy Message ID</span> {@html SVG.settings}</button>
        {/if}
    </div>
</div>
{/if}


<style>
    .main{
        position: fixed;
        width: 100%;
        height: 100%;
        z-index: 40;
        cursor: default;
        display: flex;
        align-items: center;
        pointer-events: none;
    }

    .actions{
        top: 80px;
        left: 40px;
        position: fixed;
        place-items: flex-start;
        display: flex;
        flex-direction: column;
        background: var( --component-bg-normal );
        height: fit-content;
        padding: 4px;
        border-radius: 8px;
        border: 1px solid hsla(0, 0%, 50%, 0.2);
        z-index: 40;
        pointer-events: all;
        box-shadow: 0px 8px 16px 0px #00000040;
    }

    .actions button{
        width: 100%;
        display: flex;
        align-content: center;
        padding: 8px 12px;
    }

    .actions button span{
        width: 100%;
        margin-right: 48px;
        text-align: left;
        place-self: center;
    }

    .actions button :global(svg){
        min-width: 16px;
        height: 100%;
        align-self: flex-end;
    }

    .actions hr{
        margin: 4px 12px;
        width: calc(100% - 24px);
    }
</style>