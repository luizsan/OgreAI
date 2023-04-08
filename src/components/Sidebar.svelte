<script>
    import Character from './Character.svelte'
</script>

<div>
    {#each {length: 10} as _, i}
        <Character avatar="./img/bot_default.png" id={i}/>
    {/each}
</div>

<style>
    *::-webkit-scrollbar{
        width: 0px;
    }

    div{
        position: fixed;
        width: fit-content;
        top: var( --header-size );
        left: 0px;
        bottom: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow-y: scroll;
        overflow-x: hidden;
        scrollbar-width: none;
        gap: 16px;
        padding: 16px 16px;
    }
</style>