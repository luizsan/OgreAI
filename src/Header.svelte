<script>
    import { editing, sectionCharacters, sectionSettings } from "./State";
    import { menu, settings } from "./utils/SVGCollection.svelte"

    function ToggleSidebar(){
        $sectionCharacters = !$sectionCharacters
        if( $sectionCharacters && $sectionSettings ){
            $sectionSettings = false
        }else{
            $editing = false
        }
    }

    function ToggleSettings(){
        $sectionSettings = !$sectionSettings
        if( $sectionSettings && $sectionCharacters ){
            $sectionCharacters = false;
            $editing = false;
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
        background: #00000080;
        border-bottom: 1px solid #FFFFFF40;
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
</style>