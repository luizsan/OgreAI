<script lang="ts">
    export let fullscreen: boolean = false
    export let width: number = 480
    export let right: boolean = false
</script>

{#if fullscreen}
    <div class="container full">
        <div class="main">
            <slot></slot>
        </div>
    </div>
{:else}
    <div class="container small" style="max-width: {width}px" class:right={right}>
        <div class="main">
            <slot></slot>
        </div>
    </div>
{/if}

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
        overflow-y: scroll;
        top: var( --header-size );
        z-index: 50;
        width: 100%;
    }

    .full{
        left: 0px;
        right: 0px;
    }

    .small{
        max-width: var( --self-width );
        left: 0px;
        right: auto;
    }

    .small.right{
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

    .container.full .main{
        max-width: var( --chat-width );
        width: 100%;
    }
</style>