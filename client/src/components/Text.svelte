<script lang="ts">
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    import { addToggleableBlocks } from "../utils/ToggleableBlock";
    import * as Format from "@shared/format.mjs";

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
        margin-bottom: 1em;
        white-space: normal;
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
        color: rgb(106, 135, 149);
    }

    .text :global(code){
        color: var( --code-text-color );
        font-size: 0.85em;
        background: var( --code-bg-color );
    }

    .text :global(pre){
        background: hsl(285, 5%, 12%);
        white-space: pre-wrap;
        background: var( --code-bg-color );
        border-radius: 6px;
        padding: 8px;
        line-height: 1.2em;
    }

    .text :global(img){
        max-width: 100%;
    }

    .text :global(blockquote){
        border-left: 4px solid var( --default-font-color );
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
        color: var( --component-color-normal );
        background: color-mix(in srgb, var( --component-color-normal ) 10%, transparent 100%);
        border: 1px dashed color-mix(in srgb, var( --component-color-normal ) 25%, transparent 100%);
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