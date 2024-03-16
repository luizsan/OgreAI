<script lang="ts">

    import * as Theme from "../modules/Theme.svelte";
    import * as Preferences from "../modules/Preferences.svelte";
    import { currentTheme, currentPreferences } from "../State";
    import * as SVG from "../utils/SVGCollection.svelte"

    let buffer = {}
    Preferences.prefsList.forEach(key => {
        buffer[key] = $currentPreferences[key]
    });

    function resetPreference(key){
        const value = Preferences.prefs[key].default
        $currentPreferences[key] = value
        Preferences.setPreference(key, value)
    }

    function applyPreference(key, value){
        $currentPreferences[key] = value
        Preferences.setPreference(key, value)
    }
</script>


<div class="content wide">

    <div class="section">
        <div>
            <div class="title">Theme</div>
            <div class="explanation">Define your preferred color scheme.</div>
        </div>

        <div class="section" on:change={() => Theme.setTheme($currentTheme)}>
            {#each Object.keys(Theme.themes) as key}
                <label class="min">
                    <input type="radio" class="component" bind:group={$currentTheme} name="theme" value={key}>
                    {Theme.themes[key].label}
                </label>
            {/each}
        </div>
    </div>

    {#each Preferences.prefsList as key}
        {@const entry = Preferences.prefs[key] }

        {#if !entry.disabled() }
            <div class="setting">
                <div class="section wide" on:change={() => applyPreference(key, buffer[key])}>

                    {#if entry && entry.type && entry.type != "checkbox" }
                        <div>
                            <p class="title">{entry.title}</p>
                            <p class="explanation">{entry.description}</p>
                        </div>
                    {/if}
                
                    
                    {#if entry.type == "range"}
                    
                        <div class="input wide horizontal">
                            <button class="sub danger" title="Reset to default ({entry.default})" on:click={() => resetPreference(key)}>{@html SVG.refresh}</button>
                            <input type="number" class="component" style="padding-left: 40px" step={entry.step} bind:value={ buffer[key] }>
                            <input type="range" class="component" min={entry.min} max={entry.max} step={entry.step} bind:value={ buffer[key] }>
                        </div>

                    {:else if entry.type == "select"}

                        <select class="component min" bind:value={buffer[key]}>
                            {#each entry.choices as choice}
                                <option value={choice}>{choice}</option>
                            {/each}
                        </select>


                    {:else if entry.type == "checkbox"}

                        <div class="toggle wide vertical">
                            <label>
                                <input type="checkbox" class="component" bind:checked={buffer[key]}>
                            </label>
                            <div>
                                <div class="title">{entry.title}</div>
                                <div class="explanation">{entry.description}</div>
                            </div>
                        </div>

                    {/if}

                </div>
            </div>

        {/if}
    {/each}

</div>


<style>
    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    .input{
        display: grid;
        grid-template-columns: 128px auto;
        gap: 16px;
    }

    .toggle{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 16px;
    }

    .setting{
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
    }
</style>