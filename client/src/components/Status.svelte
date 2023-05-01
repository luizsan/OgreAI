<script>
    import { api } from "../State";
</script>

{#if $api === null }
    <span class="badge disabled">Connecting...</span>
{:else}
    {#if $api}
        <span class="badge confirm">Connected!</span>
    {:else}
        <span class="badge danger">Not connected</span>
    {/if}
{/if}

<style>
    * {
        pointer-events: none;
    }
    
    .badge{
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 75%;
        background: hsla(0, 0%, 10%, 75% );
        font-weight: 700;
        word-spacing: 4px;
    }

    .badge::before{
        content: "\25CF";
        margin-right: 6px;
    }

</style>