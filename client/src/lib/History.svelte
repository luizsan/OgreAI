<script lang="ts">
    import { currentCharacter, currentChat, currentProfile, history } from "../State";
    import * as SVG from "../utils/SVGCollection.svelte";

    export let chat : IChat;

    $: last = chat ? chat.messages.at(-1) : null;
    $: index = last ? last.index : 0;

    const date_options : Intl.DateTimeFormatOptions = {
        "hour12": false,
        "hourCycle": "h23",
        "year": "numeric",
        "month": "2-digit",
        "day": "2-digit",
        "hour": "2-digit",
        "minute": "2-digit",
    }

    function getFormattedDate(timestamp : number) : string{
        return new Date(timestamp).toLocaleString("ja-JP", date_options)
    }

    function selectHistory(){
        $currentChat = chat;
        $history = false;
    }

    function deleteChat(){

    }

    function copyChat(){

    }

</script>

<button class="base" on:click|preventDefault={selectHistory}>
    <div class="left">
        <div class="data">
            <div class="title">{chat.title}</div>
            <div class="sub normal disabled">{"Created:\n" + getFormattedDate(chat.created)}</div>
            <div class="sub normal disabled">{"Last message:\n" + getFormattedDate(chat.last_interaction)}</div>
            <div class="info disabled">{chat.messages.length} Messages</div>
        </div>
        <div class="buttons">
            <button class="action danger" title="Delete chat" on:click|stopPropagation={deleteChat}>{@html SVG.trashcan}</button>
            <button class="action info" title="Duplicate chat" on:click|stopPropagation={copyChat}>{@html SVG.copy}</button>
        </div>
    </div>
    <div class="right">
        <div class="author">{last.participant > -1 ? $currentCharacter.name : $currentProfile.name}:</div>
        <div class="message normal disabled">{last.candidates[index].text}</div>
    </div>
</button>

<style>
    .base{
        width: 100%;
        background: #00000040;
        display: grid;
        grid-template-columns: 150px auto;
        margin: 4px 0px;
        border-radius: 8px;
        font-size: 100%;
        padding: 12px;
        gap: 8px;
        text-align: left;
        font-family: var( --default-font-face );
    }
    
    .author, .title{
        font-weight: bolder;
    }

    .sub{
        font-size: 85%;
    }

    .data{
        display: flex;
        flex-direction: column;
    }

    .message{
        font-size: 90%;
    }

    .buttons{
        margin-top: auto;
    }

    .action{
        width: 32px;
        height: 32px;
        padding: 6px;
        background: #00000080;
        border-radius: 6px;
    }

    .action :global(svg){
        width: 100%;
        height: 100%;
    }

    .left{
        overflow-wrap: break-word;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
</style>