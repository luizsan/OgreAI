<script lang="ts">
    import Accordion from "../components/Accordion.svelte"
    import Reorderable from "../components/Reorderable.svelte";
    import Preset from "../components/Preset.svelte";
    import * as Server from "../modules/Server.svelte";
    import { defaultPrompt, currentPresets, currentSettingsMain, currentSettingsAPI } from "../State";

    let normal_order : Array<string> = Object.keys($defaultPrompt)
    let custom_order : object = {
        base_prompt: { "rows": 12 },
        sub_prompt: { "rows": 6 },
        prefill_prompt: { "rows": 6 },
        persona: { "rows": 4 },
    }
    
    normal_order = normal_order.filter(item => !Object.keys(custom_order).includes(item))

    async function saveSettings(){
        const mode = $currentSettingsMain.api_mode
        await Server.request("/save_main_settings", { data: $currentSettingsMain })
        await Server.request("/save_api_settings", { api_mode: mode, data: $currentSettingsAPI })
    }

    function getPromptByKey(key : string){
        return $currentSettingsAPI.prompt.findIndex((e) => e.key == key)
    }

    function savePreset(key : string, content : string){
        let new_name = ""
        let existing_index = $currentPresets[key].findIndex((item) => item.content == content)
        if( existing_index > -1 && $currentPresets[key].at(existing_index).name){
            new_name = $currentPresets[key].at(existing_index).name
        }else{
            let id = 0;
            do{
                id += 1;
                new_name = "New preset " + id
            }while( $currentPresets[key].some((item) => item.name == new_name ))
        }

        let target_name = prompt("Choose a name for the saved preset:", new_name )
        if( target_name ){
            let existing_item = $currentPresets[key].find((item) => item.name == target_name)
            if( existing_item ){
                existing_item.content = content
            }else{
                $currentPresets[key].push({ "name": target_name, "content": content })
            }
        }

        $currentPresets[key] = $currentPresets[key];
        $currentPresets = $currentPresets;
        Server.request("/save_presets", { type: key, data: $currentPresets[key] })
    }

</script>

<div class="content wide">

    <div class="section">
        <div>
            <div class="title">Prompt Manager</div>
            <div class="explanation">Enable, disable and reorder parts of the prompt for the current API mode.</div>
        </div>
        <Reorderable 
            list={$currentSettingsAPI.prompt}
            defaults={$defaultPrompt}
            presets={$currentPresets}
            update={(v) => {
                $currentSettingsAPI.prompt = v
                $currentSettingsAPI = $currentSettingsAPI
                saveSettings()
            }}
        />
    </div>

    {#each Object.keys(custom_order) as key}
        {#if $defaultPrompt[key] && $defaultPrompt[key].editable && $currentSettingsAPI.prompt.find((e) => e.key == key)}
            <div class="section" on:change={saveSettings}>
                <div>
                    <div class="title">{$defaultPrompt[key].label}</div>
                    <div class="explanation">{$defaultPrompt[key].description}</div>
                </div>
  
                <Preset 
                    elements={ $currentPresets[key] } 
                    content={ $currentSettingsAPI.prompt.find((e) => e.key == key).content } 
                    item={(v) => v.content } 
                    update={(v) => $currentSettingsAPI.prompt.find((e) => e.key === key).content = v }
                    save={(c) => savePreset(key, c)}
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
                <textarea class="component wide" rows={4} bind:value={ $currentSettingsAPI.prompt[getPromptByKey(key)].content }></textarea>
            </div>
        {/if}
    {/each}
    </Accordion>
</div>


<style>
    :global(p) {
        margin: 0px;
    }

    .title{
        font-weight: 600;
        margin: 0px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

</style>