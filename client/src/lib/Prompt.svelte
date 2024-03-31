<script lang="ts">
    import Accordion from "../components/Accordion.svelte"
    import Reorderable from "../components/Reorderable.svelte";
    import Preset from "../components/Preset.svelte";
    import * as Data from "../modules/Data.svelte";
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";
    import { defaultPrompt, currentPresets, currentSettingsMain, currentSettingsAPI } from "../State";

    let normal_order : Array<string> = Object.keys($defaultPrompt)
    let custom_order : object = {
        base_prompt: { "rows": 12 },
        sub_prompt: { "rows": 6 },
        prefill_prompt: { "rows": 6 },
        // persona: { "rows": 4 },
    }
    
    normal_order = normal_order.filter(item => item != "persona")
    normal_order = normal_order.filter(item => !Object.keys(custom_order).includes(item))

    async function saveSettings(){
        const mode = $currentSettingsMain.api_mode
        await Server.request("/save_main_settings", { data: $currentSettingsMain })
        await Server.request("/save_api_settings", { api_mode: mode, data: $currentSettingsAPI })
    }

    function getPromptByKey(key : string){
        return $currentSettingsAPI.prompt.findIndex((e) => e.key == key)
    }

    function exportPrompt(){
        let exported = JSON.stringify($currentSettingsAPI.prompt, null, 2)
        Data.download(exported, `exported_${$currentSettingsMain.api_mode}_prompt.json`)
    }

    function importPrompt(){
        Data.upload(async (data) => {
            let imported = JSON.parse(data)
            if(!imported)
                return
            await Server.request("/validate_prompt", { prompt: imported }).then(valid => {
                console.log(valid)
                $currentSettingsAPI.prompt = valid;
                $currentSettingsAPI = $currentSettingsAPI
            })
        })
    }
</script>

<div class="content wide">

    <div class="section horizontal wide wrap data">
        <button class="component" on:click={exportPrompt}>{@html SVG.upload} Export Prompt</button>
        <button class="component" on:click={importPrompt}>{@html SVG.download} Import Prompt</button>
        <hr class="component">
    </div>

    <div class="section">
        <div>
            <div class="title">Prompt Manager</div>
            <div class="explanation">Enable, disable and reorder parts of the prompt for the current API mode.</div>
        </div>

        <Reorderable 
            list={$currentSettingsAPI.prompt}
            defaults={$defaultPrompt}
            update={(v) => {
                $currentSettingsAPI.prompt = v
                $currentSettingsAPI = $currentSettingsAPI
                saveSettings()
            }}
        />
    </div>

    {#each Object.keys(custom_order) as key}
        {#if $defaultPrompt[key] && $defaultPrompt[key].editable && $currentSettingsAPI.prompt.find((e) => e.key == key)}
            {@const item = $currentSettingsAPI.prompt.findIndex((e) => e.key == key)}

            <div class="section" on:change={saveSettings}>
                <div>
                    <div class="title">{$defaultPrompt[key].label}</div>
                    <div class="explanation">{$defaultPrompt[key].description}</div>
                </div>
  
                <Preset
                    bind:elements={ $currentPresets[key] } 
                    bind:content={ $currentSettingsAPI.prompt[item].content }
                    key={ key }
                    resizable={true}
                    rows={custom_order[key].rows ?? 4}
                />
            </div>
        {/if}
    {/each}

    <Accordion name="Character Properties">
    {#each normal_order as key}
        {#if $defaultPrompt[key] && $defaultPrompt[key].editable }
            <div class="section">
                <div>
                    <div class="title">{$defaultPrompt[key].label}</div>
                    <div class="explanation">{$defaultPrompt[key].description}</div>
                </div>
                <textarea class="component wide" rows={3} bind:value={ $currentSettingsAPI.prompt[getPromptByKey(key)].content }></textarea>
            </div>
        {/if}
    {/each}
    </Accordion>
</div>


<style>
    hr{
        border-style: dashed;
    }
    
    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    .data{
        justify-content: flex-end; 
        align-items: center;
        gap: 8px;
    }

    .data hr{
        flex: 1 1 content; 
        height: 0px;
        margin: 0px 16px;
    }
</style>