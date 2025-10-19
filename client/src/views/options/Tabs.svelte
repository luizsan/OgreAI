<script lang="ts">
    import { sectionSettings, currentSettingsMain, currentSettingsAPI, tabSettings } from "@/State";
    import User from "./User.svelte";
    import Prompt from "./Prompt.svelte";
    import Server from "./Server.svelte";
    import Settings from "./Settings.svelte";
    import Lorebooks from "./Lorebooks.svelte";
    import Formatting from "./Formatting.svelte";
    import Customization from "./Customization.svelte";
    import Footer from "@/components/Footer.svelte";
    import Sidebar from "@/components/Sidebar.svelte";
    import * as SVG from "@/svg/Common.svelte";
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
        },
        server: {
            title: "Server",
            description: "Configure the server and user database.",
            icon: SVG.server, disabled: false
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


<Sidebar side="right" enabled={$sectionSettings && $currentSettingsMain != null && currentSettingsAPI != null}>
    <div class="main">
        <div class="side section">
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

        <div class="content">
            <div class="inner section">
                <div class="top section">
                    <div class="horizontal wide section">
                        <div class="section grow">
                            <h1>{tab_items[$tabSettings].title}</h1>
                            <p class="explanation">{tab_items[$tabSettings].description}</p>
                        </div>
                    </div>
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
                    {:else if $tabSettings == "server"}
                        <Server/>
                    {:else}
                        <div/>
                    {/if}
                </div>

                <div class="bottom grow">
                    <Footer/>
                </div>
            </div>
        </div>

    </div>
</Sidebar>


<style>
    h1{
        margin: 0;
        padding-top: 24px;
        padding-bottom: 4px;
        font-size: 40px;
    }

    .main{
        inset: 0px;
        padding: 0px;
        margin: 0px;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
    }

    :global(body.portrait) .main{
        background: var( --default-bg-color );
    }

    .tab{
        width: 100%;
        height: 52px;
        padding: 0px;
        display: flex;
        border-radius: 5px 0px 0px 5px;
        align-items: center;
        justify-content: center;
        pointer-events: all;
    }

    .tab:first-child{
        border-radius: 0px 0px 0px 5px;
    }

    .tab :global(svg){
        width: 24px;
        height: 24px;
    }

    .tab.active{
        color: var( --component-color-hover );
    }

    .tab.disabled{
        background: var( --sub-bg-color );
    }

    .side{
        top: 0px;
        left: 0px;
        gap: 0px;
        padding: 0px 0px;
        width: 56px;
        height: 100%;
        position: absolute;
        pointer-events: none;;
        z-index: 1;

    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        position: relative;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
        scrollbar-color: var( --accent-color-normal ) var( --sub-bg-color );
    }

    .inner{
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        gap: 24px;
        padding: 24px;
        margin-left: 56px;
        background: var( --sub-bg-color );
        background-repeat: repeat;
    }

    .bottom{
        display: flex;
    }

</style>