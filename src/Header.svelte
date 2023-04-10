<script>
    import { sidebarCharacters } from "./State";
    import { menu, settings } from "./utils/SVGCollection.svelte"

    function ToggleSidebar(){
        $sidebarCharacters = !$sidebarCharacters
    }
</script>


<header>
    <button class="normal" on:click={ToggleSidebar}>{@html menu}</button>
    <div>(it's) OgreAI</div>
    <button class="normal">{@html settings}</button>
</header>


<style>
    header{
        position: fixed;
        grid-template-columns: 48px auto 48px;
        top: 0px;
        left: 0px;
        width: 100%;
        height: var( --header-size );
        background: #00000080;
        border-bottom: 1px solid #FFFFFF40;
        display: grid;
        align-items: center;
        justify-items: center;
    }

    button{
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    button :global(svg){
        width: 24px;
        height: 24px;
    }

</style>