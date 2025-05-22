<script lang="ts">
    interface Props {
        title?: string;
        description?: string;
        scale?: number;
        reverse?: boolean;
    }

    let {
        title = "",
        description = "",
        scale = 1,
        reverse = false
    }: Props = $props();
</script>

{#if title}
    <div class="section" class:reverse={reverse}>
        <div class="title" style="font-size: {scale * 100}%">{title}</div>
        {#if description}
            <div class="explanation">{description}</div>
        {/if}
    </div>
{/if}

<style>
    .section{
        gap: 0px;
    }

    .reverse{
        flex-flow: column-reverse;
    }
</style>