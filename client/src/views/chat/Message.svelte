<script lang="ts">
    import {
        currentProfile,
        currentPreferences,
        currentCharacter,
        currentChat,
        busy,
        deleting,
        deleteList,
        fetching,
        editing,
        sectionSettings,
        tabSettings,
        tabEditing,
        editList,
        currentSettingsMain,
        generating,
        swipes
    } from '@/State';

    import Avatar from '@/components/Avatar.svelte';
    import Content from './Content.svelte';

    import * as Actions from "@/modules/Actions";
    import * as Dialog from "@/modules/Dialog.ts";
    import * as Server from '@/Server';
    import * as Format from "@shared/format.ts";
    import * as SVG from "@/svg/Common.svelte"

    import { clamp } from '@/utils/Math';
    import { AutoResize } from '@/utils/AutoResize';
    import { clickOutside } from '@/utils/ClickOutside';

    let self : HTMLElement;
    let actions : boolean = false;
    let actionsButton : HTMLElement;
    let editText = ""

    export let id : number = -1
    export let swipeAction = () => {}

    // basic
    $: msg = $currentChat?.messages[id];
    $: is_bot = msg ? msg.participant > -1 : false;

    $: first = id === 0;
    $: last = id === $currentChat.messages.length - 1;

    // author
    $: author = msg && msg.participant > -1 ? $currentCharacter.data.name : $currentProfile.name;
    $: authorType = is_bot ? "bot" : "user"

    // swipe
    $: index = msg ? clamp(msg.index, 0, msg.candidates?.length || 0) : 0;
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
    $: lockinput = !$currentChat || $fetching || $busy || $generating || Dialog.isOpen() || Actions.isOpen()

    // prefs
    $: prefs_show_datetime = $currentPreferences["show_datetime"] ?? false
    $: prefs_show_model = $currentPreferences["show_model"] ?? false
    $: prefs_show_timer = $currentPreferences["show_timer"] ?? false

    // ---
    $: isEditing = $editList && $editList.includes(msg)

    $: if(actions){
        editText = current?.text
    }

    export async function SwipeMessage(step : number){
        if( first && candidates.length === 1){
            return;
        }

        $currentChat.messages[id].index += step;
        if($currentChat.messages[id].index < 0){
            $currentChat.messages[id].index = 0;
            return;
        }
        if( last ){
            document.dispatchEvent(new CustomEvent("autoscroll"))
        }
        if($currentChat.messages[id].index > candidates.length-1){
            $currentChat.messages[id].index = candidates.length-1;
            if(!first && id === $currentChat.messages.length-1){
                swipeAction();
            }
        }else if(msg.id){
            $busy = true;
            await Server.request("/swipe_message", {
                message: $currentChat.messages[id],
                index: $currentChat.messages[id].index
            })
            $busy = false;
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
            this.actions = b;
        }else{
            actions = b;
        }
        if( b ){
            Actions.open(actionsButton, msg, id)
        }else{
            Actions.close()
        }
    }

    function togglePostActions(){
        SetPostActions(!actions)
    }

    function CancelEditing(){
        if( last && isEditing ){
            document.body.dispatchEvent(new CustomEvent("autoscroll"))
        }
        isEditing = false;
    }

    export async function confirmEdit(){
        $busy = true;
        await Server.confirmMessageEdit(msg, editText, $currentSettingsMain.formatting.replace)
        self.scrollIntoView({ block: "nearest" })
        $busy = false;
    }

    function setSwipeView(){
        $swipes = msg;
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

        let activeElement = document.activeElement;
        if( isEditing ){
            EditingShortcuts(event)
            return
        }

        if( last || (first && $currentChat.messages.length === 1)){
            if( activeElement.nodeName !== "INPUT" && activeElement.nodeName !== "TEXTAREA" ){
                await LastMessageShortcuts(event)
            }
        }
    }

    function EditingShortcuts(event : KeyboardEvent){
        switch(event.key){
            case "Escape":
                Server.cancelMessageEdit(msg);
                break;
            case "Enter":
                const condition = $currentPreferences["enter_sends_message"] ?? false
                if(event.shiftKey !== condition){
                    confirmEdit()
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
                editText = current?.text;
                Server.startMessageEdit(msg);
                break;
            case "ArrowLeft":
                event.preventDefault()
                await SwipeMessage(-1);
                break;
            case "ArrowRight":
                event.preventDefault()
                await SwipeMessage(1);
                break;
            case "Delete":
                event.preventDefault()
                await Server.deleteCandidate(id, index);
                break;
            default:
                break;
        }
    }
</script>


<svelte:body on:keydown={Shortcuts} on:startedit={CancelEditing}/>

<div class="msg {authorType}" class:delete={$deleting && selected} class:disabled={$busy} inert={actions} bind:this={self}>

    <button class="avatar" on:click={EditCharacter}>
        <Avatar size={54} is_bot={is_bot} character={$currentCharacter}/>
    </button>


    <div class="content">
        <div class="section wide horizontal">
            <div class="author" class:blocked={!msg?.id || !current?.id}>
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
            <span class="sub index" title={`Message: ${msg?.id}\nCandidate: ${current?.id}`}>#{id+1}</span>
        </div>

        {#if isEditing }
            <div class="section editing">
                <p class="explanation">Editing message</p>
                <!-- svelte-ignore a11y-autofocus -->
                <textarea autofocus use:AutoResize={{ container: self }} bind:value={editText}></textarea>
                <div class="section horizontal wrap">
                    <button on:click={() => Server.cancelMessageEdit(msg)} class="component borderless danger">{@html SVG.close} Cancel</button>
                    <button on:click={confirmEdit} class="component borderless confirm">{@html SVG.confirm} Confirm</button>
                </div>
            </div>
        {:else}
            <div class="text">
            <Content
                author={author}
                content={displayText}
                reasoning={displayReasoning}
                user={$currentProfile.name}
                bot={$currentCharacter.data.name}
                chat={$currentChat}
            />
            </div>
        {/if}


        {#if !isEditing}
            <div class="footer" class:hidden={isEditing} inert={actions}>
                <button class="dots normal" disabled={actions} bind:this={actionsButton} use:clickOutside on:click={togglePostActions} on:clickout={() => SetPostActions(false)}>
                    <div class="icon" title="More actions">{@html SVG.dots}</div>
                </button>

                {#if is_bot && (id > 0 || (id === 0 && candidates.length > 1))}
                    {@const isGreeting = id === 0}
                    {@const isLastCandidate = index >= candidates.length - 1}
                    {@const swipeBlocked = (!last && isLastCandidate) || (isGreeting && isLastCandidate )}

                    <div class="swipes">
                        <button class="left normal" class:invisible={index < 1} title="Previous candidate" on:click={async () => await SwipeMessage(-1)}>{@html SVG.arrow}</button>
                        <button class="count normal" on:click={setSwipeView}>{index+1} / {candidates.length}</button>
                        <button class="right normal" class:invisible={swipeBlocked} title="Next candidate" on:click={async () => await SwipeMessage(1)}>
                            {#if !isGreeting && isLastCandidate}
                                {@html SVG.plus}
                            {:else}
                                {@html SVG.arrow}
                            {/if}
                        </button>
                    </div>

                   <div class="extras">
                        <!-- <button class="favorite normal special">{@html SVG.star}</button> -->
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

    .msg:hover, .msg[inert]{
        background: rgb(128, 128, 128, 0.1);
    }

    :global(body.light) .msg:hover{
        background: rgb(255, 255, 255, 0.5);
    }

    .msg:hover.user, .msg[inert].user{
        border-color: rgb(240, 240, 144);
    }

    .msg:hover.bot, .msg[inert].bot{
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

    .text{
        width: 100%;
        margin-bottom: 1em;
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
        color: var( --content-primary-100 );
        font-weight: 400;
        font-size: 0.8em;
    }

    .editing .explanation{
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
        color: var( --code-color-text );
        font-size: 80%;
        overflow-y: hidden;
        background: var( --code-color-background );
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

    .msg:hover .extras, .msg:hover .swipes, .msg:hover .dots,
    .footer[inert] .extras, .footer[inert] .swipes, .footer[inert] .dots{
        visibility: visible;
    }

    .extras{
        width: fit-content;
        visibility: hidden;
        display: flex;
        align-items: center;
    }

    .extras .id{
        font-size: 0.75em;
        white-space: nowrap;
        width: 0px;
    }


    .swipes{
        display: flex;
        visibility: hidden;
        color: gray;
        height: 100%;
        gap: 8px;
        align-items: center;
        justify-content: center;
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
    }

    .swipes .count{
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsla(0, 0%, 0%, 0.2);
        word-spacing: 0.25em;
        font-size: 0.8rem;
        font-weight: bold;
        min-width: 80px;
        width: fit-content;
        padding: 4px 12px;
        border-radius: 100px;
    }

    .swipes .left, .swipes .right{
        min-width: 40px;
        padding: 0px;
    }

    .swipes .right{
        transform: scaleX(-1)
    }

    .dots{
        width: 36px;
        height: 20px;
        background: hsla(0, 0%, 0%, 0.2);
        border-radius: 100px;
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
        box-shadow: 0px 2px 0px hsla(0, 0%, 0%, 0.2);
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