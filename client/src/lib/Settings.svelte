<script lang="ts">
    import { currentSettings, availableAPIModes, availableAPISettings, fetching } from "../State";
    import Status from "../components/Status.svelte";
    import * as Server from "./Server.svelte";

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
        $currentSettings[api_mode].api_url = $currentSettings.presets.auth[ index ].address
        $currentSettings[api_mode].api_auth = $currentSettings.presets.auth[ index ].password
    }

    function setPrompt(key : string){
        const index = presetElements[key]
        $currentSettings[api_mode][key] = $currentSettings.presets[key][ index ].content
    }

    function clearPrompt(key : string){
        $currentSettings[api_mode][key] = ""
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
            <select class="component" bind:value={$currentSettings.api_mode} on:change={getSettings}>
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

            {#if (key == "base_prompt" || key == "sub_prompt") && $currentSettings.presets[key].length > 0}
                <div class="section horizontal">
                    <select class="component" bind:value={presetElements[key]} on:change={() => setPrompt(key)} style="flex: 1 1 auto">
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
                <input type="text" class="component wide" bind:value={$currentSettings[api_mode][key]}>
            {:else if entry.type == "textarea"}
                <textarea class="component wide" rows={8} bind:value={$currentSettings[api_mode][key]}></textarea>
            {:else if entry.type == "select"}
                <select class="component" bind:value={$currentSettings[api_mode][key]}>
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
        padding: 16px;
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
</style>