<script lang="ts">
    import Accordion from "../components/Accordion.svelte";
    import { currentSettingsMain } from "../State";
    import * as Server from "./Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    function AddItem(key : string){
        $currentSettingsMain.formatting[key].push({ pattern: "", replacement: "", enabled: true })
        $currentSettingsMain.formatting[key] = $currentSettingsMain.formatting[key];
    }

    function RemoveItem(key : string, id : number){
        $currentSettingsMain.formatting[key].splice(id, 1)
        $currentSettingsMain.formatting[key] = $currentSettingsMain.formatting[key];
        Server.request("/save_main_settings", { data: $currentSettingsMain })
    }
</script>


<div class="content wide" on:change={() => Server.request("/save_main_settings", { data: $currentSettingsMain })}>
    <div>
        <h1>Formatting</h1>
        <p class="explanation">Use regex to automatically format text when receiving replies.</p>
        <hr>
    </div>

    <Accordion name="Text Replace">
        {#each $currentSettingsMain.formatting.replace as rep, i}
            <div class="preset">
                <div class="controls">
                    <input type="checkbox" class="component" bind:checked={rep.enabled}>
                </div>
                <div class="fields" class:disabled={!rep.enabled}>
                    <input type="text" class="component wide" placeholder="Pattern" bind:value={rep.pattern} style="flex: 1 1 auto">
                    <div class="separator normal">{@html SVG.arrow}</div>
                    <input type="text" class="component wide" placeholder="Replacement" bind:value={rep.replacement} style="flex: 1 1 auto">
                </div>
                <div class="controls">
                    <button class="component danger" title="Remove" on:click={() => RemoveItem("replace", i)}>{@html SVG.trashcan}</button>
                </div>
            </div>
        {/each}
        <button class="component normal" on:click={() => AddItem("replace")}>{@html SVG.plus}Add Text Replace</button>
    </Accordion>

<div></div>

</div>


<style>
    :global(p) {
        margin: 0px;
    }

    h1{
        margin: 0;
        line-height: 2em;
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
        grid-template-columns: 32px auto 32px;
        gap: 8px;
    }

    .fields{
        display: flex;
        flex-direction: row;
        gap: 4px;
    }

    .disabled{
        opacity: 0.25;
    }

    .controls{
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .controls .component{
        padding: 6px;
    }

    .separator{
        width: 48px;
        height: 100%;
        display: flex;
    }

    .separator :global(svg){
        transform: scaleX(-1);
        translate: 0px -2px;
    }

    .component :global(svg){
        width: 16px;
        height: 16px;
    }

</style>