<script>
    import { connected, api, sectionSettings, currentSettings, availableAPIModes, availableAPISettings } from "./State";
    import { serverRequest } from "./Server.svelte";
    import Screen from "./Screen.svelte";
    import Status from "./Status.svelte";

    $: targetAPI = $currentSettings != null ? $currentSettings.api_mode : "";


    async function ConnectToAPI(){
        if($api === null) return
        $api = null;
        $api = await serverRequest( "/get_api_status", { api_mode: $currentSettings.api_mode, api_target: $currentSettings.api_target })
    }
</script>

{#if $sectionSettings && $currentSettings != null}
    <Screen>
        <div class="content" on:change={() => serverRequest("/save_settings", $currentSettings)}>

            <div class="section">
                <div class="title">API Mode</div>
                <div class="setting">
                    <select class="component">
                        {#each $availableAPIModes as choice}
                            <option value={choice}>{choice}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="section">
                <div class="title">API Target</div>
                <div class="explanation"><Status/></div>
                <div class="setting">
                    <input type="text" class="component" placeholder="Insert API URL or key..." bind:value={$currentSettings.api_target}>
                    <button class="component" on:click={ConnectToAPI}>Check Status</button>
                </div>
            </div>
            
        
        <hr>

        {#each Object.entries( $availableAPISettings ) as [key, entry]}
            <div class="section">
                <div class="title">{entry.title}</div>
                <div class="explanation">{entry.description}</div>
                <div class="setting">
                    {#if entry.type == "textarea"}
                        <textarea class="component" rows={6}>{$currentSettings[targetAPI][key]}</textarea>
                    {:else if entry.type == "select"}
                        <select class="component">
                            {#each entry.choices as choice}
                                <option value={choice}>{choice}</option>
                            {/each}
                        </select>
                    {:else if entry.type == "range"}
                        <div class="input">
                            <input type="text" class="component" bind:value={$currentSettings[targetAPI][key]}>
                            <input type="range" class="component" bind:value={$currentSettings[targetAPI][key]} min={entry.min} max={entry.max} step={entry.step}>
                        </div>
                    {:else if entry.type == "checkbox"}
                        <input type="checkbox" class="component" bind:checked={$currentSettings[targetAPI][key]}>
                    {/if}
                </div>
            </div>
        {/each}
        </div>
    </Screen>
{/if}

<style>
    :global(p) {
        margin: 0px;
    }

    hr{
        width: 100%;
        color: #FFFFFF10;
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
        width: 100%;
        flex-direction: column;
        gap: 32px;
        padding: 24px;
        box-sizing: border-box;
    }

    .input{
        display: grid;
        width: 100%;
        grid-template-columns: 64px auto;
        gap: 16px;
    }
</style>