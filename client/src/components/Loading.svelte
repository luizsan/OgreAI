<script>
    export let width = 24;
    export let height = 24;
</script>

<svg viewBox="0 0 100 100" width={width} height={height} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
    <circle cx="50" cy="50" r="36" class="loading-outer" stroke-width="10" fill="none"/>
    <circle cx="50" cy="50" r="36" class="loading-inner" stroke-width="8" stroke-linecap="round">
        <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 50 50;180 50 50;720 50 50" keyTimes="0;0.5;1"/>
        <animate attributeName="stroke-dasharray" repeatCount="indefinite" dur="1s" values="18.84955592153876 169.64600329384882;94.2477796076938 94.24777960769377;18.84955592153876 169.64600329384882" keyTimes="0;0.5;1"/>
    </circle>
</svg>

<style>
    .loading-outer{
        fill: none;
        stroke: var( --accent-color-normal);
        stroke-linecap: round;
        stroke-width: 12;
    }

    .loading-inner{
        fill: none;
        stroke: var( --accent-color-light);
        stroke-linecap: round;
        stroke-width: 12;
    }
</style>