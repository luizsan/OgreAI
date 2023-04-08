<script lang="ts">
    interface Candidate{
        text : string;
        timestamp : number;
    }

    export const id : number = -1
    export let is_bot : boolean = false
    export let author : string = ""
    export let index : number = 0
    export let avatar : string = ""
    export let selected : boolean = false
    export let candidates : Candidate[] = [
        { text: "Hello world!", timestamp: 0 },
        { text: "foo bar!", timestamp: 0 },
    ]

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
        return date.toLocaleString("ja-JP")
    }

    function GetAuthorType(){
        return is_bot ? "bot" : "user"
    }
</script>


<div class="msg">
    <div class="avatar"></div>
    <div class="content">
        <div class="author">
            <span class="name {GetAuthorType()}" style="background-image: url({avatar})">{author}</span>
            <span class="timestamp">{GetFormattedDate()}</span>
        </div>
        
        <div class="text">
            {candidates[index].text}
        </div>

        <div class="footer">
            <div class="ratings">
                <button class="up">👍</button>
                <button class="down">👎</button>
            </div>

            <div class="swipes">
                <button class="left" on:click={() => SwipeMessage(-1)}>&lt;</button>
                <div class="count">{index+1} / {candidates.length}</div>
                <button class="right" on:click={() => SwipeMessage(1)}>&gt;</button>
            </div>

            <button class="more">...</button>
            <div class="actions">
                <button class="copy">Copy</button>
                <button class="edit">Edit</button>
                <button class="delete">Delete</button>
            </div>

        </div>

        <input class="toggle" type="checkbox" bind:checked={selected}>
    </div>
</div>


<style>
    .msg{
        position: relative; 
        min-width: 50%;
        margin: 8px;
        margin-bottom: auto;
        padding: 16px;
        border-radius: 8px;
        border-left: 4px solid transparent;
        display: grid;
        grid-template-columns: var( --avatar-size) auto;
        column-gap: 16px;
        word-break: break-word;
    }

    .msg:hover{
        background: rgb(250, 250, 255, 0.05);
    }

    .msg:hover .user{
        border-color: rgb(240, 240, 144);
    }

    .msg:hover .bot{
        border-color: rgb(135, 206, 235);
    }

    .author .name{
        margin-bottom: 4px;
        color: white;
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
    }

    .footer{
        width: 100%;
        position: relative;
        display: flex;
        flex-direction: row;
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
    }

    .msg:hover .swipes{
        visibility: visible;
    }

    .more{
        width: 40px;
        height: 20px;
        background: #00000020;
        border-radius: 4px;
        visibility: hidden;
    }

    .msg:hover .more{
        visibility: visible;
    }

    .actions{
        position: absolute;
        width: fit-content;
        height: fit-content;
        background: var( --component-bg );
        border: 1px solid #ffffff08;
        border-radius: 4px;
        box-shadow: 0px 3px 0px #00000040;
        /* display: flex; */
        display: none;
        flex-direction: row-reverse;
        translate: 0px -44px;
        gap: 4px;
        right: 0px;
    }

    .actions button{
        width: 40px;
        height: 36px;
        border-radius: 2px;
    }

    .actions button:hover {
        background: #00000040;
        outline: 1px solid #80808040;
    }

    .toggle{
        position: absolute;
        top: 16px;
        right: 16px;
        width: 20px;
        height: 20px;
    }
</style>