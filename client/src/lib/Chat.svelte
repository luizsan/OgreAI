<script lang="ts">
    import { AutoResize, resize } from "../utils/AutoResize";
    import { busy, deleting, history, localServer, currentCharacter, currentPreferences, currentChat, currentProfile, currentSettingsMain, currentSettingsAPI, deleteList, fetching, chatList, currentLorebooks } from "../State";
    import { clickOutside } from "../utils/ClickOutside";
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte"
    import History from "./History.svelte";
    import Loading from '../components/Loading.svelte'
    import Message from './Message.svelte'
    import Background from "./Background.svelte";
    import { ChatScroll } from "../utils/ChatScroll";
    import { onMount, tick } from "svelte";
    import * as Format from "@shared/format.mjs";

    $: lockinput = !$currentChat || $fetching || $busy;

    let userMessage : string = ""
    let messageBox : HTMLTextAreaElement;
    let chatOptions : boolean = false;
    let requestTime : number = 0;

    let abortController : AbortController = new AbortController()
    let abortSignal = abortController.signal;

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
            userMessage = Format.parseMacros(userMessage, $currentChat)
            $currentChat.messages.push(message)
            userMessage = "";
            $currentChat = $currentChat;
            $currentChat.messages = $currentChat.messages;
            await tick()
            resize( messageBox );
        }

        console.debug( $currentChat.messages )
        await Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } ),
        await GenerateMessage()
    }

    // adds a character to the recents list, or move it to the bottom if it already exists
    async function addToRecentCharacters(character : ICharacter){
        // parse the recents list if it exists in local storage
        const path : string = character.temp.filepath.replaceAll("../user/characters/", "")
        if( !$currentSettingsMain.recents || !Array.isArray( $currentSettingsMain.recents )){
            $currentSettingsMain.recents = []
        }
        if ( $currentSettingsMain.recents.at(-1) === path ){
            return
        }
        const index = $currentSettingsMain.recents.findIndex((item : string) => item === path)
        if( index > -1 ){
            $currentSettingsMain.recents.splice(index, 1)
        }
        $currentSettingsMain.recents.push(path)
        await Server.request("/save_main_settings", { data: $currentSettingsMain })
    }

    function fetchLorebooks(){
        return $currentSettingsMain.books?.map(
            (entry : string) => $currentLorebooks.find(book => book.temp.filepath == entry)
        ) ?? []
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

    export async function GenerateMessage(swipe = false){
        const mode = $currentSettingsMain.api_mode;
        let body = {
            api_mode: mode,
            character: $currentCharacter,
            chat: $currentChat,
            user: $currentProfile,
            settings: $currentSettingsAPI,
            books: fetchLorebooks(),
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
        document.dispatchEvent(new CustomEvent("chatscroll"))

        await addToRecentCharacters($currentCharacter)
        await cacheMessageTokens()

        await fetch( localServer + "/generate", options ).then(async response => {
            if( streaming ){
                const stream = response.body.pipeThrough( new TextDecoderStream() );
                const reader = stream.getReader()
                console.debug( "Awaiting stream..." )
                let candidate = ReceiveStream(swipe)

                function processText({ done, value }){
                    if(done || (value && value.done)){
                        candidate.timer = new Date().getTime() - requestTime;
                        candidate.text = Format.regexReplace(candidate.text, [ "on_reply" ], $currentSettingsMain.formatting.replace )
                        candidate.text = Format.parseMacros(candidate.text, $currentChat)
                        $currentChat = $currentChat;

                        console.debug( "Received stream: %o", candidate )
                        document.dispatchEvent(new CustomEvent("chatscroll"))
                        Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter })
                        return;
                    }

                    const lines = value.split('\n').filter((line: string) => line.trim() !== '');
                    for( const line of lines ){
                        try{
                            const obj = JSON.parse(line)
                            if( obj.streaming ){
                                candidate.timestamp = obj.streaming.timestamp
                                if( obj.replace ){
                                    candidate.text = obj.streaming.text
                                }else{
                                    candidate.text += obj.streaming.text
                                }
                                if( obj.streaming.model ){
                                    candidate.model = obj.streaming.model
                                }else if( $currentSettingsAPI.model ){
                                    candidate.model = $currentSettingsAPI.model
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
                        document.dispatchEvent(new CustomEvent("chatscroll"))
                        $currentChat = $currentChat;
                    }

                    return reader.read().then(processText)
                }
                return reader.read().then(processText)
            }else{
                response.json().then(async data => {
                    console.debug("Received message: %o", data)
                    if( data.error ){
                        alert(`${data.error.type}\n${data.error.message}`)
                    }else{
                        ReceiveMessage( data )
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

    function AbortMessage(){
        if(!$busy) return;
        abortController.abort()
        abortController = new AbortController()
        abortSignal = abortController.signal
        $busy = false;
    }

    function ReceiveStream(swipe = false) : ICandidate{
        let candidate = {
            text: "",
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
                candidates: [ candidate ],
            })
        }
        $currentChat.last_interaction = Date.now()
        $currentChat = $currentChat;
        return candidate;
    }

    function ReceiveMessage(incoming : IReply){
        console.debug($currentChat.messages)
        incoming.candidate.text = Format.regexReplace(incoming.candidate.text, [ "on_reply" ], $currentSettingsMain.formatting.replace )
        incoming.candidate.text = Format.parseMacros(incoming.candidate.text, $currentChat)
        incoming.candidate.timer = Date.now() - requestTime;

        if( incoming.swipe ){
            let last = $currentChat.messages.at(-1)
            if( last.participant > -1 ){
                last.candidates.push(incoming.candidate)
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
        document.dispatchEvent(new CustomEvent("chatscroll"))
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
                $currentChat = $currentChat;
                await GenerateMessage(true);
            }else{
                $currentChat.messages.pop()
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

    function ChangeChatTitle(){
        let new_title = prompt("Insert the new chat title", $currentChat.title)
        if( new_title ){
            $currentChat.title = new_title
            Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } )
        }
    }

    function Shortcuts(event : KeyboardEvent){
        if( event.key === "Escape"){
            AbortMessage()
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

<div class="container">
    {#if $currentPreferences["enable_background"]}
        <Background/>
    {/if}

    <div class="chat">
        {#if !$history}
            <div class="messages" class:disabled={$busy} class:deselect={$busy} use:ChatScroll>
                {#if $currentChat != null}
                    {#each $currentChat.messages as _, i}
                        <Message id={i} generateSwipe={()=>GenerateMessage(true)}/>
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
                <div class="options-group" use:clickOutside on:outclick={() => { chatOptions = false; }}>
                <button class="normal side options" on:click={ToggleChatOptions}>{@html SVG.menu}</button>

                {#if chatOptions}
                    <div class="options-list">
                        {#if $currentChat}
                        <button class="options-item normal title" on:click={ChangeChatTitle}>{@html SVG.chat}<div><p class="subtitle">Current chat</p><p class="name">{$currentChat.title}</p></div></button>
                        {/if}
                        <button class="options-item normal" on:click={() => ChatHistory(true)}>{@html SVG.history}Chat History</button>
                        <button class="options-item normal" on:click={Server.newChat}>{@html SVG.window}New Chat</button>
                        <hr>
                        <button class="options-item normal" on:click={RegenerateMessage}>{@html SVG.reload}Regenerate<span class="shortcut">Ctrl+Space</span></button>
                        <button class="options-item danger" on:click={SetDeleteMessages}>{@html SVG.trashcan}Delete Messages</button>
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

            {#if $busy}
                <button class="abort danger side" on:click={AbortMessage}>Abort Message {@html SVG.stop}</button>
            {/if}
        {/if}

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
        border-radius: 5px;
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
        height: min-content;
        position: absolute;
        right: 20px;;
        bottom: 8px;
        gap: 4px;
        font-size: 75%;
    }

    .abort :global(svg){
        width: 16px;
        height: 16px;
    }

    .options-list{
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

    .options-list hr{
        margin: 8px 12px;
        border-color: #80808040;
    }

    .options-item{
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

    .options-item:hover{
        background-color: hsl(0, 0%, 20%);
    }

    .options-item:is(.normal):hover{
        color: white;
    }

    .options-item:disabled{
        color: hsl(0, 0%, 40%);
        pointer-events: none;
    }

    .title{
        font-size: 0.75em;
    }

    .subtitle{
        opacity: 0.5;
    }

    .options-list .name{
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
</style>