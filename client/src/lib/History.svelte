<script lang="ts">
    import { marked } from 'marked';
    import { currentCharacter, currentChat, currentProfile, fetching, history } from "../State";
    import * as SVG from "../utils/SVGCollection.svelte";
    import * as Server from './Server.svelte';
    import * as Format from '../Format'
    import { tick } from 'svelte';

    export let chat : IChat;
    let titleField : HTMLInputElement
    let editingTitle = false

    $: last = chat ? chat.messages.at(-1) : null;
    $: index = last ? last.index : 0;
    $: author = last.participant > -1 ? $currentCharacter.data.name : $currentProfile.name

    function getFormattedDate(timestamp : number) : string{
        return new Date(timestamp).toLocaleString("ja-JP", Format.date_options)
    }

    async function selectHistory(){
        $currentChat = chat;
        $history = false;
        await tick()
        document.dispatchEvent(new CustomEvent("chatscroll"));
    }

    async function deleteChat(){
        if(window.confirm("Are you sure you want to delete this chat?")){
            $fetching = true;
            await Server.request("/delete_chat", { 
                character: $currentCharacter, 
                create_date: chat.create_date 
            })

            await Server.getChats( $currentCharacter )
            $fetching = false;
        }
    }

    async function copyChat(){
        $fetching = true;
        let result = await Server.request("/copy_chat", { character: $currentCharacter, chat: chat })
        if( result ){
            await Server.getChats( $currentCharacter )
            $fetching = false;
            window.alert("Successfully copied chat!")
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

<div class="base">
    <div class="title">
        <button class="normal" on:click|stopPropagation={toggleEditTitle}>{@html SVG.edit}</button>
        {#if editingTitle}
            <!-- svelte-ignore a11y-autofocus -->
            <input type="text" class="edit" autofocus bind:this={titleField} bind:value={chat.title} on:change={saveChanges}>
        {:else}
            <span class="label">{chat.title}</span>
        {/if}
    </div>

    <div class="data">
        <div class="sub normal disabled">{"Created:\n" + getFormattedDate(chat.create_date)}</div>
        <div class="sub info disabled"><strong>{chat.messages.length}</strong> Messages</div>
    </div>
    
    <hr>
    
    <div class="text">
        <div class="author">
            <span class="name">{author}</span>
            <span class="timestamp sub">{getFormattedDate(last.candidates[index].timestamp)}</span>
        </div>
        <div class="message disabled">
            {@html Format.parseNames( marked.parse(last.candidates[index].text), $currentProfile.name, $currentCharacter.data.name)}
        </div>
    </div>
    
    <hr>
    
    <div class="buttons">
        <button class="component svg danger" title="Delete chat" on:click|stopPropagation={deleteChat}>{@html SVG.trashcan}</button>
        <button class="component svg info" title="Duplicate chat" on:click|stopPropagation={copyChat}>{@html SVG.copy}</button>
        <span style="margin-left: auto"></span>
        <button class="component normal right" on:click|stopPropagation={selectHistory}>Continue chat</button>
    </div>
</div>

<style>
    .base{
        background: #00000024;
        display: flex;
        flex-direction: column;
        grid-template-columns: 200px auto;
        box-sizing: border-box;
        margin: 4px 8px;
        border-radius: 8px;
        padding: 20px;
        gap: 4px;
        text-align: left;
    }

    :global(body.light) .base{
        background: #00000012;
    }

    hr{
        width: 100%;
        color: gray;
        opacity: 0.1;
    }

    .title{
        display: flex;
        flex-direction: row;
        justify-content: left;
        gap: 8px;
        height: 24px;
        font-weight: bolder;
        align-items: flex-start;
        font-family: var( --default-font-face );
        position: relative;
    }

    .title button{
        width: 24px;
        height: 24px;
        margin: 0px;
        padding: 0px;
        position: absolute;
        left: -4px;
        top: 1px;
    }

    .title :global(svg){
        width: 20px;
        height: 20px;
        padding: 0px;
    }

    .label{
        margin: 0px;
        margin-top: 2px;
        margin-left: 24px;
    }
    
    .edit{
        width: 100%;
        height: 24px;
        resize: none;
        margin-left: 24px;
    }

    input[type="text"].edit{
        border: none;
        outline: none;
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
        font-size: 80%;
    }
    
    .timestamp{
        opacity: 0.5;
    }

    .data{
        display: flex;
        flex-direction: column;
    }

    .text{
        font-size: 90%;
        font-family: var( --default-font-face );
        text-align: left;
    }

    .message :global(p):not(:last-child){
        margin-bottom: 1em;
    }

    .message :global(code){
        color: orange;
        background: hsl(285, 5%, 12%);
        padding: 2px;
        font-size: 85%;
    }
    
    .message :global(pre){
        white-space: pre-wrap;
        background: hsl(285, 5%, 12%);
        padding: 8px;
        border-radius: 6px;
    }

    .buttons{
        margin-top: auto;
        display: flex;
        gap: 4px;
    }

    .buttons *{
        margin: 0px;
    }

    .svg{
        width: 32px;
        padding: 6px;
    }

    .svg :global(svg){
        width: 100%;
        height: 100%;
    }
    
</style>