<script lang="ts">
    export let order = 0
</script>

<div class="background"/>
<div class="container full" style="z-index: calc( var( --layer-menu ) + {order})">
    <div class="anchor main">
        <slot></slot>
    </div>
</div>


<style>
    .background{
        background: var( --background-neutral-300 );
        position: fixed;
        left: -50%;
        right: -50%;
        top: 0px;
        bottom: 0px;
        padding: 0px 50%;
    }

    .container{
        top: 0px;
        bottom: 0px;
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
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