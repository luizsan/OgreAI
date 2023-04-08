<script lang="ts">
    import Message from './Message.svelte'

    let message : string = ""
    let busy : boolean = false

    function getAuthor(i : number){
        return (i % 2 == 0) ? "Bot" : "User"
    }
</script>


<div class="chat">
    <div class="messages">
        {#each {length: 10} as _, i}
            <Message author={getAuthor(i)} id={i} />
        {/each}
    </div>

    <div class="input">
        <button class="options"></button>
        <textarea placeholder="Type a message..."></textarea>
        <button class="send"></button>
    </div>
</div>


<style>
    .chat{
        width: 100%;
        max-width: var( --chat-width );
        height: 100%;
        align-self: center;
        padding: 0px 8px;
        flex: 1;
        display: grid;
        grid-template-rows: auto 68px;
    }

    .messages{
        padding: 8px 0px;
        margin: 0px var(--chat-padding);
        margin-top: var(--header-size);
        overflow-x: hidden;
        overflow-y: auto;
        display: block;
    }

    .input{
        position: relative;
        min-height: 36px;
        height: fit-content;
        padding: 0px 0px;
        margin: 0px var(--chat-padding);
        border: 1.5px solid lightgray;
        border-radius: 6px;
        background: gray;
        color: white;
        resize: none;
        box-shadow: 0px 8px 16px #18181880;
        display: grid;
        align-content: center;
        grid-template-columns: 48px auto 48px;
        column-gap: 0px;
    }

    .input textarea{
        height: 20px;
        min-height: 20px;
        max-height: 104px;
        margin: 8px 0px;
        padding: 0px 0px;
        background: none;
        color: white;
        border: none;
        resize: none;
    }

    .input textarea::placeholder{
        opacity: 0.2;
    }

</style>