<script lang="ts">
    import { arrow, dots } from "./assets/svg"

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
        return date.toLocaleString("ja-JP", date_options)
    }

    function GetAuthorType(){
        return is_bot ? "bot" : "user"
    }

    function HandleClick(event){
        console.log(event.target)
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
                <button class="left" on:click={() => SwipeMessage(-1)}><div class="icon">{@html arrow}</div></button>
                <div class="count">{index+1} / {candidates.length}</div>
                <button class="right" on:click={() => SwipeMessage(1)}><div class="icon">{@html arrow}</div></button>
            </div>

            <button class="more" on:mousedown={HandleClick}>
                <div class="icon">{@html dots}</div>
            </button>

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
        column-gap: 12px;
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
        height: 20px;
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
        align-items: center;
        gap: 8px;
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

    .swipes .count{
        font-size: 90%;
        opacity: 0.25;
    }

    .swipes .icon{
        width: 16px;
        height: 16px;
    }

    .msg .swipes button{
        padding: 0px;
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
        display: flex;
        align-items: center;
        justify-content: center;      
    }

    .more .icon{
        width: 20px;
        height: 20px;
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