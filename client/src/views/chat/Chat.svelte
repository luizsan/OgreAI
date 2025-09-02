<script lang="ts">
    import type {
        ICandidate,
        ICharacter,
        IMessage,
        IReply,
        ILorebook,
    } from "@shared/types";

    import { AutoResize, resize } from "@/utils/AutoResize";
    import { AutoScroll } from "@/utils/AutoScroll";
    import { clickOutside } from "@/utils/ClickOutside";

    import Background from "@/views/main/Background.svelte";
    import {
        busy,
        chatList,
        currentCharacter,
        currentChat,
        selectedLorebooks,
        currentPreferences,
        currentProfile,
        currentPrompt,
        currentSettingsAPI,
        currentSettingsMain,
        deleteList,
        deleting,
        fetching,
        history,
        localServer,
    } from "@/State";


    import History from "./History.svelte";
    import Message from './Message.svelte';
    import Loading from '@/components/Loading.svelte';

    import * as Dialog from "@/modules/Dialog.ts";
    import * as Format from "@shared/format.ts";
    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte";
    import * as Logo from "@/svg/Logo.svelte";

    import { tick } from "svelte";
    import { get } from "svelte/store";

    $: lockinput = !$currentChat || $fetching || $busy || Dialog.isOpen()

    let userMessage : string = ""
    let messageBox : HTMLTextAreaElement;
    let showMenu : boolean = false;
    let requestTime : number = 0;

    let abortController : AbortController = new AbortController()
    let abortSignal = abortController.signal;

    function ToggleChatOptions(){
        showMenu = !showMenu;
    }

    function SetDeleteMessages(){
        showMenu = false;
        $deleting = true;
        $deleteList = [];
    }

    function CancelDeleteMessages(){
        showMenu = false;
        $deleting = false;
        $deleteList = [];
    }

    async function ConfirmDeleteMessages(){
        if($deleteList.length > 0){
            const ok: boolean = await Dialog.confirm("OgreAI", `Are you sure you want to delete ${$deleteList.length} message(s)?`);
            if( ok ){
                const success: boolean = await Server.request("/delete_messages", {
                    ids: $deleteList.map(id => $currentChat.messages[id].id)
                })
                if( success ){
                    $deleteList.sort()
                    $currentChat.messages = $currentChat.messages.filter((_: any, index: number) => index == 0 || !$deleteList.includes(index))
                    $currentChat = $currentChat;
                }
            }
        }
        CancelDeleteMessages();
    }

    async function SendMessage(){
        if( userMessage.trim().length <= 0)
            return;

        let message: IMessage = {
            participant: -1,
            index: 0,
            timestamp: Date.now(),
            candidates: [{
                text: Format.parseMacros(userMessage, $currentChat),
                timestamp: Date.now(),
            }]
        }

        console.debug( $currentChat.messages )
        $busy = true;
        $currentChat.messages.push(message)
        userMessage = "";
        $currentChat = $currentChat;
        $currentChat.messages = $currentChat.messages;
        const success: boolean = await Server.request("/add_message", {
            chat: $currentChat,
            message: message,
        })
        $busy = false;
        if( success ){
            await tick()
            resize( messageBox );
            await generateMessage()
        }
    }

    // select messages without cached tokens
    function getNonCachedMessages(model : string){
        let targetMessages : Array<IMessage> = $currentChat.messages.filter((message : IMessage) => {
            const candidate = message.candidates[message.index]
            if( !candidate.tokens ) return true
            if( !candidate.tokens[model] ) return true
            return false
        })
        return targetMessages
    }

    async function cacheMessageTokens(){
        const mode : string = $currentSettingsMain.api_mode;
        const model = $currentSettingsAPI.model;
        let messagesToCache = getNonCachedMessages(model);
        let tokenCache = await Server.request( "/get_message_tokens", {
            api_mode: mode,
            messages: messagesToCache,
            user: $currentProfile,
            character: $currentCharacter,
            settings: $currentSettingsAPI
        })
        // apply array of cached tokens to messages
        messagesToCache.forEach((message : IMessage, index : number) => {
            const candidate = message.candidates[message.index]
            if( !candidate.tokens ){
                candidate.tokens = {}
            }
            candidate.tokens[model] = tokenCache[index]
        })

        console.log(`Cached tokens for ${messagesToCache.length} messages.`)
        console.log($currentChat.messages)
    }

    export async function generateMessage(swipe = false){
        const mode = $currentSettingsMain.api_mode;
        let body = {
            api_mode: mode,
            character: $currentCharacter,
            chat: $currentChat,
            user: $currentProfile,
            settings: $currentSettingsAPI,
            prompt: $currentPrompt,
            books: $selectedLorebooks,
            swipe: swipe,
        }

        const options = {
            method: "POST",
            signal: abortSignal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        }

        $busy = true;
        // console.debug( "Request:\n%o", body)
        let streaming = $currentSettingsAPI.stream;
        requestTime = new Date().getTime()
        await tick()
        document.dispatchEvent(new CustomEvent("autoscroll"))
        await Server.addToRecentlyChatted($currentCharacter)
        await cacheMessageTokens()
        await fetch( localServer + "/generate", options ).then(async response => {
            if( streaming ){
                const stream = response.body.pipeThrough(new TextDecoderStream());
                const reader = stream.getReader()
                console.debug( "Awaiting stream..." )
                let candidate = startStream(swipe)
                async function processText({ done, value: input }){
                    if(done || (input && input.done)){
                        finishStream(candidate, swipe)
                        return;
                    }
                    await parseStream(candidate, input)
                    return reader.read().then(processText)
                }
                return reader.read().then(processText)
            }else{
                response.json().then(async data => {
                    console.debug("Received message: %o", data)
                    if( data.error ){
                        await Dialog.alert(data.error.type, data.error.message)
                    }else{
                        receiveMessage( data )
                    }
                }).catch(error => {
                    console.error(error)
                })
            }
        }).catch(error => {
            if( error instanceof DOMException ){
                console.log("Message aborted.")
            }else{
                console.error(error)
            }
        })
        $busy = false;
    }

    function receiveMessage(incoming : IReply){
        console.debug($currentChat.messages)
        incoming.candidate.text = Format.regexReplace(incoming.candidate.text, [ "on_reply" ], $currentSettingsMain.formatting.replace )
        incoming.candidate.text = Format.parseMacros(incoming.candidate.text, $currentChat)
        incoming.candidate.timer = Date.now() - requestTime;
        if(incoming.swipe){
            addCandidate(incoming.candidate)
        }else{
            let message = newMessage(incoming)
            addMessage(message)
        }
        document.dispatchEvent(new CustomEvent("autoscroll"))
    }

    function abortMessage(){
        if(!$busy) return;
        abortController.abort()
        abortController = new AbortController()
        abortSignal = abortController.signal
        $busy = false;
    }

    function newMessage(incoming: IReply){
        let new_message: IMessage = {
            participant: incoming.participant,
            index: 0,
            timestamp: Date.now(),
            candidates: [ incoming.candidate ],
        }
        return new_message
    }

    async function addMessage(message: IMessage){
        let result_id = await Server.request( "/add_message", {
            chat: $currentChat,
            message: message
        })
        if( result_id ){
            message.id = result_id
            $currentChat.messages.push(message)
            $currentChat.last_interaction = Date.now()
            $currentChat = $currentChat;
        }
        return result_id
    }

    async function addCandidate(candidate: ICandidate, stream: boolean = false){
        let last_message: IMessage = $currentChat.messages.at(-1)
        if( last_message.participant > -1 ){
            let success: boolean = await Server.request( "/add_candidate", {
                message: last_message,
                candidate: candidate
            })
            if( success ){
                if(!stream){
                    last_message.candidates.push(candidate)
                    last_message.index = last_message.candidates.length-1;
                }
                $currentChat.last_interaction = Date.now()
                $currentChat = $currentChat;
                await Server.request("/swipe_message", {
                    message: last_message,
                    index: last_message.index
                })
                return true;
            }
        }
        return false
    }

    function startStream(swipe = false) : ICandidate{
        let candidate = {
            text: "",
            reasoning: "",
            timestamp: Date.now(),
            timer: Date.now() - requestTime,
            model: null,
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
                timestamp: Date.now(),
                candidates: [ candidate ],
            })
        }
        $currentChat.last_interaction = Date.now()
        $currentChat = $currentChat;
        return candidate;
    }

    async function parseStream(candidate: ICandidate, input: string){
        const lines = input.split('\n').filter((line: string) => line.trim() !== '');
        for( const line of lines ){
            try{
                const obj = JSON.parse(line)
                if( obj.error ){
                    candidate.timer = new Date().getTime() - requestTime;
                    candidate.text += "\n\n" + obj.error?.message || obj.error
                    candidate.text = candidate.text.trim()
                    await Dialog.alert(obj.error?.type || "Error", obj.error?.message)
                }
                if( obj.candidate ){
                    candidate.timestamp = obj.candidate.timestamp
                    // reasoning
                    if( obj.candidate.reasoning ){
                        if( obj.replace ){
                            candidate.reasoning = obj.candidate.reasoning
                        }else{
                            candidate.reasoning += obj.candidate.reasoning
                        }
                    }
                    // text
                    if( obj.candidate.text ){
                        if( obj.replace ){
                            candidate.text = obj.candidate.text
                        }else{
                            candidate.text += obj.candidate.text
                        }
                    }
                    // model
                    if( !candidate.model ){
                        if( obj.candidate.model ){
                            candidate.model = obj.candidate.model
                        }else if( $currentSettingsAPI.model ){
                            candidate.model = $currentSettingsAPI.model
                        }
                    }
                }
            }catch(error){
                if(error instanceof SyntaxError){
                    console.error("SyntaxError: Failed to parse chunk: %s", line)
                }else{
                    console.error(error)
                }
            }

            candidate.timer = new Date().getTime() - requestTime;
            document.dispatchEvent(new CustomEvent("autoscroll"))
            $currentChat = $currentChat;
        }
    }

    function finishStream(candidate: ICandidate, swipe: boolean = false){
        candidate.timer = new Date().getTime() - requestTime;
        candidate.text = Format.regexReplace(candidate.text, ["on_reply"], $currentSettingsMain.formatting.replace )
        candidate.text = Format.parseMacros(candidate.text, $currentChat)
        if(swipe){
            addCandidate(candidate, true)
        }else{
            const last_message: IMessage = $currentChat.messages.at(-1)
            last_message.timestamp = candidate.timestamp
            addMessage(last_message)
        }
        console.debug( "Received stream: %o", candidate )
        document.dispatchEvent(new CustomEvent("autoscroll"))
    }

    async function RegenerateMessage(){
        if( lockinput ) return;
        showMenu = false;
        let last = $currentChat.messages.at(-1)
        if( last.participant > -1 && $currentChat.messages.length > 1 ){
            if( last.candidates.length > 1 ){
                let index = $currentChat.messages.at(-1).index;
                index = Math.min(Math.max(index, 0), $currentChat.messages.at(-1).candidates.length-1 );
                $currentChat.messages.at(-1).candidates.splice( index, 1 )
                index = Math.min(Math.max(index, 0), $currentChat.messages.at(-1).candidates.length-1 );
                $currentChat.messages.at(-1).index = index;
                $currentChat = $currentChat;
                await generateMessage(true);
            }else{
                $currentChat.messages.pop()
                $currentChat = $currentChat;
                await generateMessage(false);
            }
        }else{
            await generateMessage(false);
        }
    }

    async function ChatHistory(state : boolean){
        if( state ){
            showMenu = false;
            $fetching = true;
            await Server.ListChats( $currentCharacter )
            $fetching = false;
            $history = true;
        }else{
            $history = false;
            await tick()
            document.dispatchEvent(new CustomEvent("autoscroll"));
        }
    }

    async function ChangeChatTitle(){
        showMenu = false;
        let new_title = await Dialog.prompt("OgreAI", "Insert the new chat title:", $currentChat.title)
        if( new_title.trim() ){
            $currentChat.title = new_title
            // Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } )
        }
    }

    function Shortcuts(event : KeyboardEvent){
        if( event.key === "Escape"){
            abortMessage()
        }

        if( lockinput ) return;

        if(event.ctrlKey){
            if(event.key === " "){
                RegenerateMessage()
                event.preventDefault()
            }
        }

        if( document.activeElement !== messageBox ) return;

        const condition = $currentPreferences["enter_sends_message"] ?? false
        if(event.key === "Enter" && (event.shiftKey !== condition)){
            messageBox.blur()
            SendMessage();
            event.preventDefault()
        }
    }
</script>

<svelte:body on:keydown={Shortcuts}/>

{#if $currentCharacter && $currentChat}

<div class="container" inert={get(Dialog.data) !== null}>
    <Background/>

    <div class="chat">
        {#if !$history}
            <div class="messages" class:disabled={$busy} class:deselect={$busy} use:AutoScroll>
            {#if $currentChat != null}
                {#each $currentChat.messages as _, i}
                    <Message id={i} generateSwipe={()=>generateMessage(true)}/>
                {/each}
            {/if}
            </div>
        {:else}
            {#if $chatList != null && $chatList.length > 0}
                <div class="history">
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
                <div use:clickOutside on:clickout={() => { if(Dialog.isOpen()) return; showMenu = false; }}>
                    <button class="normal side options" on:click={ToggleChatOptions}>{@html SVG.menu}</button>

                    {#if showMenu}
                    <div class="chatmenu">
                        <button class="item normal title" on:click={ChangeChatTitle}>
                            {@html SVG.chat}
                            <div>
                                <p class="subtitle">Current chat</p>
                                <p class="name">{$currentChat.title}</p>
                            </div>
                        </button>
                        <button class="item normal" on:click={() => ChatHistory(true)}>{@html SVG.history}Chat History</button>
                        <button class="item normal" on:click={Server.newChat}>{@html SVG.window}New Chat</button>
                        <hr>
                        <button class="item normal" on:click={RegenerateMessage}>{@html SVG.reload}Regenerate<span class="shortcut">Ctrl+Space</span></button>
                        <button class="item danger" on:click={SetDeleteMessages}>{@html SVG.trashcan}Delete Messages</button>
                    </div>
                    {/if}

                </div>

                <textarea placeholder="Type a message..." bind:this={messageBox} bind:value={userMessage} use:AutoResize></textarea>

                {#if $busy}
                    <Loading/>
                {:else}
                    <button class="normal side send" on:click={SendMessage}>{@html SVG.send}</button>
                {/if}
            </div>

            <div class="under">
                <div class="api deselect">
                    {#if $currentSettingsAPI?.model}
                        {#if Logo[$currentSettingsMain.api_mode]}
                            {@html Logo[$currentSettingsMain.api_mode]}
                        {/if}
                        {$currentSettingsAPI.model}
                    {:else}
                        No API Selected
                    {/if}
                </div>
                <div>
                    {#if $busy}
                        <button class="abort danger side" on:click={abortMessage}>Abort Message {@html SVG.stop}</button>
                    {/if}
                </div>
            </div>

        {/if}
    </div>
</div>

{:else}
    <div/>
{/if}


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

    * {
        scrollbar-color: #80808020 transparent;
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
        grid-template-rows: auto min-content;
        height: 100%;
        max-width: var( --chat-width );
        width: 100%;
        position: relative;
    }

    .messages{
        display:flex;
        flex-direction: column;
        box-sizing: border-box;
        margin: 0px var(--chat-padding);
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 8px 0px 4px 0px;
    }

    .history{
        display:flex;
        flex-direction: column;
        gap: 16px;
        box-sizing: border-box;
        margin: 0px var(--chat-padding);
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 8px 6px 8px 0px;
    }

    .input{
        --scrollbar-bg: var( --input-bg-normal );

        align-items: center;
        border-radius: 6px;
        background: var( --input-bg-normal );
        border: var( --input-border-normal );
        outline: var( --input-outline-normal );
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
        scrollbar-color: var( --accent-color-normal ) transparent;

        background: none;
        border: none;
        color: var( --default-font-color );
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
        overflow-y: auto;
    }

    .input textarea::placeholder{
        color: hsl(0, 0%, 50%);
    }

    .abort{
        width: fit-content;
        height: 100%;
        position: absolute;
        right: 24px;
        gap: 4px;
        font-size: 75%;
        padding: 0px;
    }

    .abort :global(svg){
        width: 16px;
        height: 16px;
    }

    .chatmenu{
        position: absolute;
        width: fit-content;
        max-width: 240px;
        height: fit-content;
        display: flex;
        flex-direction: column;
        padding: 4px;
        top: 0px;
        left: 0px;
        translate: -1px calc( -100% - 3px) 0;
        border-radius: 5px;
        box-shadow: 2px 2px 0px 0px #00000040;
        background: var( --input-bg-normal );
        border: var( --input-border-normal );
        outline: var( --input-outline-normal );
    }

    .chatmenu hr{
        margin: 8px 12px;
        border-color: #80808040;
    }

    .chatmenu .item{
        font-size: 85%;
        box-sizing: border-box;
        border-radius: 3px;
        text-align: left;
        padding: 8px 12px;
        display: flex;
        gap: 12px;
        flex-direction: row;
        align-items: center;
        width: 100%;
    }

    .chatmenu .item:hover{
        background-color: hsl(0, 0%, 20%);
    }

    .chatmenu .item:is(.normal):hover{
        color: white;
    }

    .chatmenu .item:disabled{
        color: hsl(0, 0%, 40%);
        pointer-events: none;
    }

    .chatmenu .item.title{
        font-size: 0.75em;
    }

    .chatmenu .item .subtitle{
        opacity: 0.5;
    }

    .chatmenu .item .name{
        text-overflow: ellipsis;
        overflow: hidden;
    }

    .shortcut{
        padding-left: 48px;
        margin-left: auto;
        float: right;
        font-size: 85%;
        opacity: 0.5;
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

    .under{
        position: absolute;
        bottom: 6px;
        left: 0px;
        right: 0px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: 0px 24px;
    }

    .api{
        display: flex;
        gap: 8px;
        font-size: 70%;
        align-items: center;
        opacity: 0.25;
    }

    .api :global(svg){
        width: 12px;
        height: 12px;
    }

</style>