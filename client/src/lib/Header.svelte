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
    <div class="title deselect">OGRE</div>
    <button class="normal" on:click={ToggleSettings}>{@html settings}</button>
</header>


<style>
    header{
        align-items: center;
        background: hsl(0, 0%, 10%);
        border-bottom: 1px solid hsl(0, 0%, 33%);
        color: hsl(0, 0%, 75%);
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

    .title{
        position: relative;
        color: var( --accent-color-light );
        letter-spacing: 0.05em;
        font-size: 12px;
        transition: all 0.2s ease;
    }

    .title::before{
        position: absolute;
        content: "(IT'S) ";
        opacity: 0;
        color: hsl(0, 0%, 40%);
        translate: 0px 1px 0;
        transition: all 0.2s ease;
    }
    
    .title:hover{
        translate: 1em 0px 0;
    }
    
    .title:hover::before{
        opacity: 1;
        translate: -3em 0px 0;
    }
    
    .title::after{
        content: "AI";
        font-weight: 800;
        color: white;
    }

    .normal{ color: hsl(0, 0%, 50% ) }
    .normal:hover{ color: hsl(0, 0%, 100% ) }
    .normal:active{ color: hsl(0, 0%, 75% ) }
</style>