<script lang="ts">
    import { sectionSettings, currentSettingsMain, currentSettingsAPI, tabSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Footer from "../components/Footer.svelte";

    import Settings from "./Settings.svelte";
    import Prompt from "./Prompt.svelte";
    import Presets from "./Presets.svelte";
    import Formatting from "./Formatting.svelte";
    import Profile from "./Profile.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    const tab_items = [
        {   
            title: "Settings", 
            explanation: "Change API, connection and related settings.",
            icon: SVG.sliders, disabled: false 
        },
        {   
            title: "Prompt", 
            explanation: "Build the chat prompt for the current API mode.",
            icon: SVG.prompt, disabled: false 
        },
        {   
            title: "Presets", 
            explanation: "Manage predefined settings to use across different API modes.",
            icon: SVG.saved, disabled: false 
        },
        {   
            title: "Formatting", 
            explanation: "Use regex to automatically format text when receiving replies.",
            icon: SVG.formatting, disabled: false 
        },
        {   
            title: "User", 
            explanation: "Customize the user's profile and preferences.",
            icon: SVG.user, disabled: false 
        }
    ]

    function setTab(id = -1){
        $tabSettings = id;
    }

</script>

{#if $sectionSettings && $currentSettingsMain != null && currentSettingsAPI != null }
    <Screen>
        <div class="content">
            <div class="top">
                <h1>{tab_items[$tabSettings].title}</h1>
                <p class="explanation">{tab_items[$tabSettings].explanation}</p>
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
                    <Profile/>
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
        line-height: 1.2em;
        font-size: 40px;
    }

    hr{
        color: gray;
        opacity: 0.25;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
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