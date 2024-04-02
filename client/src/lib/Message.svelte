<script lang="ts">
    import { marked } from 'marked';
    import * as SVG from "../utils/SVGCollection.svelte"
    import { AutoResize } from '../utils/AutoResize';
    import { currentProfile, currentPreferences, currentCharacter, currentChat, busy, deleting, deleteList, fetching, editing, sectionSettings, tabSettings, tabEditing } from '../State';
    import { clickOutside } from '../utils/ClickOutside';
    import Avatar from '../components/Avatar.svelte';
    import * as Server from '../modules/Server.svelte';
    import * as Format from '../Format';
    import { tick } from 'svelte';

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

    // message
    $: displayText = current ? marked.parse(
        Format.parseNames(
            current.text, 
            $currentProfile.name, 
            $currentCharacter.data.name
        ).replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    ) : ""

    $: relative_time = current ? Format.relativeTime(current.timestamp) : "";
    $: date_time = current ? new Date(current.timestamp).toLocaleString() : "";
    $: model = current && current.model ? current.model : "Unknown model";
    $: timer = current && current.timer ? (current.timer / 1000) : 0;

    // deletion
    $: selected = $deleteList.indexOf(id) > -1;
    $: lockinput = !$currentChat || $fetching || $busy;

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
            document.dispatchEvent(new CustomEvent("chatscroll"))
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
            document.dispatchEvent(new CustomEvent("chatscroll"))
        }
        isEditing = false;
    }

    async function StartEditing(){
        document.body.dispatchEvent(new CustomEvent("startedit"))
        editedText = current.text;
        isEditing = true
        await tick()
        SetPostActions(false)
        ScrollIntoView()
    }

    export function ConfirmEdit(){
        CancelEditing()
        editedText = editedText.trim()
        if( !editedText ){
            DeleteCandidate();
        }else{
            $currentChat.messages[id].candidates[index].text = editedText;
            $currentChat = $currentChat;
            self.scrollIntoView({ block: "nearest" })
        }
        Server.request( "/save_chat", { chat: $currentChat, character: $currentCharacter } )
    }

    async function CopyMessage(){
        SetPostActions(false)
        navigator.clipboard.writeText(current.text).then(function(){
            alert('Text copied to clipboard!');
        }).catch(function(err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text to clipboard.\n' + err);
        });

    }

    export function DeleteCandidate(){
        if( first ){
            return;
        }
        
        SetPostActions(false)
        if(window.confirm("Are you sure you want to delete this message?")){
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
                document.dispatchEvent(new CustomEvent("chatscroll"))
            }
        }
    }

    async function BranchChat(){
        const new_name = window.prompt("Create a new chat from start until this message?\nYou can assign a chat title in the following field:")
        if(new_name !== null){
            $fetching = true;
            let branch = JSON.parse( JSON.stringify( $currentChat ))
            branch.messages = branch.messages.slice(0, id + 1)

            let result = await Server.request("/copy_chat", { character: $currentCharacter, chat: branch, name: new_name })
            if( result ){
                await Server.getChats( $currentCharacter, true )
                $fetching = false;
                window.alert("Successfully branched chat!")
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

    function Shortcuts(event : KeyboardEvent){
        if( lockinput ) return;
        
        let activeElement = document.activeElement;

        if( isEditing ){
            EditingShortcuts(event)
            return
        }
        
        if( last ){
            if( activeElement.nodeName !== "INPUT" && activeElement.nodeName !== "TEXTAREA" ){
                LastMessageShortcuts(event)
            }
        }
    }

    function EditingShortcuts(event : KeyboardEvent){
        switch(event.key){
            case "Escape":
                CancelEditing();
                break;
            case "Enter":
                if( event.ctrlKey ){
                    ConfirmEdit()
                }
                break;
            default:
                break;
        }
    }

    function LastMessageShortcuts(event : KeyboardEvent){
        switch(event.key){
            case "ArrowUp": 
                StartEditing();
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

    function ScrollIntoView(){
        self.scrollIntoView({ block: "nearest" })
    }
</script>

<svelte:body on:keydown={Shortcuts} on:startedit={CancelEditing}/>

<div class="msg {authorType}" class:delete={$deleting && selected} class:disabled={$busy} bind:this={self}>
    
    <button class="avatar" on:click={EditCharacter}>
        <Avatar size={54} is_bot={is_bot} character={$currentCharacter}/>
    </button>


    <div class="content">
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

            <span class="sub index"># {id+1}</span>
        </div>
        
        {#if isEditing}
            <!-- svelte-ignore a11y-autofocus -->
            <textarea class="editing" autofocus use:AutoResize={self} bind:value={editedText}></textarea>
            <div class="instruction">
                Escape to <span on:mousedown={CancelEditing} class="clickable info">Cancel</span>, 
                Ctrl+Enter to <span on:mousedown={ConfirmEdit} class="clickable info">Confirm</span>
            </div>
        {:else}
            <div class="text grow">{@html displayText}</div>
        {/if}


        {#if !isEditing}
            <div class="footer">
                <button class="dots normal" use:clickOutside on:click={TogglePostActions} disabled={postActions} on:outclick={() => SetPostActions(false)}>
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
                        <button class="left normal" title="Previous candidate" on:click={() => SwipeMessage(-1)}>{@html SVG.arrow}</button>
                        <div class="count deselect">{index+1} / {candidates.length}</div>
                        <button class="right normal" title="Next candidate" on:click={() => SwipeMessage(1)}>{@html SVG.arrow}</button>
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

    .msg.delete, .msg:hover.delete{
        background: rgba(255,64,64,0.1);
        border-color: rgb(255,72,72);
    }

    .content{
        display: flex;
        flex-direction: column;
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
    }

    .msg:hover .index{
        visibility: visible;
    }

    .sub{
        font-weight: 400;
        font-size: 0.8em;
        color: gray;
    }

    .text :global(p){
        margin-bottom: 1em;
    }

    .text :global(em){
        color: rgb(106, 135, 149);
    }

    .text :global(code){
        color: orange;
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
        overflow-y: hidden;
        background: #404040;
        border-radius: 4px;
        margin: 8px 0px;
    }

    .instruction{
        color: gray;
        font-size: 0.85em;
    }

    .instruction span.clickable{
        cursor: pointer;
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
        cursor: pointer;
    }

    .all{
        position: absolute;
        width: 100%;
        height: 100%;
    }
</style>