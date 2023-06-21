<script lang="ts">
    import { marked } from 'marked';
    import { arrow, dots, copy, trashcan, edit } from "../utils/SVGCollection.svelte"
    import { AutoResize } from '../utils/AutoResize';
    import { currentProfile, currentCharacter, currentChat, busy, deleting, localServer, deleteList, fetching } from '../State';
    import { clickOutside } from '../utils/ClickOutside';
    import Avatar from '../components/Avatar.svelte';
    import * as Server from './Server.svelte';
    import * as Format from '../Format';

    let messageElement : HTMLElement;

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

    // message
    $: displayText = current ? Format.parseNames( marked.parse(current.text), $currentProfile.name, $currentCharacter.name) : ""
    $: timestamp = current ? new Date(current.timestamp).toLocaleString("ja-JP", Format.date_options) : 0

    // avatar
    const avatar_user_default = localServer + "/img/user_default.png";
    $: avatar_bot_url = localServer + "/" + $currentCharacter.metadata.filepath.replace("../", "")
    $: avatar_user_url = $currentProfile.avatar ? $currentProfile.avatar : avatar_user_default;
    $: append = is_bot ? "?" + $currentCharacter.last_changed : "";

    $: avatar = (msg && msg.participant > -1) ? avatar_bot_url : avatar_user_url;
    $: url = encodeURIComponent(avatar).replace(/%2F/g, '/').replace(/%3A/g, ':') + append;

    // deletion
    $: selected = $deleteList.indexOf(id) > -1;

    $: lockinput = !$currentChat || $fetching || $busy;

    // ---
    let editing = false
    let postActions = false;
    let editedText = ""

    export function SwipeMessage(step : number){
        if( first ){
            return;
        }

        if( last ){
            document.dispatchEvent(new CustomEvent("chatscroll"))
        }

        $currentChat.messages[id].index += step;
        if($currentChat.messages[id].index < 0){
            $currentChat.messages[id].index = 0;
        }

        if($currentChat.messages[id].index > candidates.length-1){
            $currentChat.messages[id].index = candidates.length-1;
            if(id === $currentChat.messages.length-1){
                generateSwipe();
            }
        }
    }

    function TogglePostActions(){
        postActions = !postActions
    }

    function SetPostActions(b : boolean){
        postActions = b
    }

    export function SetEditing(b : boolean){
        if(b){
            editedText = current.text
            messageElement.scrollIntoView({ block: "nearest" })
        }
        SetPostActions(false)
        editing = b
    }

    export function EditMessage(){
        SetEditing(false)
        editedText = editedText.trim()
        if( !editedText ){
            DeleteCandidate();
        }else{
            $currentChat.messages[id].candidates[index].text = editedText;
            $currentChat = $currentChat;
            messageElement.scrollIntoView({ block: "nearest" })
        }
        Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } )
    }

    async function CopyMessage(){
        postActions = false;
        await navigator.clipboard.writeText(current.text)
    }

    export function DeleteCandidate(){
        if( first ){
            return;
        }
        
        // small hack to allow deletion via action buttons and keyboard event
        if(this){
            this.postActions = false;
        }else{
            postActions = false;
        }

        if(window.confirm("Are you sure you want to delete this message?")){
            $currentChat.messages[ id ].candidates.splice( index, 1 )
            console.log(`Deleted candidate at message index ${id}, swipe ${index}`)

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
                document.dispatchEvent(new CustomEvent("chatscroll"))
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

    function Shortcuts(event : KeyboardEvent){
        if( lockinput ) return;
        if( !last ) return;
        if( editing ) return;

        let activeElement = document.activeElement;
        if( activeElement.nodeName === "INPUT" ) return;
        if( activeElement.nodeName === "TEXTAREA" ) return;

        switch(event.key){
            case "ArrowUp": 
                SetEditing(true);
                event.preventDefault()
                break;
            case "ArrowLeft": 
                SwipeMessage(-1);
                event.preventDefault()
                break;
            case "ArrowRight": 
                SwipeMessage(1); 
                event.preventDefault()
                break;
            case "Delete": 
                DeleteCandidate(); 
                event.preventDefault()
                break;
            default: 
                break;
        }
    }

</script>

<svelte:body on:keydown={Shortcuts}/>

<div class="msg {authorType}" class:delete={$deleting && selected} class:disabled={$busy} bind:this={messageElement}>
    <Avatar size={54} is_bot={is_bot} character={$currentCharacter}/>
    <div class="content">
        <div class="author">
            <span class="name {authorType}">{author}</span>
            <span class="timestamp">{timestamp}</span>
        </div>
        
        {#if editing}
            <textarea class="editing" use:AutoResize={editedText} bind:value={editedText}></textarea>
            <div class="instruction">
                Escape to <span on:mousedown={() => SetEditing(false)} class="info">Cancel</span>, 
                Ctrl+Enter to <span on:mousedown={EditMessage} class="info">Confirm</span>
            </div>
        {:else}
            <div class="text">{@html displayText}</div>
        {/if}


        {#if !editing}
            <div class="footer">
                <button class="dots normal" use:clickOutside on:click={TogglePostActions} disabled={postActions} on:outclick={() => SetPostActions(false)}>
                    <div class="icon" title="More actions">{@html dots}</div>
                        {#if postActions}
                        <div class="actions">
                            <button class="copy info" title="Copy text" on:click={CopyMessage}>{@html copy}</button>
                            <button class="edit confirm" title="Edit message" on:click={() => SetEditing(true)}>{@html edit}</button>
                            {#if id > 0}
                                <button class="delete danger" title="Delete message" on:click={DeleteCandidate}>{@html trashcan}</button>
                            {/if}
                        </div>
                    {/if}
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


    </div>

    {#if $deleting && id > 0}
        <button class="all" on:click|self={SelectMessageBatch} ></button>
        <input class="toggle" type="checkbox" bind:checked={selected} on:input={SelectMessageSingle}>
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
        column-gap: 12px;
        word-break: break-word;
    }
    
    .msg:first-child{
        margin-top: auto;
    }

    .msg:hover{
        background: rgb(128, 128, 128, 0.1);
    }

    .msg:hover.user{
        border-color: rgb(240, 240, 144);
    }

    .msg:hover.bot{
        border-color: rgb(135, 206, 235);
    }

    .msg.delete, .msg:hover.delete{
        background: rgba(255,64,64,0.1);
        border-color: rgb(255,72,72);
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

    .text :global(p){
        margin-bottom: 1em;
    }

    .text :global(em){
        color: rgb(106, 135, 149);
    }

    .text :global(code){
        background: hsl(285, 5%, 12%);
        padding: 2px;
        font-size: 85%;
    }

    .text :global(pre){
        white-space: pre-wrap;
        background: hsl(285, 5%, 12%);
        padding: 8px;
        border-radius: 6px;
    }

    .text :global(img){
        max-width: 100%;
    }

    .editing{
        box-sizing: border-box;
        width: 100%;
        resize: none;
        padding: 8px;
    }

    textarea.editing{
        border: none;
        outline: none;
        color: #D0D0D0;
        font-size: 80%;
        background: #404040;
        border-radius: 4px;
        margin: 8px 0px;
    }

    .instruction{
        color: gray;
        font-size: 85%;
    }

    .instruction span{
        cursor: pointer;
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
        color: gray;
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
    }

    .msg .swipes button{
        padding: 0px;
    }

    .msg:hover .swipes{
        visibility: visible;
    }

    .dots{
        width: 30px;
        height: 100%;
        background: #00000020;
        border-radius: 4px;
        visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;      
    }

    .dots .icon{
        width: 16px;
        height: 16px;
    }

    .msg:hover .dots{
        visibility: visible;
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
        cursor: pointer;
    }

    .all{
        position: absolute;
        width: 100%;
        height: 100%;
    }
</style>