<script>
    import { sidebarCharacters } from "./State";
    import Character from './Character.svelte'
</script>

<div class="{ $sidebarCharacters ? "active" : ""}">
    {#each {length: 20} as _, i}
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
        
        border-right: 1px solid #FFFFFF40;
        background: black;
        box-shadow: 3px 0px #00000020;

        transition: translate 0.2s ease-in;
        translate: -100% 0 0;
    }

    .active{
        translate: 0 0 0;
    }

</style>