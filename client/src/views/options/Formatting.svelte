<script lang="ts">
    import Regex from "@/views/formatting/Regex.svelte";
    import { currentSettingsMain } from "@/State";
    import * as Server from "@/Server";
    import * as SVG from "@/svg/Common.svelte";

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
    {#each $currentSettingsMain.formatting.replace as rep, i}
        <Regex
            bind:name={rep.name}
            bind:enabled={rep.enabled}
            bind:pattern={rep.pattern}
            bind:replacement={rep.replacement}
            bind:mode={rep.mode}
            bind:flags={rep.flags}
            remove={() => RemoveItem("replace", i)}
        />
    {/each}
    <button class="component normal" on:click={() => AddItem("replace")}>{@html SVG.add}Add Text Replace</button>
</div>


<style>
    .content{
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-sizing: border-box;
    }
</style>