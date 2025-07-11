<script lang="ts">
    import { AutoResize } from '@/utils/AutoResize';
    import {
        currentProfile,
        currentPreferences,
        currentSettingsMain,
        currentCharacter,
        currentChat,
        busy,
        deleting,
        deleteList,
        fetching,
        editing,
        sectionSettings,
        tabSettings,
        tabEditing
    } from '@/State';
    import { clickOutside } from '@/utils/ClickOutside';
    import Avatar from '@/components/Avatar.svelte';
    import Content from './Content.svelte';
    import * as Dialog from "@/modules/Dialog.ts";
    import * as Server from '@/Server';
    import * as Format from "@shared/format.ts";
    import * as SVG from "@/svg/Common.svelte"
    import { tick } from 'svelte';
    import { get } from 'svelte/store';

    let self : HTMLElement;

    export let id : number = -1
    export let generateSwipe = () => {}

    // basic
    $: msg = $currentChat && $currentChat.messages ? $currentChat.messages[id] : null;
    $: is_bot = msg ? msg.participant > -1 : false;

    $: first = id === 0;
    $: last = id === $currentChat.messages.length - 1;

    // author
    $: author = msg && msg.participant > -1 ? $currentChat.participants[msg.participant] : $currentProfile.name;
    $: authorType = is_bot ? "bot" : "user"

    // swipe
    $: index = msg ? msg.index : 0;
    $: candidates = msg && msg.candidates ? msg.candidates : []
    $: current = candidates && candidates.length > 0 ? candidates[index] : null;
    $: displayReasoning = current ? current.reasoning : ""
    $: displayText = current ? current.text : ""

    $: relative_time = current ? Format.relativeTime(current.timestamp) : "";
    $: date_time = current ? new Date(current.timestamp).toLocaleString() : "";
    $: model = current && current.model ? current.model : "Unknown model";
    $: timer = current && current.timer ? (current.timer / 1000) : 0;

    // deletion
    $: selected = $deleteList.indexOf(id) > -1;
    $: lockinput = !$currentChat || $fetching || $busy

    // prefs
    $: prefs_show_datetime = $currentPreferences["show_datetime"] ?? false
    $: prefs_show_model = $currentPreferences["show_model"] ?? false
    $: prefs_show_timer = $currentPreferences["show_timer"] ?? false

    // ---
    let isEditing = false
    let postActions = false;
    let editedText = ""

    export function SwipeMessage(step : number){
        if( first && candidates.length === 1){
            return;
        }

        if( last ){
            document.dispatchEvent(new CustomEvent("autoscroll"))
        }

        $currentChat.messages[id].index += step;
        if($currentChat.messages[id].index < 0){
            $currentChat.messages[id].index = 0;
        }

        if($currentChat.messages[id].index > candidates.length-1){
            $currentChat.messages[id].index = candidates.length-1;
            if(!first && id === $currentChat.messages.length-1){
                generateSwipe();
            }
        }
    }

    function EditCharacter(){
        if(is_bot){
            if( $currentCharacter ){
                $editing = $currentCharacter;
                $tabEditing = 0;
            }
        }else{
            $sectionSettings = true;
            $tabSettings = "user"
        }
    }

    function SetPostActions(b : boolean){
        // small hack to allow deletion via action buttons and keyboard event
        if(this){
            this.postActions = b;
        }else{
            postActions = b;
        }
    }

    function TogglePostActions(){
        SetPostActions(!postActions)
    }

    function CancelEditing(){
        if( last && isEditing ){
            document.body.dispatchEvent(new CustomEvent("autoscroll"))
        }
        isEditing = false;
    }

    async function StartEditing(){
        document.body.dispatchEvent(new CustomEvent("startedit", { detail: { id: index }}))
        editedText = current.text;
        isEditing = true
        await tick()
        SetPostActions(false)
        self.scrollIntoView({ block: "nearest" })
    }

    export function ConfirmEdit(){
        CancelEditing()
        editedText = editedText.trim()
        if( !editedText ){
            DeleteCandidate();
        }else{
            editedText = Format.regexReplace(editedText, [ "on_edit" ], $currentSettingsMain.formatting.replace)
            editedText = Format.randomReplace(editedText)
            $currentChat.messages[id].candidates[index].text = editedText;
            $currentChat.messages[id].candidates[index].tokens = {}
            $currentChat = $currentChat;
            self.scrollIntoView({ block: "nearest" })
        }
        Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } )
    }

    async function CopyMessage(){
        SetPostActions(false)
        navigator.clipboard.writeText(current.text).then(async function(){
            await Dialog.alert("OgreAI", 'Text copied to clipboard!');
        }).catch(async function(err) {
            console.error('Failed to copy text: ', err);
            await Dialog.alert("OgreAI", 'Failed to copy text to clipboard.\n' + err);
        });

    }

    export async function DeleteCandidate(){
        if( first ){
            return;
        }

        SetPostActions(false)
        const ok = await Dialog.confirm("OgreAI", "Are you sure you want to delete this message?")
        if( ok ){
            $currentChat.messages[ id ].candidates.splice( index, 1 )
            // console.log(`Deleted candidate at message index ${id}, swipe ${index}`)

            let num_candidates = $currentChat.messages[id].candidates.length;
            if( num_candidates < 1 ){
                $currentChat.messages.splice( id, 1 )
            }else{
                index = Math.max(0, Math.min( index, num_candidates-1 ))
                $currentChat.messages[ id ].index = index;
            }

            $currentChat = $currentChat;
            Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter })

            if( last ){
                document.dispatchEvent(new CustomEvent("autoscroll"))
            }
        }
    }

    async function BranchChat(){
        const new_name = await Dialog.prompt("OgreAI", "Create a new chat from start until this message?\nYou can assign a chat title in the following field:")
        if(new_name !== null){
            $fetching = true;
            let branch = JSON.parse( JSON.stringify( $currentChat ))
            branch.messages = branch.messages.slice(0, id + 1)
            let last = branch.messages.at(-1)
            last.candidates = [last.candidates[last.index]];
            last.index = 0

            let result = await Server.request("/copy_chat", { character: $currentCharacter, chat: branch, name: new_name })
            if( result ){
                await Server.getChatList( $currentCharacter, true )
                await Dialog.alert("OgreAI", "Successfully branched chat!")
                $fetching = false;
            }else{
                $fetching = false;
            }
        }
    }

    function SelectMessageBatch(){
        if( !$deleting ){
            return
        }

        $deleteList = []
        for( let i = id; i < $currentChat.messages.length; i++ ){
            $deleteList.push(i)
        }
        $deleteList.sort()
    }

    function SelectMessageSingle(){
        if( !$deleting ){
            return
        }

        let _found = $deleteList.indexOf(id);
        if( _found > -1 ){
            $deleteList.splice(_found, 1)
        }else{
            $deleteList.push(id)
        }
        $deleteList.sort()
    }

    async function Shortcuts(event : KeyboardEvent){
        if( lockinput ){
            return;
        }

        if( Dialog.isOpen() ){
            return
        }

        let activeElement = document.activeElement;

        if( isEditing ){
            EditingShortcuts(event)
            return
        }

        if( last ){
            if( activeElement.nodeName !== "INPUT" && activeElement.nodeName !== "TEXTAREA" ){
                await LastMessageShortcuts(event)
            }
        }
    }

    function EditingShortcuts(event : KeyboardEvent){
        switch(event.key){
            case "Escape":
                CancelEditing();
                break;
            case "Enter":
                const condition = $currentPreferences["enter_sends_message"] ?? false
                if(event.shiftKey !== condition){
                    ConfirmEdit()
                }
                break;
            default:
                break;
        }
    }

    async function LastMessageShortcuts(event : KeyboardEvent){
        switch(event.key){
            case "ArrowUp":
                event.preventDefault()
                StartEditing();
                break;
            case "ArrowLeft":
                event.preventDefault()
                SwipeMessage(-1);
                break;
            case "ArrowRight":
                event.preventDefault()
                SwipeMessage(1);
                break;
            case "Delete":
                event.preventDefault()
                await DeleteCandidate();
                break;
            default:
                break;
        }
    }
</script>


<svelte:body on:keydown={Shortcuts} on:startedit={CancelEditing}/>

<div class="msg {authorType}" class:delete={$deleting && selected} class:disabled={$busy} bind:this={self}>

    <button class="avatar" on:click={EditCharacter}>
        <Avatar size={54} is_bot={is_bot} character={$currentCharacter}/>
    </button>


    <div class="content">
        <div class="section wide horizontal">
            <div class="author">
                <span class="name {authorType}">{author}</span>

                {#if prefs_show_datetime}
                    <span class="sub" title={date_time}>{relative_time}</span>
                {/if}

                {#if is_bot && prefs_show_model}
                    {@const botmaker = $currentCharacter.data.creator}
                    <span class="sub">&middot;</span>
                    {#if id > 0}
                        <span class="sub">{model}</span>
                    {:else}
                        <span class="sub">{botmaker ? `@${botmaker.toLowerCase()}` : "Unknown creator"}</span>
                    {/if}
                {/if}

                {#if id > 0 && is_bot && prefs_show_timer}
                    {@const digits = timer > 0 ? 2 : 0}
                    <span class="sub">({timer.toFixed(digits) + "s"})</span>
                {/if}

            </div>
            <span class="sub index"># {id+1}</span>
        </div>

        {#if isEditing}
            <div class="section editing">
                <p class="explanation">Editing message</p>
                <!-- svelte-ignore a11y-autofocus -->
                <textarea autofocus use:AutoResize={{ container: self }} bind:value={editedText}></textarea>
                <div class="section horizontal wrap">
                    <button on:click={CancelEditing} class="component borderless danger">{@html SVG.close} Cancel</button>
                    <button on:click={ConfirmEdit} class="component borderless confirm">{@html SVG.confirm} Confirm</button>
                </div>
            </div>
        {:else}
            <Content
                author={author}
                content={displayText}
                reasoning={displayReasoning}
                user={$currentProfile.name}
                bot={$currentCharacter.data.name}
                chat={$currentChat}
            />
        {/if}


        {#if !isEditing}
            <div class="footer" class:hidden={isEditing}>
                <button class="dots normal" disabled={postActions} use:clickOutside on:click={TogglePostActions} on:clickout={() => SetPostActions(false)}>
                    <div class="icon" title="More actions">{@html SVG.dots}</div>
                        {#if postActions}
                        <div class="actions">
                            <button class="copy {navigator.clipboard ? "info" : "normal"}" class:disabled={!navigator.clipboard} disabled={!navigator.clipboard} title="Copy text" on:click={CopyMessage}>{@html SVG.copy}</button>
                            <button class="edit confirm" title="Edit message" on:click={StartEditing}>{@html SVG.edit}</button>
                            {#if id > 0}
                                <button class="branch special" title="Branch from this message" on:click={BranchChat}>{@html SVG.split}</button>
                                <button class="delete danger" title="Delete message" on:click={DeleteCandidate}>{@html SVG.trashcan}</button>
                            {/if}
                        </div>
                    {/if}
                </button>

                {#if is_bot && (id > 0 || (id === 0 && candidates.length > 1))}
                    <div class="swipes">

                        <button class="left normal" class:invisible={index < 1} title="Previous candidate" on:click={() => SwipeMessage(-1)}>{@html SVG.arrow}</button>
                        <div class="count deselect">{index+1} / {candidates.length}</div>
                        <button class="right normal" class:invisible={id === 0 && index >= candidates.length - 1} title="Next candidate" on:click={() => SwipeMessage(1)}>{@html SVG.arrow}</button>
                    </div>

                   <div class="extras">
                        <!-- <button class="up">👍</button>
                        <button class="down">👎</button> -->
                    </div>
                {/if}
            </div>
        {/if}

    </div>

    {#if $deleting && id > 0}
        <button class="all" on:click|self={SelectMessageBatch} ></button>
        <input class="toggle pointer" type="checkbox" bind:checked={selected} on:input={SelectMessageSingle}>
    {/if}
</div>

<style>
    .msg{
        position: relative;
        min-width: 50%;
        margin: 4px;
        scroll-margin: 8px;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid transparent;
        display: grid;
        grid-template-columns: var( --avatar-size) auto;
        gap: 12px;
        word-break: break-word;
    }

    .msg:first-child{
        margin-top: auto;
    }

    .msg:hover{
        background: rgb(128, 128, 128, 0.1);
    }

    :global(body.light) .msg:hover{
        background: rgb(255, 255, 255, 0.5);
    }

    .msg:hover.user{
        border-color: rgb(240, 240, 144);
    }

    .msg:hover.bot{
        border-color: rgb(135, 206, 235);
    }

    .msg:hover .index{
        visibility: visible;
    }

    .msg.delete, .msg:hover.delete{
        background: rgba(255,64,64,0.1);
        border-color: rgb(255,72,72);
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .avatar{
        display: flex;
        align-items: start;
        height: min-content;
        padding: 0px;
    }

    .avatar:hover{
        filter: brightness(1.075);
    }

    .author{
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0px 6px;
    }

    .name{
        font-weight: 800;
    }

    .index{
        margin-left: auto;
        visibility: hidden;
        text-wrap: nowrap;
    }

    .sub{
        font-weight: 400;
        font-size: 0.8em;
        color: gray;
    }

    .editing .explanation{
        color: gray;
        font-size: 80%;
        font-weight: bolder;

    }

    .editing textarea{
        box-sizing: border-box;
        padding: 8px;
        width: 100%;
        resize: none;
        border: none;
        outline: none;
        color: var( --code-text-color );
        font-size: 80%;
        overflow-y: hidden;
        background: var( --code-bg-color );
        border-radius: 4px;
        margin: -4px 0px 0px 0px;
    }

    .editing button{
        font-size: 80%;
        padding: 0px 16px;
        min-height: 28px;
    }

    .editing button :global(svg){
        width: 12px;
        height: 12px;
    }

    .editing .horizontal{
        place-content: flex-end;
    }


    .footer{
        height: 24px;
        width: 100%;
        position: relative;
        display: flex;
        flex-direction: row-reverse;
        justify-content: space-between;
    }

    .msg:hover .extras, .msg:hover .swipes, .msg:hover .dots{
        visibility: visible;
    }

    .extras{
        width: fit-content;
        visibility: hidden;
        display: flex;
        align-items: center;
    }


    .swipes{
        display: flex;
        visibility: hidden;
        color: gray;
        height: 100%;
        align-items: center;
        justify-content: center;
    }

    .swipes .right{
        transform: scaleX(-1)
    }

    .swipes button{
        width: 40px;
        height: 100%;
        display: flex;
        place-content: center;
        place-items: center;
    }

    .swipes :global(svg){
        width: 20px;
        height: 20px;
        translate: 8px 0px;
    }

    .swipes .count{
        display: flex;
        align-items: baseline;
        justify-content: center;
        word-spacing: 0.25em;
        font-size: 0.8rem;
        width: 72px;
    }

    .swipes button{
        padding: 0px;
    }

    .dots{
        width: 30px;
        height: 20px;
        background: #00000020;
        border-radius: 4px;
        visibility: hidden;
        display: flex;
        place-items: center;
        place-content: center;
        align-self: center;
    }

    .dots .icon{
        width: 16px;
        height: 16px;
    }

    .actions{
        position: absolute;
        width: fit-content;
        height: fit-content;
        background: hsl(0, 0%, 10%);
        border-radius: 4px;
        box-shadow: 0px 2px 0px #00000020;
        display: flex;
        flex-direction: row-reverse;
        translate: 0px -40px;
        gap: 4px;
        right: 0px;
    }

    .dots:focus .actions{
        display: flex;
    }

    .actions button{
        width: 40px;
        height: 36px;
        border-radius: 4px;
    }

    .actions button.disabled{
        opacity: 0.5;
    }

    .actions button :global(svg){
        width: 20px;
        height: 20px;
    }

    .actions button:hover {
        background: hsl(0, 0%, 5%);
    }

    .toggle{
        position: absolute;
        top: 12px;
        right: 12px;
        width: 20px;
        height: 20px;
    }

    .all{
        position: absolute;
        width: 100%;
        height: 100%;
    }
</style>