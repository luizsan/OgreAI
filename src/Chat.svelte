<script lang="ts">
    import { menu, send, loading } from "./assets/svg"
    import Message from './Message.svelte'

    let message : string = ""
    let busy : boolean = false

    function getAuthor(i : number){
        return (i % 2 == 0) ? "Bot" : "User"
    }

    function ResizeTextArea({ target }) {
        target.style.height = "1px";
        target.style.height = (+target.scrollHeight)+"px";
    }

    function ResizeCallback( element : HTMLElement ){
        ResizeTextArea({ target: element });
        element.style.overflow = 'hidden';
        element.addEventListener('input', ResizeTextArea);
        return {
            destroy: () => element.removeEventListener('input', ResizeTextArea)
        }
    }

</script>


<div class="chat" style="grid-template-rows: auto fit-content">
    <div class="messages">
        {#each {length: 10} as _, i}
            <Message author={getAuthor(i)} id={i} />
        {/each}
    </div>

    <div class="input">
        <button class="side options"><div class="icon">{@html menu}</div></button>
        <textarea placeholder="Type a message..." bind:value={message} use:ResizeCallback></textarea>
        {#if busy}
            <button class="side loading"><div class="icon">{@html loading}</div></button>
        {:else}
            <button class="side send"><div class="icon">{@html send}</div></button>
        {/if}
    </div>
</div>


<style>
    .chat{
        width: 100%;
        max-width: var( --chat-width );
        height: 100%;
        align-self: center;
        flex: 1;
        display: grid;
    }

    .messages{
        padding: 8px 0px;
        margin: 0px var(--chat-padding);
        margin-top: var(--header-size);
        overflow-x: hidden;
        overflow-y: auto;
        display: block;
    }

    .input{
        position: relative;
        height: fit-content;
        padding: 0px;
        margin: 0px var(--chat-padding);
        margin-bottom: var( --header-size );
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
        place-items: center;
    }

    .icon{
        width: 24px;
        height: 24px;
        margin: auto;
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