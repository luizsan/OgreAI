<script lang="ts">
    import { AutoResize, resize } from "../utils/AutoResize";
    import { busy, deleting, history, localServer, currentCharacter, currentChat, currentProfile, currentSettings, deleteList, fetching, chatList } from "../State";
    import { clickOutside } from "../utils/ClickOutside";
    import * as Server from "./Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte"
    import History from "./History.svelte";
    import Loading from '../components/Loading.svelte'
    import Message from './Message.svelte'
    import { ChatScroll, scroll } from "../utils/ChatScroll";
    import { onMount, tick } from "svelte";

    $: lockinput = !$currentChat || $fetching || $busy;

    let userMessage : string = ""
    let messageBox : HTMLTextAreaElement;
    let messagesDiv : HTMLElement;
    let chatOptions = false;

    onMount(async () => {
        await tick()
        scroll( messagesDiv );
    })

    function ToggleChatOptions(){
        chatOptions = !chatOptions;
    }

    function SetDeleteMessages(){
        chatOptions = false;
        $deleting = true;
        $deleteList = [];
    }

    function CancelDeleteMessages(){
        chatOptions = false;
        $deleting = false;
        $deleteList = [];
    }

    async function ConfirmDeleteMessages(){
        if($deleteList.length > 0){
            if(window.confirm(`Are you sure you want to delete ${$deleteList.length} message(s)?`)){
                $deleteList.sort()
                $currentChat.messages = $currentChat.messages.filter((_: any, index: number) => index == 0 || !$deleteList.includes(index))
                $currentChat = $currentChat;
                Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter })
                CancelDeleteMessages();
            }
        }
    }

    async function SendMessage(){
        if( userMessage.length > 0 ){
            let message = {
                participant: -1,
                index: 0,
                candidates: [{
                    text: userMessage,
                    timestamp: Date.now(),
                }]
            }
            $currentChat.messages.push(message)
            userMessage = "";
            resize(messageBox);
            scroll( messagesDiv )
            $currentChat = $currentChat;
            $currentChat.messages = $currentChat.messages;
        }

        console.debug( $currentChat.messages )
        await Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } ),
        await GenerateMessage()
    }

    export async function GenerateMessage(swipe = false){
        let mode = $currentSettings.api_mode;
        let body = {
            api_mode: mode,
            character: $currentCharacter,
            messages: $currentChat.messages,
            user: $currentProfile.name,
            settings: $currentSettings[mode],
            swipe: swipe,
        }

        const options = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }

        $busy = true;
        let streaming = $currentSettings[mode].stream;
        await fetch( localServer + "/generate", options ).then(async response => {
            if( streaming ){
                const stream = response.body.pipeThrough( new TextDecoderStream() );
                const reader = stream.getReader()
                let candidate = ReceiveStream(swipe)

                function processText({ done, value }){
                    if(done || (value && value.done)){
                        Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter })
                        return;
                    }

                    const lines = value.split('\n').filter((line: string) => line.trim() !== '');
                    for( const line of lines ){
                        const obj = JSON.parse(line)
                        console.log( obj.streaming )
                        if( obj.streaming ){
                            candidate.text += obj.streaming.text
                            candidate.timestamp = obj.streaming.timestamp
                        }

                        scroll( messagesDiv )
                        $currentChat = $currentChat;
                    }

                    // console.log( value );
                    return reader.read().then(processText)
                }
                return reader.read().then(processText)
            }else{
                response.json().then(async data => {
                    console.log("Received message: %o", data)
                    if( data.error ){
                        alert(`${data.error.type}\n${data.error.message}`)
                    }else{
                        ReceiveMessage( data )
                    }
                }).catch(error => {
                    console.log(error)
                })
            }
        }).catch(error => {
            console.error(error)
        })

        $busy = false;
    }

    function ReceiveStream(swipe = false) : ICandidate{
        let candidate = {
            text: "",
            timestamp: Date.now(),
        }

        if( swipe ){
            let last = $currentChat.messages.at(-1)
            if( last.participant > -1 ){
                last.candidates.push(candidate)
                last.index = last.candidates.length-1;
            }
        }else{
            $currentChat.messages.push({
                participant: 0,
                index: 0,
                candidates: [ candidate ],
            })
        }
        $currentChat.last_interaction = Date.now()
        $currentChat = $currentChat;
        scroll( messagesDiv )
        return candidate;
    }

    function ReceiveMessage(incoming : IReply){
        console.debug($currentChat.messages)

        if( incoming.swipe ){
            let last = $currentChat.messages.at(-1)
            if( last.participant > -1 ){
                last.candidates.push({
                    text: incoming.candidate.text,
                    timestamp: incoming.candidate.timestamp,
                })
                last.index = last.candidates.length-1;
            }
        }else{
            $currentChat.messages.push({
                participant: incoming.participant,
                index: 0,
                candidates: [ incoming.candidate ],
            })
        }
        $currentChat.last_interaction = Date.now()
        $currentChat = $currentChat;
        scroll( messagesDiv )
        Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } )
    }

    async function RegenerateMessage(){
        if( lockinput ) return;
        
        chatOptions = false;
        let last = $currentChat.messages.at(-1)
        if( last.participant > -1 && $currentChat.messages.length > 1 ){
            if( last.candidates.length > 1 ){
                let index = $currentChat.messages.at(-1).index;
                index = Math.min(Math.max(index, 0), $currentChat.messages.at(-1).candidates.length-1 );
                $currentChat.messages.at(-1).candidates.splice( index, 1 )
                index = Math.min(Math.max(index, 0), $currentChat.messages.at(-1).candidates.length-1 );
                $currentChat.messages.at(-1).index = index;
                scroll( messagesDiv )
                $currentChat = $currentChat;
                await GenerateMessage(true);
            }else{
                $currentChat.messages.pop()
                scroll( messagesDiv )
                $currentChat = $currentChat;
                await GenerateMessage(false);
            }
        }else{
            await GenerateMessage(false);
        }
    }

    async function ChatHistory(state : boolean){
        if( state ){
            chatOptions = false;
            $fetching = true;
            await Server.getChats( $currentCharacter )
            $fetching = false;
            $history = true;
        }else{
            $history = false;
            await tick()
            document.dispatchEvent(new CustomEvent("chatscroll"));
        }
    }

    function Shortcuts(event : KeyboardEvent){
        if( lockinput ) return;
        
        if(event.ctrlKey){
            if(event.key === " "){
                RegenerateMessage()
                event.preventDefault()
            }
        }
        
        if( document.activeElement !== messageBox ) return;

        if(!event.shiftKey){
            if(event.key === "Enter"){
                if(messageBox.selectionEnd === messageBox.value.length){
                    messageBox.blur()
                    SendMessage();
                    event.preventDefault()
                }
            }
        }
    }
</script>

<svelte:body on:keydown={Shortcuts}/>

<div class="container">
    <div class="chat" style="grid-template-rows: auto min-content">

        {#if !$history}
            <div class="messages" bind:this={messagesDiv} use:ChatScroll>
                {#if $currentChat != null}
                    {#each $currentChat.messages as _, i}
                        <Message id={i} generateSwipe={()=>GenerateMessage(true)}/>
                    {/each}
                {/if}
            </div>
        {:else}
            {#if $chatList != null && $chatList.length > 0}
                <div class="messages">
                    {#each $chatList as chat}
                        <History chat={chat}/>
                    {/each}
                </div>
            {:else}
                <div class="center">
                    No chats available
                </div>
            {/if}
        {/if}


        {#if $deleting}
            <div class="bottom">
                <button class="component normal" on:click={CancelDeleteMessages}>Cancel</button>
                <button class="component danger" on:click={ConfirmDeleteMessages}>Delete</button>
            </div>
        {:else if $history}
            <div class="bottom">
                <button class="component normal" on:click={() => ChatHistory(false)}>Back</button>
            </div>
        {:else}
            <div class="input" class:disabled={$busy}>
                <div class="options-group" use:clickOutside on:outclick={() => { chatOptions = false; }}>
                <button class="normal side options" on:click={ToggleChatOptions}>{@html SVG.menu}</button>

                {#if chatOptions}
                    <div class="options-list">
                        <button class="options-item normal" on:click={Server.newChat}>{@html SVG.chat}New Chat</button>
                        <button class="options-item normal" on:click={() => ChatHistory(true)}>{@html SVG.history}Chat History</button>
                        <hr>
                        <button class="options-item normal" on:click={RegenerateMessage}>{@html SVG.reload}Regenerate<span class="shortcut">Ctrl+Space</span></button>
                        <button class="options-item danger" on:click={SetDeleteMessages}>{@html SVG.trashcan}Delete Messages<span class="shortcut">Ctrl+Delete</span></button>
                    </div>
                {/if}
                
                </div>

                <textarea placeholder="Type a message..." bind:this={messageBox} bind:value={userMessage} use:AutoResize={userMessage}></textarea>
                {#if $busy}
                    <Loading/>
                {:else}
                    <button class="normal side send" on:click={SendMessage}>{@html SVG.send}</button>
                {/if}
                
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
        box-sizing: border-box;
        margin: 0px var(--chat-padding);
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 8px 0px;
        box-sizing: border-box;
    }

    .input{
        align-items: center;
        border-radius: 6px;
        background: hsl(0, 0%, 33%);
        border: 1.5px solid hsla(0, 0%, 50%, 0.5);
        outline: 1px solid hsla(0, 0%, 10%, 0.5);
        box-shadow: 0px 4px 12px #18181840;
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
            background: hsl(0, 0%, 90%);
            border: 1.5px solid hsla(0, 0%, 75%, 0.5);
            outline: 1px solid hsla(0, 0%, 10%, 0.5);
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
        font-size: 90%;
        border-radius: 3px;
        text-align: left;
        padding: 8px 16px;
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
        color: hsl(0, 0%, 40%);
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
        align-items: center;
        place-content: center;
        gap: 16px;
        border-top: 1px solid #80808024;
    }

    .bottom *{
        margin: 0px;
    }

</style>