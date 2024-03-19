<script lang="ts">
    import Accordion from "../components/Accordion.svelte";
    import { currentPresets } from "../State";
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    const prompt_categories = [
        { key: "base_prompt", label: "Main Prompt"},
        { key: "sub_prompt", label: "Jailbreak Prompt"},
        { key: "prefill_prompt", label: "Prefill Prompt"},
        { key: "persona", label: "User Persona"},
    ]

    function AddItem(key : string){
        $currentPresets[key].push({ name: "", address: "", password: "" })
        $currentPresets[key] = $currentPresets[key];
    }

    function DuplicateItem(key : string, id : number, item : any){
        $currentPresets[key].splice(id, 0, JSON.parse(JSON.stringify(item)))
        $currentPresets[key] = $currentPresets[key];
    }

    function RemoveItem(key : string, id : number){
        $currentPresets[key].splice(id, 1)
        $currentPresets[key] = $currentPresets[key];
        Server.request("/save_presets", { type: key, data: $currentPresets[key] })
    }
</script>


<div class="content wide">
    <Accordion name="API Authentication" bind:size={$currentPresets.api_auth.length} showSize={true}>
        {#each $currentPresets.api_auth as item, i}
            <div class="preset" on:change={() => Server.request("/save_presets", { type: "api_auth", data: $currentPresets.api_auth })}>
                <div class="controls">
                    <button class="component info" title="Duplicate" on:click={() => DuplicateItem("api_auth", i, item)}>{@html SVG.copy}</button>
                    <button class="component danger" title="Remove" on:click={() => RemoveItem("api_auth", i)}>{@html SVG.trashcan}</button>
                </div>
                <div class="fields">
                    <input type="text" class="component wide" placeholder="Title" bind:value={item.name} style="flex: 1 1 auto">
                    <input type="text" class="component wide" placeholder="URL" bind:value={item.address} style="flex: 1 1 auto">
                    <input type="password" class="component wide" placeholder="Authentication" bind:value={item.password} style="flex: 1 1 auto">
                </div>
            </div>
        {/each}
        <button class="component normal" on:click={() => AddItem("api_auth")}>{@html SVG.plus}Add API Authentication</button>
    </Accordion>
    
    {#each prompt_categories as category}
        <Accordion name={category.label} bind:size={$currentPresets[category.key].length} showSize={true}>
            {#each $currentPresets[category.key] as item, i}
                <div class="preset" on:change={() => Server.request("/save_presets", { type: category.key, data: $currentPresets[category.key] })}>
                    <div class="controls">
                        <button class="component info" title="Duplicate" on:click={() => DuplicateItem(category.key, i, item)}>{@html SVG.copy}</button>
                        <button class="component danger" title="Remove" on:click={() => RemoveItem(category.key, i)}>{@html SVG.trashcan}</button>
                    </div>
                    <div class="fields">
                        <input type="text" class="component wide" placeholder="{category.label} Title" bind:value={item.name} style="flex: 1 1 auto">
                        <textarea class="component wide" placeholder="Content" rows={8} bind:value={item.content}></textarea>
                    </div>
                </div>
            {/each}
            <button class="component normal" on:click={() => AddItem(category.key)}>{@html SVG.plus}Add {category.label}</button>
        </Accordion>
    {/each}

<div></div>

</div>


<style>
    .content{
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-sizing: border-box;
    }

    .preset{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 8px;
    }

    .fields{
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .controls{
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .controls .component{
        padding: 6px;
    }

    .component :global(svg){
        width: 16px;
        height: 16px;
    }

</style>