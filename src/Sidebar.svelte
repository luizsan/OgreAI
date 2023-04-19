<script>
    import { characterList, sectionCharacters } from "./State";
    import Character from './Character.svelte'
</script>

<div class:active={$sectionCharacters}>
    {#each $characterList as char, i}
        <Character id={i} character={char} />
    {/each}
</div>


<style>
    *::-webkit-scrollbar{
        width: 0px;
    }

    div{
        background: #282828;
        border-right: 1px solid #FFFFFF40;
        bottom: 0px;
        box-shadow: 3px 0px transparent;
        display: flex;
        flex-direction: column;
        gap: 12px;
        top: var( --header-size );
        left: 0px;
        bottom: 0px;
        overflow-x: hidden;
        overflow-y: scroll;
        padding: 12px;
        position: fixed;
        scrollbar-width: none;
        width: fit-content;

        transition: translate 0.15s ease;
        translate: -100% 0 0;
    }

    .active{
        translate: 0 0 0;
    }
</style>