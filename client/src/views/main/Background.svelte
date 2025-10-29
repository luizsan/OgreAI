<script lang="ts">
    import {
        localServer,
        currentCharacter,
        currentPreferences,
        editing,
        fetching
    } from "@/State";
    import { onMount } from "svelte";

    $: enabled = !!($currentPreferences["chat_background"]);
    $: vertical = $currentPreferences["chat_background"] === "vertical";
    $: coverage = ($currentPreferences["background_coverage"] ?? 50);
    $: opacity = ($currentPreferences["background_opacity"] ?? 10) * 0.01;

    $: width = vertical ? "100%" : `${coverage}%`;
    $: height = vertical ? `${coverage}%` : "100%"
    $: position = vertical ? "top center" : "center left";
    $: rotation = vertical ? "0.5turn" : "0.25turn";
    $: fade = vertical ? "top" : "left";

    let uri = "";
    let backgroundPath = ""
    let timestamp = 0;

    $: if( !($fetching || $editing) ){
        refreshImage();
    }

    onMount(() => {
        refreshImage();
    })

    function refreshImage(){
        uri = $currentCharacter ? encodeURI($currentCharacter.temp.filepath) : "";
        backgroundPath = $currentCharacter ? localServer + "/user/characters/" + uri.replace("../", "") : ""
        timestamp = $currentCharacter ? new Date().getTime() : 0; // hack to un-cache the URL
    }
</script>

{#if enabled}

<div class="background" style={`
    --image: url(${backgroundPath}?${timestamp});
    --width: ${width};
    --height: ${height};
    --position: ${position};
    --rotation: ${rotation};
    --opacity: ${opacity};
    --fade: ${fade};
    `}
></div>

{/if}

<style>
    .background{
        position: fixed;
        inset: 0px;
        width: var( --width );
        height: var( --height );
        background-image: var( --image );
        background-size: cover;
        background-position: var( --position );
        background-repeat: no-repeat;
        -webkit-mask-image: linear-gradient(to var( --fade ), transparent, white);
        mask-image: linear-gradient(to var( --fade ), transparent, white);
        opacity: var( --opacity );
    }

</style>