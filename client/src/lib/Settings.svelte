<script>
    import { currentSettingsMain, defaultSettingsAPI, currentSettingsAPI, currentPresets, availableAPIModes, fetching } from "../State";
    import Accordion from "../components/Accordion.svelte";
    import Auth from "../components/Auth.svelte";
    import Checkbox from "../components/Checkbox.svelte";
    import Dropdown from "../components/Dropdown.svelte";
    import Heading from "../components/Heading.svelte";
    import Loading from "../components/Loading.svelte";
    import Slider from "../components/Slider.svelte";
    import Status from "../components/Status.svelte";
    import * as Server from "../modules/Server.svelte";
    import * as SVG from "../utils/SVGCollection.svelte";

    let loading = false;

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
        $currentPresets = $currentPresets;
        $fetching = false;
    }

    async function saveSettings(){
        const mode = $currentSettingsMain.api_mode
        await Server.request("/save_main_settings", { data: $currentSettingsMain })
        await Server.request("/save_api_settings", { api_mode: mode, data: $currentSettingsAPI })
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


<div class="content wide" class:disabled={loading}>
    <div class="section" class:loading={loading} on:change={ async () => {
        loading = true;
        await getSettings()
        await saveSettings()
        loading = false;
    }}>
        <Dropdown bind:value={$currentSettingsMain.api_mode} choices={$availableAPIModes} title="API Mode"/>
    </div>

    {#if loading}
        <div class="center">
            <Loading width={24} height={24}/>
        </div>
    {:else}
        <div class="section" on:change={saveSettings}>
            <div class="title"><div class="inline">API Target <Status/></div></div>
            <div class="setting">
                <div class="section vertical">
                    <Auth
                        bind:elements={$currentPresets.api_auth}
                        bind:url={$currentSettingsAPI.api_url}
                        bind:auth={$currentSettingsAPI.api_auth}
                    />
                    <button class="component normal" on:click|preventDefault={Server.getAPIStatus}>Check Status</button>
                </div>
            </div>
        </div>

        <hr class="component">

        {#each Object.entries($defaultSettingsAPI) as [key, entry]}

        <div class="section" on:change={saveSettings}>

            <div class="setting vertical">

                {#if $currentSettingsAPI[key] !== undefined }

                    {#if entry.type == "text"}
                        <div class="section">
                            <Heading title={entry.title} description={entry.description}/>
                            <input type="text" class="component" placeholder={entry.placeholder} bind:value={$currentSettingsAPI[key]}>
                        </div>  

                    {:else if entry.type == "textarea"}
                        <div class="section">
                            <Heading title={entry.title} description={entry.description}/>
                            <textarea class="component wide" rows={8} placeholder={entry.placeholder} bind:value={$currentSettingsAPI[key]}></textarea>
                        </div>

                    {:else if entry.type == "select"}
                        <Dropdown 
                            bind:value={$currentSettingsAPI[key]} 
                            choices={entry.choices} 
                            editable={key == "model"} 
                            title={entry.title} 
                            description={entry.description}
                        />

                    {:else if entry.type == "range"}
                        <Slider 
                            bind:value={$currentSettingsAPI[key]} 
                            original={entry.default} 
                            min={entry.min} 
                            max={entry.max} 
                            step={entry.step} 
                            title={entry.title} 
                            description={entry.description}
                            unit={entry.unit}
                        />
                    {:else if entry.type == "checkbox"}
                        <Checkbox 
                            bind:value={$currentSettingsAPI[key]} 
                            title={entry.title} 
                            description={entry.description}
                        />

                    {:else if entry.type == "list"}
                        <div class="section">
                        <Heading title={entry.title} description={entry.description}/>
                        <Accordion size={$currentSettingsAPI[key].length} limit={entry.limit} showSize={true}>
                            {#each $currentSettingsAPI[key] as item, i}
                                <div class="section horizontal preset">
                                    <button class="component danger" title="Remove" on:click={() => removeListItem(key, i)}>{@html SVG.trashcan}</button>
                                    <input type="text" class="component wide" placeholder="Empty item" bind:value={item} style="flex: 1 1 auto">
                                </div>
                            {/each}
                            <button class="component normal" on:click={() => addListItem(key, "", entry.limit)}>{@html SVG.plus}Add</button>
                        </Accordion>
                        </div>
                    {/if}

                {/if}
                
            </div>
        </div>
        {/each}
    {/if}
</div>

<style>
    hr{
        border-style: dashed;
    }

    .inline{
        display: flex;
        gap: 8px;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    .loading{
        opacity: 0.25;
    }

    .setting{
        gap: 4px;
    }

    .preset{
        display: grid;
        grid-template-columns: 32px auto;
        gap: 4px;
    }
    
    .preset .component{
        padding: 6px;
    }
</style>