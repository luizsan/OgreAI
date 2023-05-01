<script>
    import { api, sectionSettings, currentSettings, availableAPIModes, availableAPISettings } from "../State";
    import { serverRequest } from "./Server.svelte";
    import Screen from "../components/Screen.svelte";
    import Status from "../components/Status.svelte";

    $: APImode = $currentSettings != null ? $currentSettings.api_mode : "";

    async function GetAPIStatus(){
        if($api === null) return
        $api = null;
        $api = await serverRequest( "/get_api_status", $currentSettings )
    }
</script>

{#if $sectionSettings && $currentSettings != null}
    <Screen>
        <div class="content" on:change={() => serverRequest("/save_settings", $currentSettings)}>

            <div class="section">
                <div class="title">API Mode</div>
                <div class="setting">
                    <select class="component">
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
                        <input type="text" class="component" placeholder="Insert API URL or key..." bind:value={$currentSettings[APImode].api_target} style="flex: 1 1 auto">
                        <button class="component normal" style="flex: 0 0 auto" on:click={GetAPIStatus}>Check Status</button>
                    </div>
                </div>
            </div>
            
        <hr>

        {#each Object.entries( $availableAPISettings ) as [key, entry]}
            <div class="section">
                <div class="title">{entry.title}</div>
                <div class="explanation">{entry.description}</div>
                <div class="setting">
                    {#if entry.type == "textarea"}
                        <textarea class="component" rows={6} bind:value={$currentSettings[APImode][key]}></textarea>
                    {:else if entry.type == "select"}
                        <select class="component" bind:value={$currentSettings[APImode][key]}>
                            {#each entry.choices as choice}
                                <option value={choice}>{choice}</option>
                            {/each}
                        </select>
                    {:else if entry.type == "range"}
                        <div class="input">
                            <input type="text" class="component" bind:value={$currentSettings[APImode][key]}>
                            <input type="range" class="component" bind:value={$currentSettings[APImode][key]} min={entry.min} max={entry.max} step={entry.step}>
                        </div>
                    {:else if entry.type == "checkbox"}
                        <input type="checkbox" class="component" bind:checked={$currentSettings[APImode][key]}>
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
        color: #80808020;
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