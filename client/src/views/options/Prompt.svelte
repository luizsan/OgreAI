<script lang="ts">
    import Reorderable from "@/views/prompt/Builder.svelte";
    import * as Data from "@/modules/Data.ts";
    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte";
    import { defaultPrompt, currentPresets, currentSettingsMain, currentSettingsAPI, currentPrompt } from "@/State";

    const presets_categories = ["base_prompt", "sub_prompt", "prefill_prompt"]


    function addItem(){
        const custom_prompts: number = $currentPrompt.filter(p => p.key === "custom").length
        $currentPrompt.push({
            key: "custom",
            label: `Custom Prompt ${custom_prompts}`,
            description: "",
            content: "",
            role: "user",
            enabled: true,
        })
        $currentPrompt = $currentPrompt
    }

    function exportPrompt(){
        let exported = JSON.stringify($currentPrompt, null, 2)
        Data.download(exported, `exported_${$currentSettingsMain.api_mode}_prompt.json`)
    }

    function importPrompt(){
        Data.upload("application/json", async (data) => {
            let imported = JSON.parse(data)
            if(!imported)
                return
            let content: any = { prompt: imported }
            // convert from ST
            if(imported.prompt_order && imported.prompts){
                content.type = "tavern"
            }
            await Server.request("/validate_prompt", content).then(valid => {
                console.log(valid)
                $currentPrompt = valid;
            })
            await Server.savePrompt()
        })
    }
</script>

<div class="content wide">

    <div class="section horizontal wide wrap data">
        <button class="component" on:click={exportPrompt}>{@html SVG.upload} Export Prompt</button>
        <button class="component" on:click={importPrompt}>{@html SVG.download} Import Prompt</button>
        <hr class="component">
    </div>

    <div class="section" on:change={Server.savePrompt}>
        <div class="section wide wrap horizontal">
            <div>
                <div class="title">Prompt Manager</div>
                <div class="explanation">Edit, toggle and reorder parts of the prompt for the current API mode.</div>
            </div>
        </div>

        <Reorderable
            bind:list={$currentPrompt}
            defaults={$defaultPrompt}
            presets={presets_categories}
        />

        <div class="buttons">
            <button class="component confirm" on:click={addItem}>{@html SVG.plus} Add Item</button>
        </div>
    </div>
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

    .buttons{
        display: flex;
        flex-wrap: wrap;
        flex-direction: row;
        margin-left: auto;
        gap: 8px;
        place-content: flex-end;;
    }
</style>