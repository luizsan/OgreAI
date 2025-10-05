<script lang="ts">
    export let side: string = "left";
    export let width: number = 600
    export let sort: number = 0;

    $: sortOrder = 25 + sort;
</script>

<div class="container small {side}" style="--self-width: {width}px; z-index:{sortOrder}">
    <div class="main">
        <slot></slot>
    </div>
</div>

<style>
    .container{
        bottom: 0px;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        left: 0px;
        right: 0px;
        top: 0px;
        width: var( --self-width );
        height: 100%;
        max-width: 100%;
        overflow: hidden;
    }

    :global(body.portrait) .container{
        position: absolute;
        inset: 0px;
        width: unset;
    }


    .left{
        left: 0px;
        right: auto;
    }

    .right{
        left: auto;
        right: 0px;
    }

    .container .main{
        align-self: center;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
    }

</style>