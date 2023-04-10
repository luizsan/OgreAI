<script lang="ts">
    import { onMount } from "svelte"
    import { busy } from "./State";
    import { chat, menu, send } from "./utils/SVGCollection.svelte"
    import { AutoResizeTextArea } from "./utils/AutoResizeTextArea.svelte";
    import Message from './Message.svelte'
    import Loading from './Loading.svelte'

    let currentMessage : string = ""
    let messagesDiv : HTMLElement;

    function getAuthor(i : number){
        return (i % 2 == 0) ? "Bot" : "User"
    }

    onMount(() => {
        messagesDiv.scrollTo(0, messagesDiv.scrollHeight)
    });
</script>


<div class="chat" style="grid-template-rows: auto min-content">
    <div class="messages" bind:this={messagesDiv} on:load={()=> messagesDiv.scrollTo(0, messagesDiv.scrollHeight)}>
        {#each {length: 9} as _, i}
            <Message author={getAuthor(i)} id={i} is_bot={i % 2 == 0} avatar={"./img/bot_default.png"}/>
        {/each}
    </div>

    <div class="input">
        <button class="side options">{@html menu}</button>
        <textarea placeholder="Type a message..." bind:value={currentMessage} use:AutoResizeTextArea></textarea>
        {#if $busy}
            <Loading width={24} height={24}/>
        {:else}
            <button class="side send">{@html send}</button>
        {/if}
    </div>
</div>

<style>
    .chat{
        width: 100%;
        min-width: 320px;
        max-width: var( --chat-width );
        height: 100%;
        align-self: center;
        display: grid;
    }

    .messages{
        padding: 8px 0px;
        margin: 0px var(--chat-padding);
        margin-top: var(--header-size);
        overflow-x: hidden;
        overflow-y: scroll;
        display: block;
    }

    .input{
        position: relative;
        height: fit-content;
        padding: 0px;
        margin: 0px var(--chat-padding);
        margin-bottom: 32px;
        border-radius: 6px;
        border: 1.5px solid hsl(0, 0%, 40%);
        background: hsl(0, 0%, 30%);
        color: white;
        resize: none;
        box-shadow: 0px 8px 16px #18181880;
        display: grid;
        align-items: center;
        justify-items: center;
        grid-template-columns: 48px auto 48px;
        column-gap: 0px;
    }

    .side{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .side :global(svg){
        width: 24px;
        height: 24px;
    }

    .input textarea{
        width: 100%;
        height: 20px;
        min-height: 20px;
        max-height: 95px;
        margin: 8px 0px;
        padding: 0px 0px;
        background: none;
        color: white;
        border: none;
        resize: none;
        outline: none;
        font-family: inherit;
    }

    .input textarea::placeholder{
        opacity: 0.2;
    }

</style>