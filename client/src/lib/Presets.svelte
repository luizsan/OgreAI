<script lang="ts">
    import Accordion from "../components/Accordion.svelte";
    import { currentSettings } from "../State";
    import * as Server from "./Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    const prompt_categories = [
        { key: "base_prompt", label: "Base Prompt"},
        { key: "sub_prompt", label: "Sub Prompt"},
        { key: "prefill_prompt", label: "Prefill Prompt"},
    ]


    function AddItem(key : string){
        $currentSettings.presets[key].push({ name: "", address: "", password: "" })
        $currentSettings.presets[key] = $currentSettings.presets[key];
    }

    function DuplicateItem(key : string, id : number, item : any){
        $currentSettings.presets[key].splice(id, 0, JSON.parse(JSON.stringify(item)))
        $currentSettings.presets[key] = $currentSettings.presets[key];
    }

    function RemoveItem(key : string, id : number){
        $currentSettings.presets[key].splice(id, 1)
        $currentSettings.presets[key] = $currentSettings.presets[key];
        Server.request("/save_settings", $currentSettings)
    }
</script>


<div class="content wide" on:change={() => Server.request("/save_settings", $currentSettings)}>
    <div>
        <h1>Presets</h1>
        <p class="explanation">Set up predefined settings to use across different API modes.</p>
        <hr>
    </div>

    <Accordion name="API Authentication">
        {#each $currentSettings.presets.auth as auth, i}
            <div class="preset">
                <div class="controls">
                    <button class="component info" title="Duplicate" on:click={() => DuplicateItem("auth", i, auth)}>{@html SVG.copy}</button>
                    <button class="component danger" title="Remove" on:click={() => RemoveItem("auth", i)}>{@html SVG.trashcan}</button>
                </div>
                <div class="fields">
                    <input type="text" class="component wide" placeholder="Title" bind:value={auth.name} style="flex: 1 1 auto">
                    <input type="text" class="component wide" placeholder="URL" bind:value={auth.address} style="flex: 1 1 auto">
                    <input type="password" class="component wide" placeholder="Authentication" bind:value={auth.password} style="flex: 1 1 auto">
                </div>
            </div>
        {/each}
        <button class="component normal" on:click={() => AddItem("auth")}>{@html SVG.plus}Add API Authentication</button>
    </Accordion>
    
    {#each prompt_categories as category}
        <Accordion name={category.label}>
            {#each $currentSettings.presets[category.key] as main, i}
                <div class="preset">
                    <div class="controls">
                        <button class="component info" title="Duplicate" on:click={() => DuplicateItem(category.key, i, main)}>{@html SVG.copy}</button>
                        <button class="component danger" title="Remove" on:click={() => RemoveItem(category.key, i)}>{@html SVG.trashcan}</button>
                    </div>
                    <div class="fields">
                        <input type="text" class="component wide" placeholder="{category.label} Title" bind:value={main.name} style="flex: 1 1 auto">
                        <textarea class="component wide" placeholder="Content" rows={8} bind:value={main.content}></textarea>
                    </div>
                </div>
            {/each}
            <button class="component normal" on:click={() => AddItem(category.key)}>{@html SVG.plus}Add {category.label}</button>
        </Accordion>
    {/each}

<div></div>

</div>


<style>
    :global(p) {
        margin: 0px;
    }

    h1{
        margin: 0;
        font-size: 40px;
    }

    hr{
        color: gray;
        opacity: 0.25;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }
    
    .content{
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
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