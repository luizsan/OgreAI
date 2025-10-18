<script lang="ts">
    import {
        localServer,
        currentCharacter,
        currentPreferences
    } from "@/State";

    $: enabled = !!($currentPreferences["chat_background"]);
    $: vertical = $currentPreferences["chat_background"] === "vertical";
    $: coverage = ($currentPreferences["background_coverage"] ?? 50);
    $: opacity = ($currentPreferences["background_opacity"] ?? 10) * 0.01;

    $: width = vertical ? "100%" : `${coverage}%`;
    $: height = vertical ? `${coverage}%` : "100%"
    $: position = vertical ? "top center" : "center left";
    $: rotation = vertical ? "0.5turn" : "0.25turn";
    $: fade = vertical ? "top" : "left";

    $: uri = $currentCharacter ? encodeURI($currentCharacter.temp.filepath) : "";
    $: backgroundPath = localServer + "/user/characters/" + uri.replace("../", "") + "?" + new Date().getTime();

    const opacity_ratio : number = 1.0
</script>

{#if enabled}

<div class="background" style={`
    --image: url(${backgroundPath});
    --width: ${width};
    --height: ${height};
    --position: ${position};
    --rotation: ${rotation};
    --opacity: ${opacity * opacity_ratio};
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