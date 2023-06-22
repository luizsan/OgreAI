<script>
    import { set_attributes } from "svelte/internal";
    import { sectionSettings, currentSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Profile from "./Profile.svelte";
    import Settings from "./Settings.svelte"
    import * as SVG from "../utils/SVGCollection.svelte";

    export let tab = 0;

    const tab_items = [
        { name: "User", icon: SVG.user, disabled: false },
        { name: "Settings", icon: SVG.settings, disabled: false },
    ]

    function setTab(id){
        tab = id;
    }

</script>

{#if $sectionSettings && $currentSettings != null}
    <Screen>
        <div class="tabs section horizontal">
            {#each tab_items as item, i}
                <button class="component tab" class:disabled={i ==tab} disabled={item.disabled || i == tab} on:click={() => setTab(i)}>{@html item.icon}{item.name}</button>
            {/each}
        </div>

        {#if tab == 0}
            <Profile/>
        {:else if tab == 1}
            <Settings/>
        {/if}
        
    </Screen>
{/if}

<style>
    .tabs{
        padding: 24px 16px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }

    .tab{
        display: flex;
        gap: 8px;
        align-items: center;
        flex-direction: row;
        font-size: 80%;
        justify-content: center;
        
    }

    .tab :global(svg){
        width: 16px;
        height: 16px;
    }

</style>