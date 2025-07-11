<script lang="ts">
    import type { IChatMeta } from "@shared/types";
    import { currentCharacter, currentChat, currentProfile, fetching, history } from "@/State";
    import * as Dialog from "@/modules/Dialog.ts";
    import * as SVG from "@/svg/Common.svelte";
    import * as Server from '@/Server';
    import * as Format from "@shared/format.ts";
    import { tick } from 'svelte';
    import Text from './Content.svelte';

    export let chat : IChatMeta;
    let titleField : HTMLInputElement
    let editingTitle : boolean = false
    let open : boolean = false

    $: author = chat.last_message.participant > -1 ? $currentCharacter.data.name : $currentProfile.name
    $: created = chat.create_date || 0
    $: modified = chat.last_interaction || 0
    // chat meta only has 1 candidate despite storing the current index correctly
    $: candidate = chat.last_message?.candidates[0]

    function getFormattedDate(timestamp : number) : string{
        return new Date(timestamp).toLocaleString()
    }

    async function selectHistory(){
        $fetching = true;
        $currentChat = await Server.request( "/get_chat", { filepath: chat.filepath });
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
                character: $currentCharacter,
                chat: chat,
            })

            await Server.getChatList( $currentCharacter )
            $fetching = false;
        }
    }

    async function copyChat(){
        $fetching = true;
        let result = await Server.request("/copy_chat", { character: $currentCharacter, chat: chat })
        if( result ){
            await Server.getChatList( $currentCharacter )
            $fetching = false;
            await Dialog.alert("OgreAI", "Successfully copied chat!")
        }else{
            $fetching = false;
        }
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

    async function saveChanges(){
        await Server.request("/save_chat", { chat: chat, character: $currentCharacter })
        editingTitle = false;
    }

</script>

<div class="content">
    <div class="section data">
        <div class="title">
            <button class="normal" on:click|stopPropagation={/*toggleEditTitle*/ () => {}}>{@html SVG.edit}</button>
            {#if editingTitle}
                <!-- svelte-ignore a11y-autofocus -->
                <input type="text" class="edit borderless" autofocus bind:this={titleField} bind:value={chat.title} on:change={saveChanges}>
            {:else}
                <span class="label">{chat.title}</span>
            {/if}
        </div>

        <div class="sub explanation disabled">{chat.filepath.replaceAll("../user/", "")}</div>
        <div class="sub normal disabled">{`Created ${getFormattedDate(created)} (${Format.relativeTime(created, true).toLowerCase()})`}</div>
        <div class="sub info disabled"><strong>{chat.message_count}</strong> Messages</div>
    </div>

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
                    chat={chat}/>
            </div>
        </div>

        <button class="toggle" on:click={() => open = !open}/>
    </div>

    <div class="buttons">
        <button class="component left danger" title="Delete chat" on:click|stopPropagation={deleteChat}>{@html SVG.trashcan}</button>
        <button class="component left info" title="Duplicate chat" on:click|stopPropagation={copyChat}>{@html SVG.copy}</button>
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
        gap: 8px;
        text-align: left;
        border-left: 2px solid #808080;
    }

    :global(body.light) .content{
        background: color-mix(in srgb, #fff 50%, transparent );
    }

    .title{
        display: grid;
        gap: 4px;
        grid-template-columns: 24px 1fr;
        flex-direction: row;
        justify-content: left;
        height: 24px;
        font-weight: bolder;
        align-items: center;
        position: relative;
        margin-left: -4px;
    }

    .title button{
        width: 100%;
        height: 100%;
        padding: 0px;
        translate: 0px 2px;
    }

    .title :global(svg){
        width: 20px;
        height: 20px;
    }

    .edit{
        width: 100%;
        height: 24px;
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