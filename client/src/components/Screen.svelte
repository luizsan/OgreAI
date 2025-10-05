<script lang="ts">
    export let order = 0

    $: sortOrder = 50 + order
</script>

<div class="container full" style="z-index: {sortOrder}">
    <div class="main">
        <slot></slot>
    </div>
</div>


<style>
    .container{
        --scrollbar-bg: hsl(0, 0%, 15%);
        background: var( --default-bg-color);
        bottom: 0px;
        display: flex;
        flex-direction: column;
        left: 0px;
        position: absolute;
        overflow-x: hidden;
        right: 0px;
        top: 0px;
        width: 100%;
        overflow-y: scroll;
    }

    .container .main{
        align-self: center;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        max-width: var( --chat-width );
    }
</style>