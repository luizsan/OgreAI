<script lang="ts">
    import type {
        ICandidate,
        IError,
        IMessage,
        IReply,
    } from "@shared/types";

    import { AutoResize, resize } from "@/utils/AutoResize";
    import { AutoScroll } from "@/utils/AutoScroll";
    import { clickOutside } from "@/utils/ClickOutside";

    import Background from "@/views/main/Background.svelte";
    import {
        busy,
        generating,
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
        swipes,
    } from "@/State";


    import Message from './Message.svelte';
    import Swipes from "./Swipes.svelte";
    import Loading from '@/components/Loading.svelte';

    import { data } from "@/modules/Actions";
    import * as Dialog from "@/modules/Dialog.ts";
    import * as Format from "@shared/format.ts";
    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte";
    import * as Logo from "@/svg/Logo.svelte";

    import { tick } from "svelte";
    import { fly } from "svelte/transition";

    $: lockinput = !$currentChat || $fetching || $busy || $generating || !!$swipes || Dialog.isOpen() || !!$data

    let userMessage : string = ""
    let messageBox : HTMLTextAreaElement;
    let showMenu : boolean = false;
    let requestTime : number = 0;

    $: placeholder_idle = `Type a message to ${$currentCharacter?.data?.name || "character"}...`;
    $: placeholder_wait = "Awaiting response...";

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

    function cancelDeleteMessages(){
        showMenu = false;
        $deleting = false;
        $deleteList = [];
    }

    function ClampIndex(message: IMessage){
        const index = message.index
        return Math.min(Math.max(index, 0), message.candidates.length-1 );
    }


    async function confirmDeleteMessages(){
        await Server.deleteMessages($deleteList)
        cancelDeleteMessages();
    }

    async function SendMessage(){
        $generating = true;
        if( userMessage.trim().length > 0 ){
            let content: string = userMessage;
            const success = await Server.sendMessage(content);
            if( success ){
                await tick()
            }
        }
        userMessage = "";
        await tick();
        resize( messageBox );
        await generateMessage()
        $generating = false;
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

        $generating = true;
        // console.debug( "Request:\n%o", body)
        let model = $currentSettingsAPI.model
        let streaming = $currentSettingsAPI.stream;
        requestTime = new Date().getTime()
        await tick()
        document.dispatchEvent(new CustomEvent("autoscroll"))
        await cacheMessageTokens()
        // target candidate only if streaming
        // moved up due to scope issues when aborting
        let candidate: ICandidate = null
        await fetch( localServer + "/generate", options ).then(async response => {
            if( streaming ){
                const stream = response.body.pipeThrough(new TextDecoderStream());
                const reader = stream.getReader()
                console.debug( "Awaiting stream..." )
                candidate = startStream(swipe)
                async function processText({ done, value: input }){
                    if(done || (input && input.done)){
                        await finishStream(candidate, swipe)
                        return;
                    }
                    await parseStream(candidate, input)
                    return reader.read().then(processText)
                }
                return reader.read().then(processText)
            }else{
                response.json().then(async data => {
                    if( data.error ){
                        console.error("Received error: %o", data.error)
                        await Dialog.alert(data.error.type, data.error.message)
                        await receiveError(data, model ,requestTime, swipe)
                    }else{
                        await receiveMessage( data )
                    }
                    console.debug("Received message: %o", data)
                }).catch(error => {
                    console.error("Received error: %o", error)
                })
            }
        }).catch(async error => {
            if( error.name === "AbortError" ){
                console.warn("Message aborted.")
                if(streaming){
                    await finishStream(candidate, swipe)
                }
            }else{
                console.error("Received error: %o", error)
            }
        })
        $generating = false;
    }

    async function receiveError(incoming: IError, model: string, time: number, swipe: boolean = false){
        const candidate = {
            text: `<div class="error"><p class="type">${incoming.error.type}</p><p class="message">${incoming.error.message}</p></div>`,
            reasoning: "",
            model: model,
            timestamp: Date.now(),
            timer: Date.now() - time,
        }
        if( swipe ){
            await addCandidate(candidate)
        }else{
            const message: IMessage = {
                participant: 0,
                timestamp: Date.now(),
                index: 0,
                candidates: [candidate],
            }
            await addMessage(message)
        }
    }

    async function receiveMessage(incoming : IReply){
        console.debug($currentChat.messages)
        incoming.candidate.text = Format.regexReplace(incoming.candidate.text, [ "on_reply" ], $currentSettingsMain.formatting.replace )
        incoming.candidate.text = Format.parseMacros(incoming.candidate.text, $currentChat)
        incoming.candidate.timer = Date.now() - requestTime;
        if(incoming.swipe){
            await addCandidate(incoming.candidate)
        }else{
            let message = newMessage(incoming)
            await addMessage(message)
        }
        document.dispatchEvent(new CustomEvent("autoscroll"))
    }

    function abortMessage(){
        if(!$generating)
            return;
        abortController.abort()
        abortController = new AbortController()
        abortSignal = abortController.signal
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

    async function addMessage(message: IMessage, silent: boolean = false){
        const now = Date.now()
        $busy = true;
        await Server.request( "/add_message", {
            chat: $currentChat,
            message: message
        }).then(new_message => {
            if(!new_message) return
            console.log(`Added message: %o`, new_message)
            if( new_message ){
                message.id = new_message.id
                message.timestamp = new_message.timestamp
                message.index = new_message.index
                message.participant = new_message.participant
                message.candidates = new_message.candidates
                if(!silent)
                    $currentChat.messages.push(message)
                Server.updateChats()
                $currentChat.messages = $currentChat.messages;
            }
        })

        // update last interaction
        await Server.request("/chat_interaction", {
            chat: $currentChat,
            timestamp: now
        }).then((success) => {
            if( !success ) return
            Server.updateChats()
        })
        $busy = false;
    }

    async function addCandidate(candidate: ICandidate, silent: boolean = false){
        let last_message: IMessage = $currentChat.messages.at(-1)
        if( last_message.participant > -1 ){
            $busy = true;
            const new_candidate = await Server.request( "/add_candidate", {
                message: last_message,
                candidate: candidate
            })
            console.log(`Added candidate: %o`, new_candidate)
            if( candidate ){
                candidate.id = new_candidate.id
                if(!silent){
                    last_message.candidates.push(candidate)
                    last_message.index = last_message.candidates.length-1;
                }
                $currentChat.last_interaction = Date.now()
                $currentChat = $currentChat;
                await Server.request("/swipe_message", {
                    message: last_message,
                    index: last_message.index
                })
                await Server.request("/chat_interaction", {
                    chat: $currentChat,
                    timestamp: candidate.timestamp
                }).then((success) => {
                    if( !success ) return
                    Server.updateChats()
                })
            }
            $busy = false;
        }
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
                    candidate.text += `\n\n<div class="error"><p class="type">${obj.error?.type}</p><p class="message">${obj.error?.message || obj.error}</p></div>`
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

    async function finishStream(candidate: ICandidate, swipe: boolean = false){
        candidate.timer = new Date().getTime() - requestTime;
        candidate.text = Format.regexReplace(candidate.text, ["on_reply"], $currentSettingsMain.formatting.replace )
        candidate.text = Format.parseMacros(candidate.text, $currentChat)
        if(swipe){
            await addCandidate(candidate, true)
        }else{
            const last_message: IMessage = $currentChat.messages.at(-1)
            last_message.timestamp = candidate.timestamp
            await addMessage(last_message, true)
        }
        console.debug( "Received stream" )
        document.dispatchEvent(new CustomEvent("autoscroll"))
    }

    async function RegenerateMessage(){
        if( lockinput ) return;
        showMenu = false;
        $generating = true;
        let last = $currentChat.messages.at(-1)
        if( last.participant > -1 && $currentChat.messages.length > 1 ){
            if( last.candidates.length > 1 ){
                let index = last.index;
                const success: boolean = await Server.request("/delete_candidate", {
                    id: last.candidates[index].id
                })
                if( success ){
                    index = ClampIndex(last);
                    last.candidates.splice( index, 1 )
                    index = ClampIndex(last);
                    last.index = index;
                    $currentChat = $currentChat;
                    await generateMessage(true);
                }
            }else{
                const success: boolean = await Server.request("/delete_messages", {
                    ids: [ last.id ]
                })
                if( success ){
                    $currentChat.messages.pop()
                    $currentChat = $currentChat;
                    await generateMessage(false);
                }
            }
        }else{
            await generateMessage(false);
        }
        $generating = false;
    }

    async function ChatHistory(state : boolean){
        if( state ){
            showMenu = false;
            $fetching = true;
            await Server.listChats( $currentCharacter )
            $fetching = false;
            $history = true;
        }else{
            $history = false;
            await tick()
            document.dispatchEvent(new CustomEvent("autoscroll"));
        }
    }

    async function Shortcuts(event : KeyboardEvent){
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
            await SendMessage();
            event.preventDefault()
        }
    }

    function closeMenu(){
        showMenu = false
    }
</script>

<svelte:body on:keydown={Shortcuts}/>

{#if $currentCharacter && $currentChat}

<div class="container">
    <Background/>

    <div class="main" class:wait={$generating || $busy} class:unfocus={!!$swipes}>
        <div class="messages" class:disabled={lockinput} class:deselect={lockinput} use:AutoScroll inert={lockinput}>
            {#if $currentChat != null}
                {#each $currentChat.messages as _, i}
                    <Message
                        id={i}
                        swipeAction={()=>generateMessage(true)}
                    />
                {/each}
            {/if}
        </div>

        {#if $deleting}
            <div class="bottom">
                <button class="component normal" on:click={cancelDeleteMessages}>Cancel</button>
                <button class="component danger" on:click={confirmDeleteMessages}>Delete</button>
            </div>

        {:else}
            {@const placeholder = $generating ? placeholder_wait : placeholder_idle}
            <div class="input" class:disabled={lockinput} inert={lockinput}>
                <div use:clickOutside on:clickout={() => { if(Dialog.isOpen()) return; showMenu = false; }}>
                    <button class="normal clear side options" on:click={ToggleChatOptions}>{@html SVG.menu}</button>

                    {#if showMenu}
                    <div class="chatmenu deselect" role="menu" tabindex={0} on:click={closeMenu} on:keypress={closeMenu} transition:fly={{duration:150, y: 10}}>
                        <button class="item normal title" on:click={() => Server.changeChatTitle($currentChat)}>
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

                <textarea placeholder={placeholder} bind:this={messageBox} bind:value={userMessage} use:AutoResize></textarea>
                {#if $generating}
                    <Loading/>
                {:else}
                    <button class="normal clear side send" on:click={SendMessage}>{@html SVG.send}</button>
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
                    {#if $generating}
                        <button class="abort danger side" on:click={abortMessage}>Abort Message {@html SVG.stop}</button>
                    {/if}
                </div>
            </div>
        {/if}
    </div>

    <Swipes/>
</div>

{:else}
    <div/>
{/if}


<style>
    .container{
        --chat-padding: 8px;
        align-items: stretch;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
        inset: 0px;
        min-width: 480px;
        width: 100%;
    }

    :global(body.portrait) .container{
        position:absolute;
    }

    .main{
        align-self: center;
        display: flex;
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0px;
        bottom: 0px;
        max-width: var( --chat-width );
    }

    .unfocus{
        filter: blur(4px);
        opacity: 0.5;
    }

    .messages{
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: 100%;
        margin: 0px var(--chat-padding);
        overflow-y: scroll;
        margin-bottom: 75px;
        padding: 8px 0px 4px 0px;
        --scrollbar-color: var( --scrollbar-neutral )
    }

    .input{
        align-items: center;
        border-radius: 6px;
        background: var( --chat-input-background );
        border: var( --chat-input-border );
        outline: var( --chat-input-outline );
        box-shadow: 0px 4px 12px #18181840;
        column-gap: 0px;
        display: grid;
        grid-template-columns: 48px auto 48px;
        height: fit-content;
        justify-items: center;
        padding: 0px;
        position: absolute;
        resize: none;
        min-height: 40px;
        left: var( --chat-padding );
        right: var( --chat-padding );
        bottom: 32px;
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
        color: var( --content-primary-300 );
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
        background: var( --chat-input-background );
        border: var( --chat-input-border );
        outline: var( --chat-input-outline );
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
        display: grid;
        grid-template-columns: 16px auto auto;
        gap: 12px;
        flex-direction: row;
        align-items: center;
        width: 100%;
    }

    .chatmenu .item :global(svg){
        min-height: 100%;
        object-fit: contain;
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
        height: 74px;
        bottom: 0px;
        width: 100%;
        position: absolute;
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
        bottom: 2px;
        left: 0px;
        right: 0px;
        height: 28px;
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