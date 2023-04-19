<script>
    import { connected, api } from "./State";
</script>

{#if $api === null }
    <div class="disabled">Connecting...</div>
{:else}
    {#if $api}
        <div class="confirm">Connected!</div>
    {:else}
        <div class="danger">Not connected.</div>
    {/if}
{/if}

<style>
    * {
        pointer-events: none;
    }
</style>