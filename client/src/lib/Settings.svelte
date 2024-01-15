<script lang="ts">
    import Accordion from "../components/Accordion.svelte";
    import { currentSettings, availableAPIModes, availableAPISettings, fetching } from "../State";
    import Status from "../components/Status.svelte";
    import * as Server from "./Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    $: api_mode = $currentSettings.api_mode

    let presetElements = {}

    async function getSettings(){
        $fetching = true;

        let mode = $currentSettings.api_mode
        $availableAPISettings = await Server.request( "/get_api_settings", { api_mode: mode })
        if( !$currentSettings[mode] ){
            $currentSettings[mode] = {}
        }

        Object.keys( $availableAPISettings ).forEach( key => {
            if( !$currentSettings[mode][key] ){
                $currentSettings[mode][key] = $availableAPISettings[key].default
            }
        });

        $fetching = false;
    }

    function setAPIAuth(){
        const index = presetElements["auth"]
        if( index < 0 ) return;
        $currentSettings[api_mode].api_url = $currentSettings.presets.auth[ index ].address
        $currentSettings[api_mode].api_auth = $currentSettings.presets.auth[ index ].password
        Server.request("/save_settings", $currentSettings)
    }

    function setPrompt(key : string){
        const index = presetElements[key]
        if( index < 0 ) return;
        $currentSettings[api_mode][key] = $currentSettings.presets[key][ index ].content
        Server.request("/save_settings", $currentSettings)
    }

    function clearPrompt(key : string){
        $currentSettings[api_mode][key] = ""
        Server.request("/save_settings", $currentSettings)
    }

    function addListItem(key : string, item : any, limit = -1){
        if( limit > -1 && $currentSettings[api_mode][key].length >= limit ){
            return
        }
        $currentSettings[api_mode][key].push(item)
        $currentSettings[api_mode][key] = $currentSettings[api_mode][key];
    }

    function removeListItem(key : string, index : number){
        $currentSettings[api_mode][key].splice(index, 1)
        $currentSettings[api_mode][key] = $currentSettings[api_mode][key];
    }
</script>


<div class="content wide" on:change={() => Server.request("/save_settings", $currentSettings)}>
    <div>
        <h1>Settings</h1>
        <p class="explanation">Change application-wide settings.</p>
        <hr>
    </div>

    <div class="section">
        <div class="title">API Mode</div>
        <div class="setting">
            <select class="component min" bind:value={$currentSettings.api_mode} on:change={getSettings}>
                {#each $availableAPIModes as entry}
                    <option value={entry.key}>{entry.title}</option>
                {/each}
            </select>
        </div>
    </div>

    <div class="section">
        <div class="title"><div class="inline">API Target <Status/></div></div>
        <div class="setting">
            <div class="section vertical">
                {#if $currentSettings.presets.auth.length > 0}
                    <div class="section horizontal wrap">
                        <select class="component" bind:value={presetElements["auth"]} on:change={setAPIAuth} style="flex: 1 1 auto">
                            <option value={-1}>-- Select a preset --</option>
                            {#each $currentSettings.presets.auth as entry, i}
                                <option value={i}>{entry.name ?? `Preset ${i}`}</option>
                            {/each}
                        </select>
                        <button class="component normal" on:click={setAPIAuth}>Apply</button>
                    </div>
                {/if}
                
                <input type="text" class="component wide" placeholder="Insert API URL..." bind:value={$currentSettings[api_mode].api_url} style="flex: 1 1 auto">
                <input type="password" class="component wide" placeholder="Insert API authentication..." bind:value={$currentSettings[api_mode].api_auth} style="flex: 1 1 auto">
                <button class="component normal" on:click={Server.getAPIStatus}>Check Status</button>
            </div>
        </div>
    </div>

<div></div>

{#each Object.entries( $availableAPISettings ) as [key, entry]}
    <div class="section">
        <div>
            <div class="title">{entry.title}</div>
            <div class="explanation">{entry.description}</div>
        </div>

        <div class="setting vertical">

            {#if $currentSettings[api_mode][key] !== undefined }

                {#if (key == "base_prompt" || key == "sub_prompt" || key == "prefill_prompt") && $currentSettings.presets[key].length > 0}
                    <div class="section horizontal wrap">
                        <select class="component" bind:value={presetElements[key]} on:change={() => setPrompt(key)} style="flex: 1 1 auto">
                            <option value={-1}>-- Select a prompt --</option>
                            {#each $currentSettings.presets[key] as entry, i}
                                <option value={i}>{entry.name ?? `Preset ${i}`}</option>
                            {/each}
                        </select>
                        <button class="component normal" on:click={() => setPrompt(key)}>Apply</button>
                        <button class="component danger" on:click={() => clearPrompt(key)}>Clear</button>
                    </div>
                    <div></div>
                {/if}

                {#if entry.type == "text"}
                    <input type="text" class="component" bind:value={$currentSettings[api_mode][key]}>

                {:else if entry.type == "textarea"}
                    <textarea class="component wide" rows={8} bind:value={$currentSettings[api_mode][key]}></textarea>

                {:else if entry.type == "select"}
                    <select class="component min" bind:value={$currentSettings[api_mode][key]}>
                        {#each entry.choices as choice}
                            <option value={choice}>{choice}</option>
                        {/each}
                    </select>

                {:else if entry.type == "range"}
                    <div class="input wide">
                        <input type="text" class="component" bind:value={$currentSettings[api_mode][key]}>
                        <input type="range" class="component" bind:value={$currentSettings[api_mode][key]} min={entry.min} max={entry.max} step={entry.step}>
                    </div>

                {:else if entry.type == "checkbox"}
                    <input type="checkbox" class="component" bind:checked={$currentSettings[api_mode][key]}>

                {:else if entry.type == "list"}
                    <Accordion name={`List ${
                        entry.limit && entry.limit > -1 ? 
                        "(" + $currentSettings[api_mode][key].length + " of " + entry.limit + ")" : 
                        "(" + $currentSettings[api_mode][key].length + ")"}`
                    }>
                        {#each $currentSettings[api_mode][key] as item, i}
                            <div class="section horizontal preset">
                                <button class="component danger" title="Remove" on:click={() => removeListItem(key, i)}>{@html SVG.trashcan}</button>
                                <input type="text" class="component wide" placeholder="Empty item" bind:value={item} style="flex: 1 1 auto">
                            </div>
                        {/each}
                        <button class="component normal" on:click={() => addListItem(key, "", entry.limit)}>{@html SVG.plus}Add</button>
                    </Accordion>
                {/if}

            {/if}
            
        </div>
    </div>
{/each}

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

    .title{
        font-weight: 600;
        margin: 0px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }
    
    .inline{
        display: flex;
        gap: 8px;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        padding: 16px 16px 32px 16px;
        box-sizing: border-box;
    }

    .input{
        display: grid;
        grid-template-columns: 72px auto;
        gap: 16px;
    }

    .setting{
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .min{
        align-self: flex-start;
    }

    .preset{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 4px;
    }
    
    .preset .component{
        padding: 6px;
    }

    .component :global(svg){
        width: 16px;
        height: 16px;
    }

</style>