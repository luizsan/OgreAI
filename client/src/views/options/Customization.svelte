<script lang="ts">
    import * as Theme from "@/modules/Theme";
    import * as Preferences from "@/modules/Preferences";
    import Checkbox from "@/components/Checkbox.svelte";
    import Dropdown from "@/components/Dropdown.svelte";
    import Segmented from "@/components/Segmented.svelte";
    import Slider from "@/components/Slider.svelte";
    import { currentTheme, currentPreferences } from "@/State";
    import Heading from "@/components/Heading.svelte";

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

    <div class="section hidden">
        <Heading title="Theme" description="Define your preferred color scheme."/>
        <div class="section" on:change={() => Theme.setTheme($currentTheme)}>
            <Segmented
                bind:value={$currentTheme}
                elements={Object.keys(Theme.themes)}
                label={(e) => Theme.themes[e].label}
            />
        </div>
    </div>

    {#each Preferences.prefsList as key}
        {@const entry = Preferences.prefs[key] }
        <div class="setting" class:blocked={entry.disabled($currentPreferences)} on:change={() => applyPreference(key, buffer[key])}>
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

            {:else if entry.type == "choice"}
                <div class="section">
                <Heading title={entry.title} description={entry.description} />
                <Segmented
                    bind:value={buffer[key]}
                    elements={entry.choices}
                    label={(e) => {
                        if(!e){
                            return "Disabled"
                        }else{
                            return String(e).charAt(0).toUpperCase() + String(e).slice(1);
                        }
                    }}
                />
                </div>

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