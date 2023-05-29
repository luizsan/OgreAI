<script>
    import { currentSettings, availableAPIModes, availableAPISettings, fetching } from "../State";
    import Status from "../components/Status.svelte";
    import * as Server from "./Server.svelte";

    $: api_mode = $currentSettings.api_mode

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


</script>


<div class="content wide" on:change={() => Server.request("/save_settings", $currentSettings)}>
    <div>
        <h1>Settings</h1>
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
            <div class="">
                <input type="text" class="component wide" placeholder="Insert API URL..." bind:value={$currentSettings[api_mode].api_url} style="flex: 1 1 auto">
                <input type="password" class="component wide" placeholder="Insert API authentication..." bind:value={$currentSettings[api_mode].api_auth} style="flex: 1 1 auto">
                <button class="component normal" style="flex: 0 0 auto" on:click={Server.getAPIStatus}>Check Status</button>
            </div>
        </div>
    </div>

<div></div>

{#each Object.entries( $availableAPISettings ) as [key, entry]}
    <div class="section">
        <div class="title">{entry.title}</div>
        <div class="explanation">{entry.description}</div>
        <div class="setting">
            {#if entry.type == "text"}
                <input type="text" class="component wide" bind:value={$currentSettings[api_mode][key]}>
            {:else if entry.type == "textarea"}
                <textarea class="component wide" rows={6} bind:value={$currentSettings[api_mode][key]}></textarea>
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
        margin-bottom: 0;
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
        padding: 24px;
        box-sizing: border-box;
    }

    .input{
        display: grid;
        grid-template-columns: 64px auto;
        gap: 16px;
    }
</style>