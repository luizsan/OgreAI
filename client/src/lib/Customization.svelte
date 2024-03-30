<script lang="ts">
    import * as Theme from "../modules/Theme.svelte";
    import * as Preferences from "../modules/Preferences.svelte";
    import Slider from "../components/Slider.svelte";
    import Dropdown from "../components/Dropdown.svelte";
    import Checkbox from "../components/Checkbox.svelte";
    import { currentTheme, currentPreferences } from "../State";

    let buffer = {}
    Preferences.prefsList.forEach(key => {
        buffer[key] = $currentPreferences[key]
    });

    function resetPreference(key){
        const value = Preferences.prefs[key].default
        buffer[key] = value
        $currentPreferences[key] = value
        Preferences.setPreference(key, value)
    }

    function applyPreference(key, value){
        $currentPreferences[key] = value
        $currentPreferences = $currentPreferences;
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
            <div class="setting" on:change={() => applyPreference(key, buffer[key])}>
                {#if entry.type == "range"}
                    <Slider 
                        bind:value={buffer[key]} 
                        original={entry.default} 
                        min={entry.min} 
                        max={entry.max} 
                        step={entry.step} 
                        title={entry.title} 
                        description={entry.description}
                        unit={entry.unit}
                    />

                {:else if entry.type == "select"}
                    <Dropdown
                        bind:value={buffer[key]}
                        choices={entry.choices}
                    />

                {:else if entry.type == "checkbox"}
                    <Checkbox 
                        bind:value={buffer[key]}
                        title={entry.title}
                        description={entry.description}
                    />
                {/if}
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
</style>