<script lang="ts">
    import { sectionSettings, currentSettingsMain, currentSettingsAPI, tabSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Footer from "../components/Footer.svelte";
    import Settings from "./Settings.svelte";
    import Prompt from "./Prompt.svelte";
    import Lorebooks from "./Lorebooks.svelte";
    import Formatting from "./Formatting.svelte";
    import User from "./User.svelte";
    import Customization from "./Customization.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";
    import { onMount } from "svelte";

    const tab_items = {
        settings: {
            title: "Settings",
            description: "Change API, connection and related settings.",
            icon: SVG.sliders, disabled: false
        },
        prompt: {
            title: "Prompt",
            description: "Build the chat prompt for the current API mode.",
            icon: SVG.prompt, disabled: false
        },
        lorebooks: {
            title: "Lorebooks",
            description: "Manage lorebooks.",
            icon: SVG.book, disabled : false
        },
        formatting: {
            title: "Formatting",
            description: "Use regular expressions to automatically format text in chat.",
            icon: SVG.formatting, disabled: false
        },
        user: {
            title: "User",
            description: "Customize the user's profile and preferences.",
            icon: SVG.user, disabled: false
        },
        customization: {
            title: "Customization",
            description: "Customize interface and visual preferences",
            icon: SVG.palette, disabled: false
        }
    }

    onMount(() =>{
        if(!$tabSettings){
            $tabSettings = Object.keys(tab_items)[0]
        }
    })

    function setTab(s : string = ""){
        $tabSettings = s;
    }

</script>

{#if $sectionSettings && $currentSettingsMain != null && currentSettingsAPI != null }
    <Screen>
        <div class="content">
            <div class="top section">
                <h1>{tab_items[$tabSettings].title}</h1>
                <p class="explanation">{tab_items[$tabSettings].description}</p>
                <hr class="component">
            </div>

            <div class="mid">
                {#if $tabSettings == "settings"}
                    <Settings/>
                {:else if $tabSettings == "prompt"}
                    <Prompt/>
                {:else if $tabSettings == "lorebooks"}
                    <Lorebooks/>
                {:else if $tabSettings == "formatting"}
                    <Formatting/>
                {:else if $tabSettings == "user"}
                    <User/>
                {:else if $tabSettings == "customization"}
                    <Customization/>
                {:else}
                    <Settings/>
                {/if}
            </div>

            <div class="bottom grow">
                <Footer/>
            </div>
        </div>


        <div class="side section wrap">
            <div class="dim disabled"/>

            {#each Object.keys(tab_items) as key}
                {#if !tab_items[key].disabled}
                    <button
                        class="tab accent"
                        class:active={key == $tabSettings}
                        class:disabled={key == $tabSettings}
                        disabled={tab_items[key].disabled || key == $tabSettings}
                        on:click={() => setTab(key)}>{@html tab_items[key].icon}
                    </button>
                {/if}
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

    .dim{
        position: absolute;
        right: 0px;
        width: auto;
        top: 0px;
        height: 100vh;
        border: 1px solid gray;
        background: none;
        opacity: 0.05;
        z-index: -1;
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
        width: 64px;
        position: fixed;
    }

    .content{
        padding: 24px 24px 0px 88px;
        display: flex;
        flex-direction: column;
        position: relative;
        height: fit-content;
        gap: 32px;
        height: 100vh;
    }

    .bottom{
        display: flex;
    }

</style>