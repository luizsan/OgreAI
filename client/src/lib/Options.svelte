<script lang="ts">
    import { sectionSettings, currentSettingsMain, currentSettingsAPI, tabSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Footer from "../components/Footer.svelte";

    import Settings from "./Settings.svelte";
    import Prompt from "./Prompt.svelte";
    import Presets from "./Presets.svelte";
    import Formatting from "./Formatting.svelte";
    import User from "./User.svelte";
    import Customization from "./Customization.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    const tab_items = [
        {   
            title: "Settings", 
            description: "Change API, connection and related settings.",
            icon: SVG.sliders, disabled: false 
        },
        {   
            title: "Prompt", 
            description: "Build the chat prompt for the current API mode.",
            icon: SVG.prompt, disabled: false 
        },
        {   
            title: "Presets", 
            description: "Manage predefined settings to use across different API modes.",
            icon: SVG.saved, disabled: false 
        },
        {   
            title: "Formatting", 
            description: "Use regex to automatically format text when receiving replies.",
            icon: SVG.formatting, disabled: false 
        },
        {   
            title: "User", 
            description: "Customize the user's profile and preferences.",
            icon: SVG.user, disabled: false 
        },
        {
            title: "Customization",
            description: "Customize interface and visual preferences",
            icon: SVG.palette, disabled: false 
        }
    ]

    function setTab(id = -1){
        $tabSettings = id;
    }

</script>

{#if $sectionSettings && $currentSettingsMain != null && currentSettingsAPI != null }
    <Screen>
        <div class="content">
            <div class="top section">
                <h1>{tab_items[$tabSettings].title}</h1>
                <p class="explanation">{tab_items[$tabSettings].description}</p>
                <hr>
            </div>

            <div class="mid">
                {#if $tabSettings == 0}
                    <Settings/>
                {:else if $tabSettings == 1}
                    <Prompt/>
                {:else if $tabSettings == 2}
                    <Presets/>
                {:else if $tabSettings == 3}
                    <Formatting/>
                {:else if $tabSettings == 4}
                    <User/>
                {:else if $tabSettings == 5}
                    <Customization/>
                {/if}
            </div>
            
            <div class="bottom">
                <Footer/>
            </div>
        </div>

        <div class="side section wrap">
            {#each tab_items as item, i}
                <button 
                    class="tab accent"
                    class:active={i == $tabSettings}
                    class:disabled={i == $tabSettings} 
                    disabled={item.disabled || i == $tabSettings} 
                    on:click={() => setTab(i)}>{@html item.icon}
                    <!-- {item.name} -->
                </button>
            {/each}
        </div>

    </Screen>
{/if}

<style>
    h1{
        margin: 0;
        padding-top: 24px;
        padding-bottom: 4px;
        font-size: 40px;
    }

    hr{
        opacity: 0.1;
        width: 100%;
        border: 1px solid gray;
        margin-bottom: 0px;
    }

    .tab{
        width: 100%;
        height: 56px;
        padding: 0px;
        display: flex;
        gap: 0px;
        flex-direction: row;
        align-items: center;
        justify-content: center;
    }
    
    .tab :global(svg){
        width: 24px;
        height: 24px;
    }

    .tab.active{
        color: var( --component-color-hover );
    }

    .side{
        top: var( --header-size );
        gap: 0px;
        padding: 16px 0px;
        width: 72px;
        position: fixed;
    }

    .content{
        padding: 24px 24px 0px 80px;
        display: flex;
        flex-direction: column;
        position: relative;
        height: fit-content;
        gap: 32px;
        height: 100vh;
    }

    .bottom{
        display: flex;
        flex-grow: 1;
    }

</style>