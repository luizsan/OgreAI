<script lang="ts">
    import { afterUpdate } from "svelte"
    import { busy, deleting, currentCharacter, currentChat, currentProfile } from "./State";
    import { menu, send, share, chat, history, reload, trashcan } from "./utils/SVGCollection.svelte"
    import { AutoResizeTextArea } from "./utils/AutoResizeTextArea.svelte";
    import { clickOutside } from "./utils/ClickOutside.svelte";
    import Message from './Message.svelte'
    import Loading from './Loading.svelte'

    let userMessage : string = ""
    let messagesDiv : HTMLElement;
    let chatOptions = false;
    let chatOptionsList : HTMLElement;
    let chatOptionsButton : HTMLElement;

    export function ScrollToEnd(){
        if( messagesDiv == null ) return
        messagesDiv.scrollTo(0, messagesDiv.scrollHeight)
    }

    afterUpdate(() => {
        ScrollToEnd()
    });

    function ToggleChatOptions(){
        chatOptions = !chatOptions;
    }

    function SetDeleteMessages(){
        chatOptions = false;
        $deleting = true;
    }
</script>

<div class="container">
    <div class="chat" style="grid-template-rows: auto min-content">
        <div class="messages" bind:this={messagesDiv}>
            {#if $currentChat != null}
                {#each $currentChat.messages as msg, i}
                    <Message
                        id={i}
                        author={msg.participant > -1 ? $currentChat.participants[msg.participant] : $currentProfile.name} 
                        is_bot={msg.participant > -1} 
                        index={msg.index}
                        candidates={msg.candidates}
                        avatar={msg.participant > -1 ? $currentCharacter.metadata.filepath : "./img/user_default.png"}
                    />
                {/each}
            {/if}
        </div>

        {#if !$deleting}
            <div class="input">
                <div class="options-group" use:clickOutside on:outclick={() => { chatOptions = false; }}>
                <button class="normal side options" bind:this={chatOptionsButton} on:click={ToggleChatOptions}>{@html menu}</button>
                {#if chatOptions}
                    <div class="options-list" bind:this={chatOptionsList}>
                        <button class="options-item normal" disabled>{@html share}Share</button>
                        <hr>
                        <button class="options-item normal" disabled>{@html chat}New Chat</button> <!-- <span class="shortcut">Ctrl+Insert</span> -->
                        <button class="options-item normal" disabled>{@html history}Chat History</button>
                        <hr>
                        <button class="options-item normal">{@html reload}Regenerate<span class="shortcut">Ctrl+Space</span></button>
                        <button class="options-item danger" on:click={SetDeleteMessages}>{@html trashcan}Delete Messages<span class="shortcut">Ctrl+Delete</span></button>
                    </div>
                {/if}
                </div>

            
                <textarea placeholder="Type a message..." bind:value={userMessage} use:AutoResizeTextArea></textarea>
                {#if $busy}
                    <Loading width={24} height={24}/>
                {:else}
                    <button class="normal side send">{@html send}</button>
                {/if}
                
            </div>
        {:else}
            <div class="bottom">
                <button class="normal" on:click={ () => $deleting = false }>Cancel</button>
                <button class="danger" on:click={ () => $deleting = false }>Delete</button>
            </div>
        {/if}
    </div>
</div>

<style>
    * {
        scrollbar-color: #00000040 transparent;
        scrollbar-width: thin;
    }

    .container{
        align-items: stretch;
        display: flex;
        flex-direction: column;
        inset: var( --header-size ) 0px 0px 0px;
        overflow: hidden;
        position: fixed;
    }

    .chat{
        align-self: center;
        display: grid;
        height: 100%;
        max-width: var( --chat-width );
        width: 100%;
    }

    .messages{
        display:flex;
        flex-direction: column;
        margin: 0px var(--chat-padding);
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 8px 0px;

    }

    .input{
        align-items: center;
        background: hsl(0, 0%, 30%);
        border-radius: 6px;
        border: 1.5px solid hsl(0, 0%, 40%);
        box-shadow: 0px 8px 16px #18181860;
        column-gap: 0px;
        display: grid;
        grid-template-columns: 48px auto 48px;
        height: fit-content;
        justify-items: center;
        margin: 0px var(--chat-padding);
        margin-bottom: 32px;
        padding: 0px;
        position: relative;
        resize: none;
    }

    @media (prefers-color-scheme: light) {
        .input{
            background: hsl(0, 0%, 85%);
            border: 1.5px solid hsl(0, 0%, 50%);
        }
    }  

    .side{
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
        width: 100%;
    }

    .side :global(svg){
        height: 24px;
        width: 24px;
    }

    .input textarea{
        background: none;
        border: none;
        font-family: inherit;
        height: 20px;
        margin: 8px 0px;
        max-height: 95px;
        min-height: 20px;
        outline: none;
        padding: 0px 0px;
        resize: none;
        vertical-align: baseline;
        width: 100%;
    }

    .input textarea::placeholder{
        color: hsl(0, 0%, 50%);
    }

    .options-list{
        position: absolute;
        width: fit-content;
        max-width: 100%;
        height: fit-content;
        display: flex;
        flex-direction: column;
        padding: 4px;
        top: 0px;
        left: 0px;
        translate: 0 calc( -100% - 4px) 0;
        border: 1px solid gray;
        border-radius: 6px;
        background-color: hsl(0, 0%, 30%);
    }

    .options-list hr{
        margin: 8px 12px;
        border-color: #80808040;
    }

    .options-item{
        font-family: "Lato";
        font-size: 95%;
        border-radius: 3px;
        text-align: left;
        padding: 8px 16px;
        color: hsl(0,0%,75%);
    }

    .options-item :global(svg){
        margin-bottom: -3px;
        margin-right: 8px;
        width: 16px;
        height: 16px;
    }

    .options-item:hover{
        background-color: hsl(0, 0%, 20%);
    }

    .options-item:disabled{
        opacity: 0.25;
        pointer-events: none;
    }

    .shortcut{
        margin-left: 24px;
        float: right;
        font-size: 80%;
        color: #FFFFFF40;
    }

    .bottom{
        height: 70px;
        width: 100%;
        display: flex;
        flex-direction: row;
        place-content: center;
    }

</style>