<script lang="ts">
    export let title : string = ""
    export let description : string = ""
    export let scale : number = 1;
    export let reverse : boolean = false;
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

    .explanation{
        color: var( --content-primary-100 );
    }
</style>