<script lang="ts">
    import { marked } from 'marked';
    import { arrow, dots, copy, trashcan, edit } from "./utils/SVGCollection.svelte"
    import { AutoResizeTextArea } from './utils/AutoResizeTextArea.svelte';
    import { currentProfile, currentCharacter } from './State';
    import { clickOutside } from './utils/ClickOutside.svelte';

    const marked_renderer = new marked.Renderer();
    marked_renderer.del = function(text : string){ return "~" + text + "~"; };
    marked_renderer.pre = function(text : string){ return text; };
    marked_renderer.code = function(text : string){ return text; };
    marked.setOptions({
        breaks: true,
        renderer: marked_renderer,
    })

    const date_options : Intl.DateTimeFormatOptions = {
        "hour12": false,
        "hourCycle": "h23",
        "year": "numeric",
        "month": "2-digit",
        "day": "2-digit",
        "hour": "2-digit",
        "minute": "2-digit",
    }

    export let id : number = -1
    export let is_bot : boolean = false
    export let author : string = ""
    export let index : number = 0
    export let avatar : string = ""
    export let selected : boolean = false
    export let candidates : ICandidate[] = [
        { text: "**Hello** world!", timestamp: 0 },
        { text: "foo **bar**!", timestamp: 0 },
    ]

    $: authorType = is_bot ? "bot" : "user"
    $: displayText = parseNames( marked.parse(candidates[index].text), $currentProfile.name, $currentCharacter.name)

    let editing = false
    let postActions = false;

    function SwipeMessage(step : number){
        index += step;
        if(index < 0){
            index = 0;
        }

        if(index > candidates.length-1){
            index = candidates.length-1;
        }
    }

    function parseNames(text : string, user : string, bot : string){
        if(!text) return text;
        text = text.replaceAll("[NAME_IN_MESSAGE_REDACTED]", user)
        text = text.replaceAll("{{user}}", user)
        text = text.replaceAll("<USER>", user)
        text = text.replaceAll("{{char}}", bot)
        text = text.replaceAll("<BOT>", bot)
        return text
    }

    function GetFormattedDate(){
        var date = new Date(candidates[index].timestamp)
        return date.toLocaleString("ja-JP", date_options)
    }

    function TogglePostActions(){
        postActions = !postActions
    }

    function SetPostActions(b : boolean){
        postActions = b
    }

    function SetEditing(b : boolean){
        SetPostActions(false)
        editing = b
    }

    function CopyMessage(){
        SetPostActions(false)
        navigator.clipboard.writeText(candidates[index].text)
    }

    function DeleteMessage(){
        SetPostActions(false)
        if(window.confirm("Are you sure you want to delete this message?")){
            console.log(`Deleted message ${id}`)
        }
    }
</script>

<div class="msg {authorType}">
    <div class="avatar" style="background-image: url({encodeURIComponent(avatar)})"></div>
    <div class="content">
        <div class="author">
            <span class="name {authorType}">{author}</span>
            <span class="timestamp">{GetFormattedDate()}</span>
        </div>
        
        {#if editing}
            <textarea class="editing" use:AutoResizeTextArea>{candidates[index].text}</textarea>
            <div class="instruction">Escape to <span on:mousedown={() => SetEditing(false)}>Cancel</span>, Ctrl+Enter to <span on:mousedown={() => SetEditing(false)}>Confirm</span></div>
        {:else}
            <div class="text">{@html displayText}</div>
        {/if}


        {#if !editing}
            <div class="footer">
                <button class="more normal" use:clickOutside on:click={TogglePostActions} on:outclick={(e) => SetPostActions(false)}>
                    <div class="icon" title="More actions">{@html dots}</div>
                    <div class="actions {postActions ? "" : "hidden"}">
                        <button class="copy info" title="Copy text" on:click={CopyMessage}>{@html copy}</button>
                        <button class="edit confirm" title="Edit message" on:click={() => SetEditing(true)}>{@html edit}</button>
                        <button class="delete danger" title="Delete message" on:click={DeleteMessage}>{@html trashcan}</button>
                    </div>
                </button>

                {#if is_bot && id > 0}
                    <div class="swipes">
                        <button class="left normal" title="Previous candidate" on:click={() => SwipeMessage(-1)}>{@html arrow}</button>
                        <div class="count">{index+1} / {candidates.length}</div>
                        <button class="right normal" title="Next candidate" on:click={() => SwipeMessage(1)}>{@html arrow}</button>
                    </div>

                    <div class="ratings">
                        <button class="up">👍</button>
                        <button class="down">👎</button>
                    </div>
                {/if}
            </div>
        {/if}

        <input class="toggle hidden" type="checkbox" bind:checked={selected}>
    </div>
</div>


<style>
    .msg{
        position: relative; 
        min-width: 50%;
        margin: 4px;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid transparent;
        display: grid;
        grid-template-columns: var( --avatar-size) auto;
        column-gap: 12px;
        word-break: break-word;
    }
    
    .msg:first-child{
        margin-top: auto;
    }

    .msg:hover{
        background: rgb(128, 128, 128, 0.2);
    }

    .msg:hover.user{
        border-color: rgb(240, 240, 144);
    }

    .msg:hover.bot{
        border-color: rgb(135, 206, 235);
    }

    .author{
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0px 8px;
    }

    .author .name{
        margin-bottom: 4px;
        font-weight: 800;
    }

    .author .timestamp{
        font-weight: 400;
        font-size: 80%;
        color: gray;
    }

    .avatar{
        width: var( --avatar-size );
        height: var( --avatar-size );
        background: red;
        border-radius: 50%;
        background-size: cover;
        background-position: center;
    }

    .text :global(*){
        margin: 0px 0px 1em 0px;
    }

    .text :global(em){
        color: rgb(106, 135, 149);
    }

    .editing{
        width: calc( 100% - 20px );
        resize: none;
        padding: 8px;
    }

    textarea.editing{
        border: none;
        outline: none;
        color: #D0D0D0;
        font-size: 80%;
        background: #00000040;
        border-radius: 4px;
        margin: 8px 0px;
    }

    .instruction{
        color: gray;
        font-size: 85%;
    }

    .instruction span{
        color: var( --accent-color-normal );
        cursor: pointer;
    }

    .instruction span:hover{
        color: var( --accent-color-light )
    }

    .footer{
        height: 20px;
        width: 100%;
        position: relative;
        display: flex;
        flex-direction: row-reverse;
        justify-content: space-between;
    }

    .ratings{
        width: fit-content;
        visibility: hidden;
    }

    .swipes{
        display: grid;
        grid-template-columns: 32px auto 32px;
        visibility: hidden;
        align-items: center;
        gap: 4px;
    }

    .swipes .right{
        transform: scaleX(-1)
    }

    .swipes button{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .swipes :global(svg){
        width: 16px;
        width: 16px;
    }

    .swipes .count{
        text-align: center;
        overflow-x: visible;
        font-size: 90%;
        opacity: 0.25;
    }

    .msg .swipes button{
        padding: 0px;
    }

    .msg:hover .swipes{
        visibility: visible;
    }

    .more{
        width: 30px;
        height: 100%;
        background: #00000020;
        border-radius: 4px;
        visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;      
    }

    .more .icon{
        width: 16px;
        height: 16px;
    }

    .msg:hover .more{
        visibility: visible;
    }

    .actions{
        position: absolute;
        width: fit-content;
        height: fit-content;
        background: black;
        border-radius: 4px;
        box-shadow: 0px 3px 0px #00000020;
        display: flex;
        flex-direction: row-reverse;
        translate: 0px -40px;
        gap: 4px;
        right: 0px;
    }

    .more:focus .actions{
        display: flex;
    }

    .actions button{
        width: 40px;
        height: 36px;
        border-radius: 2px;
    }

    .actions button :global(svg){
        width: 20px;
        height: 20px;
    }

    .actions button:hover {
        background: #00000040;
    }

    .toggle{
        position: absolute;
        top: 12px;
        right: 12px;
        width: 20px;
        height: 20px;
    }
</style>