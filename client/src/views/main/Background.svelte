<script lang="ts">
    import { localServer, currentCharacter, currentPreferences } from "@/State";

    let vertical = $derived($currentPreferences["chat_background"] === "vertical");
    let coverage = ($derived($currentPreferences["background_coverage"] ?? 50));
    let opacity = $derived(($currentPreferences["background_opacity"] ?? 10) * 0.01);

    let width = $derived(vertical ? "100%" : `${coverage}%`);
    let height = $derived(vertical ? `${coverage}%` : "100%")
    let position = $derived(vertical ? "top center" : "center left");
    let rotation = $derived(vertical ? "0.5turn" : "0.25turn");

    let uri = $derived($currentCharacter ? encodeURI($currentCharacter.temp.filepath) : "");
    let backgroundPath = $derived(localServer + "/user/characters/" + uri.replace("../", "") + "?" + new Date().getTime());

    const opacity_ratio : number = 1.0
</script>

{#if $currentPreferences["chat_background"]}

<div class="background" style={`
    --image: url(${backgroundPath});
    --width: ${width};
    --height: ${height};
    --position: ${position};
    --rotation: ${rotation};
    --opacity: ${opacity * opacity_ratio};
    `}
></div>

{/if}

<style>
    .background{
        position: absolute;
        top: 0px;
        left: 0px;
        max-width: 100%;
        width: var( --width );
        height: var( --height );
        background-image: var( --image );
        background-size: cover;
        background-position: var( --position );
        background-repeat: no-repeat;
        opacity: var( --opacity );
    }

    .background::after{
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient( var(--rotation), rgba(255, 255, 255, 0), var( --default-bg-color));
        pointer-events: none;
    }
</style>