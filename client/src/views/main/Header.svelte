<script>
    import { currentCharacter, currentChat, editing, sectionCharacters, sectionSettings, tabSettings } from "@/State";
    import { menu, settings } from "@/svg/Common.svelte"
    import { displayOrientation } from "@/modules/Theme";

    $: isPortrait = $displayOrientation === "portrait"

    function ToggleSidebar(){
        $sectionCharacters = !$sectionCharacters
        if( isPortrait && $sectionCharacters && $sectionSettings ){
            $sectionSettings = false
        }else{
            $editing = null
        }
    }

    function ToggleSettings(){
        $sectionSettings = !$sectionSettings
        if( $sectionSettings ){
            $tabSettings = $tabSettings;
        }

        if( $sectionSettings && $sectionCharacters ){
            if( isPortrait ){
                $sectionCharacters = false
            }
            $editing = null;
        }
    }

    function CloseChat(){
        $currentChat = null
        $currentCharacter = null
    }
</script>


<header id="header">
    <button class={$sectionCharacters ? "accent" : "normal"} title="Characters" on:click|stopPropagation={ToggleSidebar}>{@html menu}</button>
    <button class="clear" on:click|stopPropagation={CloseChat}><div class="title deselect">OGRE</div></button>
    <button class={$sectionSettings ? "accent" : "normal"} title="Settings" on:click|stopPropagation={ToggleSettings}>{@html settings}</button>
</header>


<style>
    header{
        align-items: center;
        background: var( --sub-bg-color );
        color: hsl(0, 0%, 75%);
        display: grid;
        grid-template-columns: 56px auto 56px;
        height: var( --header-size );
        justify-items: center;
        left: 0px;
        position: fixed;
        top: 0px;
        width: 100%;
        z-index: 100;
    }

    button{
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
        min-width: 180px;
        padding: 0px;
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

    button:hover .title{
        translate: 1em 0px 0;
    }

    button:hover .title::before{
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
    .normal:disabled{ color: hsla(0, 0%, 75%, 0.5 ) }
</style>