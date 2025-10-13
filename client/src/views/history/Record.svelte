<script lang="ts">
    import { tick } from 'svelte';

    import type { IChat} from "@shared/types";

    import {
        characterList,
        chatList,
        currentCharacter,
        currentChat,
        currentProfile,
        fetching,
        history
    } from "@/State";

    import * as Dialog from "@/modules/Dialog.ts";
    import * as SVG from "@/svg/Common.svelte";
    import * as Server from '@/Server';
    import * as Format from "@shared/format.ts";
    import Text from '@/views/chat/Content.svelte';

    export let chat : IChat;
    export let display : string = "extended"

    $: displayLevel = () => {
        switch(display){
            case "list": return 0
            case "simple": return 1
            case "extended": return 2
            default: return 0
        }
    }

    let titleField : HTMLInputElement
    let editingTitle : boolean = false
    let open : boolean = false

    $: author = chat.messages.at(-1).participant > -1 ? $currentCharacter.data.name : $currentProfile.name
    $: created = chat.create_date || 0
    $: modified = chat.last_interaction || 0
    // chat meta only has 1 candidate despite storing the current index correctly
    $: candidate = chat.messages.at(-1)?.candidates[0]

    function getFormattedDate(timestamp : number) : string{
        return new Date(timestamp).toLocaleString()
    }

    async function selectHistory(){
        $fetching = true;
        // $currentChat = await Server.request( "/get_chat", { filepath: chat.filepath });
        $currentChat = await Server.request( "/load_chat", { id: chat.id});
        $history = false;
        $fetching = false;
        await tick()
        document.dispatchEvent(new CustomEvent("autoscroll"));
    }

    async function deleteChat(){
        const ok = await Dialog.confirm("OgreAI", "Are you sure you want to delete this chat?");
        if(ok){
            $fetching = true;
            await Server.request("/delete_chat", {
                id: chat.id,
            })
            await Server.listChats( $currentCharacter, true )
            await tick()
            $currentCharacter = $currentCharacter
            $characterList = $characterList
            $chatList = $chatList
            $fetching = false;
        }
    }

    async function duplicateChat(){
        $fetching = true;
        let new_id = await Server.request("/duplicate_chat", {
            chat: chat,
            title: `Copy of ${chat.title}`,
        })
        if( new_id ){
            const new_chat: IChat = await Server.request("/load_chat", { id: new_id })
            if(new_chat){
                $currentChat = new_chat
                Server.updateChats();
                await Dialog.alert("OgreAI", "Successfully copied chat!")
                $fetching = false;
                $history = false;
            }
        }
        $fetching = false;
    }

    function toggleEditTitle(){
        editingTitle = !editingTitle
        if( editingTitle ){
            selectTitleField();
        }
    }

    function selectTitleField(){
        if( titleField ){
            titleField.focus()
            titleField.select()
        }
    }

    async function updateTitle(){
        const success: boolean = await Server.request("/update_chat", { chat: chat })
        if( success ){
            editingTitle = false;
        }
    }

</script>

<div class="content {display}">
    <div class="section data">
        <div class="title">
            <button class="normal" on:click|stopPropagation={toggleEditTitle}>{@html SVG.edit}</button>
            {#if editingTitle}
                <!-- svelte-ignore a11y-autofocus -->
                <input type="text" class="edit borderless" autofocus bind:this={titleField} bind:value={chat.title} on:change={updateTitle}>
            {:else}
                <span class="label">{chat.title}</span>
            {/if}

            {#if displayLevel() <= 0}
                <span class="sub info disabled">({chat.length})</span>
            {/if}
        </div>

        {#if displayLevel() >= 2}
            <div class="sub explanation disabled">ID {chat.id}</div>
        {/if}

        {#if displayLevel() >= 1}
            <div class="sub normal disabled">{`Created ${getFormattedDate(created)} (${Format.relativeTime(created, true).toLowerCase()})`}</div>
            <div class="sub info disabled"><strong>{chat.length}</strong> Messages</div>
        {/if}
    </div>


    {#if displayLevel() >= 2}
        <hr class="component"/>
        <div class="text">
            <div class="author">
                <span class="name">{author}</span>
                <span class="timestamp">{`${getFormattedDate(modified)} (${Format.relativeTime(modified, true).toLowerCase()})`}</span>
            </div>

            <div class="message disabled" class:open={open}>
                <div class="contents">
                    <Text
                        content={candidate.text}
                        author={author}
                        user={$currentProfile.name}
                        bot={$currentCharacter.data.name}
                        chat={chat}
                    />
                </div>
            </div>

            <button class="toggle" on:click={() => open = !open}/>
        </div>
    {/if}

    <div class="buttons">
        <button class="component left danger" title="Delete chat" on:click|stopPropagation={deleteChat}>{@html SVG.trashcan}</button>
        <button class="component left info" title="Duplicate chat" on:click|stopPropagation={duplicateChat}>{@html SVG.copy}</button>
        <button class="component right normal continue" on:click|stopPropagation={selectHistory}>{@html SVG.chat} Continue chat</button>
    </div>
</div>

<style>
    .content{
        background: color-mix(in srgb, #111 50%, transparent );
        border-radius: 8px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        text-align: left;
        border-left: 2px solid #808080;
    }

    :global(body.light) .content{
        background: color-mix(in srgb, #fff 50%, transparent );
    }

    .content.list{
        flex-direction: row;
        padding: 8px 12px;
        gap: 12px;
    }

    .list .section.data{
        flex-shrink: 1;
        flex-grow: 1;
        min-width: 0px;
    }

    .title{
        display: flex;
        gap: 8px;
        height: 100%;
        flex-direction: row;
        font-weight: bolder;
        align-items: center;
        position: relative;

    }

    .list span.label{
        overflow: hidden;
        text-wrap: nowrap;
        text-overflow: ellipsis;
    }

    .title button{
        width: 20px;
        height: 20px;
        padding: 0px;
    }

    .title :global(svg){
        width: 20px;
        height: 20px;
    }

    .edit{
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 24px;
        top: 0px;
        bottom: 0px;
        color: #D0D0D0;
        font-size: 80%;
        background: #000000C0;
        border-radius: 4px;
        padding: 0px 6px;
        font-family: monospace;
    }

    .author{
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: 8px;
    }

    .name{
        font-weight: bolder;
    }

    .sub{
        font-size: 0.8em;
    }

    .timestamp{
        color: gray;
        font-size: 85%;
    }

    .data{
        gap: 0px;
    }

    .toggle{
        position: absolute;
        inset: 0px;
        width: 100%;
    }

    .text{
        position: relative;
        font-size: 90%;
    }

    .message{
        position: relative;
        display: flex;
        flex-direction: column;
    }

    .message:not(.open){
        overflow-y: hidden;
        max-height: 120px;
        mask-image: linear-gradient(180deg, black 50%, transparent );;
    }

    .buttons{
        margin-top: auto;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .list .buttons{
        flex-wrap: nowrap;
        align-self: flex-end;
    }

    .continue :global(svg){
        transform: scaleX(-1);
    }

    .left{
        width: 32px;
        padding: 0px;
    }

    .right{
        margin-left: auto;
    }
</style>