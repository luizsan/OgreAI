<script lang="ts">
    import { marked } from 'marked';
    import { arrow, dots, copy, trash, edit } from "./utils/SVGCollection.svelte"

    const marked_renderer = new marked.Renderer();
    marked_renderer.del = function(text : string){ return "~" + text + "~"; };
    marked_renderer.pre = function(text : string){ return text; };
    marked_renderer.code = function(text : string){ return text; };
    marked.setOptions({
        breaks: true,
        renderer: marked_renderer,
    })

    interface Candidate{
        text : string;
        timestamp : number;
    }

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
    export let candidates : Candidate[] = [
        { text: "**Hello** world!", timestamp: 0 },
        { text: "foo **bar**!", timestamp: 0 },
    ]

    let editing = false
    let postActions = false;
    let actionsButton : HTMLElement;
    let actionsDiv : HTMLElement;

    function SwipeMessage(direction : number){
        index += direction;
        if(index < 0){
            index = 0;
        }

        if(index > candidates.length-1){
            index = candidates.length-1;
        }
    }

    function GetFormattedDate(){
        var date = new Date(candidates[index].timestamp)
        return date.toLocaleString("ja-JP", date_options)
    }

    function GetAuthorType(){
        return is_bot ? "bot" : "user"
    }

    function TogglePostActions(){
        postActions = !postActions
    }

    function SetPostActions(b: boolean){
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

    function HandleClick(e){
        const checkButton = actionsButton != null && !actionsButton.contains(e.target)
        const checkDiv = actionsDiv != null && !actionsDiv.contains(e.target)
        if(checkButton && checkDiv){
            postActions = false;
        }
    }
</script>

<svelte:body on:click={HandleClick} />

<div class="msg {GetAuthorType()}">
    <div class="avatar" style="background-image: url({avatar})"></div>
    <div class="content">
        <div class="author">
            <span class="name {GetAuthorType()}">{author}</span>
            <span class="timestamp">{GetFormattedDate()}</span>
        </div>
        
        {#if editing}
            <textarea class="editing">{candidates[index].text}</textarea>
            <div class="instruction">Escape to <span on:mousedown={() => SetEditing(false)}>Cancel</span>, Ctrl+Enter to <span on:mousedown={() => SetEditing(false)}>Confirm</span></div>
        {:else}
            <div class="text">{@html marked.parse(candidates[index].text)}</div>
        {/if}


        {#if !editing}
            <div class="footer">
                <button class="more normal" bind:this={actionsButton} on:click={TogglePostActions}>
                    <div class="icon" title="More actions">{@html dots}</div>
                </button>

                <div class="actions {postActions ? "" : "hidden"}" bind:this={actionsDiv}>
                    <button class="copy info" title="Copy text" on:click={CopyMessage}>{@html copy}</button>
                    <button class="edit confirm" title="Edit message" on:click={() => SetEditing(true)}>{@html edit}</button>
                    <button class="delete danger" title="Delete message" on:click={DeleteMessage}>{@html trash}</button>
                </div>

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
        margin-bottom: auto;
        padding: 12px;
        border-radius: 8px;
        border-left: 4px solid transparent;
        display: grid;
        grid-template-columns: var( --avatar-size) auto;
        column-gap: 12px;
        word-break: break-word;
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

    .author .name{
        margin-bottom: 4px;
        font-weight: 900;
    }

    .author .timestamp{
        margin: 0px 4px;
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
    }

    .text :global(*){
        margin: 0px;
    }

    .editing{
        width: calc( 100% - 20px );
        resize: vertical;
        padding: 8px;
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