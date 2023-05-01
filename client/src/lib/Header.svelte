<script>
    import { editing, sectionCharacters, sectionSettings } from "../State";
    import { menu, settings } from "../utils/SVGCollection.svelte"

    function ToggleSidebar(){
        $sectionCharacters = !$sectionCharacters
        if( $sectionCharacters && $sectionSettings ){
            $sectionSettings = false
        }else{
            $editing = null
        }
    }

    function ToggleSettings(){
        $sectionSettings = !$sectionSettings
        if( $sectionSettings && $sectionCharacters ){
            $sectionCharacters = false;
            $editing = null;
        }
    }
</script>


<header>
    <button class="normal" on:click={ToggleSidebar}>{@html menu}</button>
    <div>(it's) OgreAI</div>
    <button class="normal" on:click={ToggleSettings}>{@html settings}</button>
</header>


<style>
    header{
        align-items: center;
        background: hsl(0, 0%, 10%);
        border-bottom: 1px solid hsl(0, 0%, 33%);
        color: hsl(0, 0%, 75%);
        font-size: 85%;
        display: grid;
        grid-template-columns: 48px auto 48px;
        height: var( --header-size );
        justify-items: center;
        left: 0px;
        position: fixed;
        top: 0px;
        width: 100%;
    }

    button{
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
        width: 100%;
    }

    button :global(svg){
        height: 24px;
        width: 24px;
    }

    .normal{ color: hsl(0, 0%, 50% ) }
    .normal:hover{ color: hsl(0, 0%, 100% ) }
    .normal:active{ color: hsl(0, 0%, 75% ) }
</style>