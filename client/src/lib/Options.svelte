<script lang="ts">
    import { sectionSettings, currentSettingsMain, currentSettingsAPI, tabSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Profile from "./Profile.svelte";
    import Settings from "./Settings.svelte"
    import Presets from "./Presets.svelte";
    import Formatting from "./Formatting.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    const tab_items = [
        {   
            title: "Settings", 
            explanation: "Change API, connection and related settings.",
            icon: SVG.sliders, disabled: false 
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
        },
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

            {#if $tabSettings == 0}
                <Settings/>
            {:else if $tabSettings == 1}
                <Presets/>
            {:else if $tabSettings == 2}
                <Formatting/>
            {:else if $tabSettings == 3}
                <Profile/>
            {/if}
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
        line-height: 2em;
        font-size: 40px;
    }

    hr{
        color: gray;
        opacity: 0.25;
    }   

    .top{
        padding: 16px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }

    .tab{
        width: 100%;
        height: 64px;
        padding: 0px;
        display: flex;
        gap: 0px;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        filter: brightness(1.2);
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
        bottom: 0px;
        position: fixed;
    }

    .content{
        padding-left: 64px;
        display: flex;
        flex-direction: column;
        position: relative;
        height: fit-content;
    }

</style>