<script>
    import { currentSettingsMain, defaultSettingsAPI, currentSettingsAPI, currentPresets, availableAPIModes, fetching } from "../State";
    import Accordion from "../components/Accordion.svelte";
    import Status from "../components/Status.svelte";
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    let presetElements = {}

    async function getSettings(){
        $fetching = true;

        let mode = $currentSettingsMain.api_mode
        $defaultSettingsAPI = await Server.request( "/get_api_defaults", { api_mode: mode })
        $currentSettingsAPI = await Server.request( "/get_api_settings", { api_mode: mode })
        if( !$currentSettingsAPI ){
            $currentSettingsAPI = {}
        }

        Object.keys( $defaultSettingsAPI ).forEach( key => {
            if( !$currentSettingsAPI[key] ){
                $currentSettingsAPI[key] = $defaultSettingsAPI[key].default
            }
        });

        $currentSettingsAPI = $currentSettingsAPI;
        $fetching = false;
    }

    async function saveSettings(){
        const mode = $currentSettingsMain.api_mode
        await Server.request("/save_main_settings", { data: $currentSettingsMain })
        await Server.request("/save_api_settings", { api_mode: mode, data: $currentSettingsAPI })
    }

    function setAPIAuth(){
        const index = presetElements["api_auth"]
        if( index < 0 ) return;
        $currentSettingsAPI.api_url = $currentPresets.api_auth[ index ].address
        $currentSettingsAPI.api_auth = $currentPresets.api_auth[ index ].password
        Server.request("/save_api_settings", { 
            api_mode: $currentSettingsMain.api_mode, 
            data: $currentSettingsMain 
        })
    }

    function addListItem(key, item, limit = -1){
        if( limit > -1 && $defaultSettingsAPI[key].length >= limit ){
            return
        }
        $currentSettingsAPI[key].push(item)
        $currentSettingsAPI[key] = $currentSettingsAPI[key];
    }

    function removeListItem(key, index){
        $currentSettingsAPI[key].splice(index, 1)
        $currentSettingsAPI[key] = $currentSettingsAPI[key];
        saveSettings()
    }
</script>


<div class="content wide">
    <div class="section">
        <div class="title">API Mode</div>
        <div class="setting">
            <select class="component min" bind:value={$currentSettingsMain.api_mode} on:change={ async () => { 
                await getSettings()
                await saveSettings()
            }}>
                {#each $availableAPIModes as entry}
                    <option value={entry.key}>{entry.title}</option>
                {/each}
            </select>
        </div>
    </div>

    <div class="section" on:change={saveSettings}>
        <div class="title"><div class="inline">API Target <Status/></div></div>
        <div class="setting">
            <div class="section vertical">
                {#if $currentPresets.api_auth.length > 0}
                    <div class="section horizontal wrap">
                        <select class="component" bind:value={presetElements["api_auth"]} on:change={setAPIAuth} style="flex: 1 1 auto">
                            <option value={-1}>-- Select a preset --</option>
                            {#each $currentPresets.api_auth as entry, i}
                                <option value={i}>{entry.name ?? `Preset ${i}`}</option>
                            {/each}
                        </select>
                        <button class="component normal" on:click={setAPIAuth}>Apply</button>
                    </div>
                {/if}
                
                <div class="component container group">
                    <input type="text" class="component clear wide" placeholder="Insert API URL..." bind:value={$currentSettingsAPI.api_url} style="flex: 1 1 auto">
                    <hr>
                    <input type="password" class="component clear wide" placeholder="Insert API authentication..." bind:value={$currentSettingsAPI.api_auth} style="flex: 1 1 auto">
                </div>
                <button class="component normal" on:click|preventDefault={Server.getAPIStatus}>Check Status</button>
            </div>
        </div>
    </div>

<!-- <div></div> -->

    {#each Object.entries($defaultSettingsAPI) as [key, entry]}

    <div class="section" on:change={saveSettings}>
        {#if entry && entry.type && entry.type !== "checkbox" }
            <div>
                <div class="title">{entry.title}</div>
                <div class="explanation">{entry.description}</div>
            </div>
        {/if}

        <div class="setting vertical">

            {#if $currentSettingsAPI[key] !== undefined }

                {#if entry.type == "text"}
                <!-- {#if entry.type == "text"} -->
                    <input type="text" class="component" bind:value={$currentSettingsAPI[key]}>

                {:else if entry.type == "textarea"}
                    <textarea class="component wide" rows={8} bind:value={$currentSettingsAPI[key]}></textarea>

                {:else if entry.type == "select"}

                    {#if key == "model"}
                        <div class="component dropdown container min">
                            <select class="component borderless min" bind:value={$currentSettingsAPI[key]}>
                                {#each entry.choices as choice}
                                    <option value={choice}>{choice}</option>
                                {/each}
                            </select>
                            <input type="text" class="component" bind:value={$currentSettingsAPI[key]}>
                        </div>
                    {:else}
                        <select class="component min" bind:value={$currentSettingsAPI[key]}>
                            {#each entry.choices as choice}
                                <option value={choice}>{choice}</option>
                            {/each}
                        </select>
                    {/if}

                {:else if entry.type == "range"}
                    <div class="input wide horizontal" >
                        <button class="sub danger" title="Reset to default ({entry.default})" on:click={() => $currentSettingsAPI[key] = entry.default}>{@html SVG.refresh}</button>
                        <input type="number" class="component" style="padding-left: 40px" step={entry.step} bind:value={$currentSettingsAPI[key]}>
                        <input type="range" class="component" bind:value={$currentSettingsAPI[key]} min={entry.min} max={entry.max} step={entry.step}>
                    </div>

                {:else if entry.type == "checkbox"}
                    <div class="toggle wide vertical">
                        <label>
                            <input type="checkbox" class="component" bind:checked={$currentSettingsAPI[key]}>
                        </label>
                        <div>
                            <div class="title">{entry.title}</div>
                            <div class="explanation">{entry.description}</div>
                        </div>

                    </div>

                {:else if entry.type == "list"}
                    <Accordion name={`List ${
                        entry.limit && entry.limit > -1 ? 
                        "(" + $currentSettingsAPI[key].length + " of " + entry.limit + ")" : 
                        "(" + $currentSettingsAPI[key].length + ")"}`
                    }>
                        {#each $currentSettingsAPI[key] as item, i}
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

    .group{
        padding: 2px 8px;
    }

    .container{
        padding: 2px;
    }

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

    .toggle input[type="checkbox"]{
        translate: 0px 4px;
    }

    .sub :global(svg){
        translate: 0px 1px;
        width: 18px;
        height: 18px;
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