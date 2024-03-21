<script lang="ts">
    import { localServer, currentCharacter, currentPreferences } from "../State";

    $: vertical = $currentPreferences["vertical_background"] ?? true;
    $: coverage = ($currentPreferences["background_coverage"] ?? 50);
    $: opacity = ($currentPreferences["background_opacity"] ?? 10) * 0.01;

    $: width = vertical ? "100%" : `${coverage}%`;
    $: height = vertical ? `${coverage}%` : "100%"
    $: position = vertical ? "top center" : "center left";
    $: rotation = vertical ? "0.5turn" : "0.25turn";

    $: uri = $currentCharacter ? encodeURI($currentCharacter.temp.filepath) : "";
    $: backgroundPath = localServer + "/" + uri.replace("../", "") + "?" + new Date().getTime();

    const opacity_ratio : number = 0.25
</script>

<div class="background" style={`
    --image: url(${backgroundPath});
    --width: ${width};
    --height: ${height};
    --position: ${position};
    --rotation: ${rotation};
    --opacity: ${opacity * opacity_ratio};
    `}
></div>

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