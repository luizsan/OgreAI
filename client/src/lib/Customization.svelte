<script lang="ts">
    import * as Theme from "../modules/Theme.svelte";
    // import * as Preferences from "../modules/Preferences.svelte";
    import { currentTheme } from "../State";
    // import * as SVG from "../utils/SVGCollection.svelte"

    $currentTheme = Theme.loadTheme()

    // let messagePrefs;
</script>


<div class="content wide">

    <div class="section">
        <div>
            <div class="title">Theme</div>
            <div class="explanation">Define your preferred color scheme.</div>
        </div>

        <div class="section" on:change={() => Theme.setTheme($currentTheme)}>

        {#each Object.keys(Theme.themes) as key}
            <label>
                <input type="radio" class="component" bind:group={$currentTheme} name="theme" value={key}>
                {Theme.themes[key].label}
            </label>
        {/each}

        </div>
    </div>

    <!-- {#each Object.keys(Preferences.prefs) as key}
        {@const entry = Preferences.prefs[key] }

        <div class="setting">
        <div class="section wide">
            <div>
                <p class="title">{entry.title}</p>
                <p class="explanation">{entry.description}</p>
            </div>
            
            {#if entry.type == "checklist"}
                {#each entry.default as check}
                    <label>
                        <input class="component" type="checkbox" bind:group={messagePrefs} value={check} />
                        {check}
                    </label>
                {/each}
            
            {:else if entry.type == "range"}
                <div class="input wide horizontal" >
                    <button class="sub danger" title="Reset to default ({entry.default})">{@html SVG.refresh}</button>
                    <input type="number" class="component" style="padding-left: 40px" step={entry.step}>
                    <input type="range" class="component" min={entry.min} max={entry.max} step={entry.step}>
                </div>

            {/if}
        </div>
        </div>
    {/each} -->

</div>


<style>
    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    /* .setting{
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .sub{
        position: absolute;
        width: 32px;
        height: 30px;
        translate: 4px 0px;
        background: #80808016;
        z-index: 1;
    }
    .sub :global(svg){
        translate: 0px 1px;
        width: 18px;
        height: 18px;
    } */
</style>