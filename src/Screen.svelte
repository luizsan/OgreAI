<script>
    import { fade } from "svelte/transition";
</script>

<div class="container" transition:fade={{duration:150}}>
    <div class="main">
        <slot></slot>
    </div>
</div>

<style>
    .container{
        background: hsla(0, 0%, 15%, 1);
        bottom: 0px;
        display: flex;
        flex-direction: column;
        left: 0px;
        position: absolute;
        overflow-x: hidden;
        right: 0px;
        overflow-y: scroll;
        top: var( --header-size );
        scrollbar-color: #909090 transparent;
    }

    .main{
        align-self: center;
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: var( --chat-width );
        width: 100%;
    }
</style>