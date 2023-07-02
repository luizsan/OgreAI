<script lang="ts">
    import { sectionSettings, currentSettings, tabSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Profile from "./Profile.svelte";
    import Settings from "./Settings.svelte"
    import * as SVG from "../utils/SVGCollection.svelte";

    const tab_items = [
        { name: "Settings", icon: SVG.settings, disabled: false },
        { name: "User", icon: SVG.user, disabled: false },
    ]

    function setTab(id = -1){
        $tabSettings = id;
    }

</script>

{#if $sectionSettings && $currentSettings != null}
    <Screen>
        <div class="tabs section horizontal">
            {#each tab_items as item, i}
                <button 
                    class="component normal tab" 
                    class:disabled={i == $tabSettings} 
                    disabled={item.disabled || i == $tabSettings} 
                    on:click={() => setTab(i)}>{@html item.icon}{item.name}
                </button>
            {/each}
        </div>

        {#if $tabSettings == 0}
            <Settings/>
        {:else if $tabSettings == 1}
            <Profile/>
        {/if}
        
    </Screen>
{/if}