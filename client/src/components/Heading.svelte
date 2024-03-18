<script lang="ts">
    export let title : string = ""
    export let description : string = ""
</script>

{#if title}
    <div class="section">
        <div>
            <div class="title">{title}</div>
            {#if description}
                <div class="explanation">{description}</div>
            {/if}
        </div>
    </div>
{/if}