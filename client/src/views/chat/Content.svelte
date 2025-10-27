<script lang="ts">
    import DOMPurify from 'dompurify';

    import { marked } from 'marked';
    import { addToggleableBlocks } from "@/utils/ToggleableBlock";

    import type { IChat } from "@shared/types";
    import * as Format from "@shared/format.ts";

    export let author : string = ""
    export let content : string = ""
    export let reasoning : string = ""

    export let user : string
    export let bot : string
    export let chat : IChat

    let displayReasoning = ""
    let displayText = ""

    $: {
        if( reasoning ){
            displayReasoning = DOMPurify.sanitize( displayReasoning )
            displayReasoning = marked.parse(reasoning)
            displayReasoning = `<thinking>${displayReasoning}</thinking>`
        }else{
            displayReasoning = ""
        }

        if( content ){
            displayText = DOMPurify.sanitize( displayText )
            displayText = marked.parse(content)
            displayText = Format.parseMacros( displayText, chat )
            displayText = Format.parseNames( displayText, user, bot )
        }else{
            displayText = ""
        }
    }
</script>

{#if displayReasoning}
    <div class="text grow" use:addToggleableBlocks={{name: `Reasoning`, content: displayReasoning}}>{@html displayReasoning}</div>
{/if}
<div class="text grow" use:addToggleableBlocks={{name: `${author}'s thoughts`, content: displayText}}>{@html displayText}</div>


<style>
    .text{
        display: flex;
        flex-direction: column;
        white-space: normal;
        color: var( --content-primary-300 );
        gap: 1em;
    }

    .text :global(h1), .text :global(h2), .text :global(h3), .text :global(h4), .text :global(h5), .text :global(h6){
        line-height: 1em;
    }

    .text :global(*){
        margin: 0px;
        text-align: start;
    }

    .text :global(em){
        color: var( --content-secondary-200 );
    }

    .text :global(code){
        color: var( --code-color-text );
        font-size: 0.8em;
        background: var( --code-color-background );
    }

    .text :global(pre){
        background: hsl(285, 5%, 12%);
        white-space: pre-wrap;
        background: var( --code-color-background );
        border-radius: 6px;
        padding: 8px 12px;
        line-height: 1.2em;
    }

    .text :global(th){
        font-size: 80%;
        background: var( --surface-neutral-200 );
    }

    .text :global(td){
        font-size: 90%;
        background: var( --surface-neutral-100 );
        vertical-align: top;
    }

    .text :global(td), .text :global(th){
        width: max-content;
        word-break: keep-all;
        min-width: 0px;
        padding: 6px 12px;
        border: 2px solid color-mix(in srgb, var( --surface-neutral-200 ) 85%, black 15%);
    }

    .text :global(table){
        border-collapse: collapse;
        max-width: 100%;
        table-layout: auto;
    }

    .text :global(img){
        max-width: 100%;
    }

    .text :global(blockquote){
        border-left: 4px solid var( --content-primary-200 );
        padding-left: 1em;
    }

    .text :global(.quote){
        font-style: italic;
    }

    .text :global(.thinking){
        position: relative;
        width: fit-content;
        display: flex;
        flex-direction: column;
        white-space: normal;
        gap: 4px;
        padding: 10px 16px;
        border-radius: 6px;
        color: var( --content-secondary-300 );
        background: color-mix(in srgb, var( --content-secondary-300 ) 10%, transparent 100%);
        border: 1px dashed color-mix(in srgb, var( --content-secondary-300 ) 25%, transparent 100%);
        user-select: text;
    }

    .text :global(.thinking ul){
        margin: 0px;
        padding-left: 2em;
        line-height: 1.5em;
    }

    .text :global(.thinking svg){
        width: 12px;
        height: 12px;
    }

    .text :global(.thinking button){
        inset: 0px;
        padding: 0px;
    }

    .text :global(.thinking .heading){
        display: flex;
        font-style: italic;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        width: 100%;
    }

    .text :global(.thinking .content){
        display: none;
    }

    .text :global(.thinking.active .content){
        display: unset;
    }
</style>