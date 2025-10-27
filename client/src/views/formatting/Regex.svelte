<script lang="ts">
    import Accordion from "@/components/Accordion.svelte";
    import Heading from "@/components/Heading.svelte";
    import Segmented from "@/components/Segmented.svelte";
    import * as SVG from "@/svg/Common.svelte";
    import { onMount } from "svelte";

    const modes = [
        { key: "always", label: "Always" },
        { key: "on_reply", label: "On reply" },
        { key: "on_edit", label: "On edit" },
    ]

    const regexFlags = [
        { key: "g", label: "Global", description: "Don't return after first match." },
        { key: "m", label: "Multiline", description: "^ and $ match beginning and end of line." },
        { key: "i", label: "Insensitive", description: "Case insensitive match." },
        { key: "y", label: "Sticky", description: "Anchor to start of pattern or at the end of the most recent match." },
        { key: "u", label: "Unicode", description: "Match with full unicode." },
        { key: "s", label: "Single line", description: "Dot matches newline." },
    ]

    // export let open : boolean = false;
    export let name : string = "";
    export let enabled : boolean = true;
    export let pattern : string = "";
    export let replacement : string = "";
    export let mode : string = modes[0].key;
    export let flags : string = "g";

    export let remove = () => {}

    let selectedFlags : Array<boolean> = regexFlags.map(f => flags.includes(f.key))

    // build flags string based on selected flags
    $: flags = selectedFlags.map((e, i) => e ? regexFlags[i].key : "").join("")

    onMount(() => {
        if( !mode ){
            mode = modes[0].key
        }
    })

</script>

<div class="section">
    <div class="row">
        <input type="checkbox" class="component" bind:checked={enabled}>

        <Accordion name={name || pattern || "Text replacement"} bind:enabled={enabled}>

            <div class="section content" class:disabled={!enabled}>
                <div class="section">
                    <Heading title="Name"/>
                    <input type="text" class="component wide" placeholder="Pattern name" bind:value={name}>
                </div>


                <div class="section">
                    <Heading title="RegEx"/>
                    <div class="fields">
                        <input type="text" class="component wide" placeholder="Pattern" bind:value={pattern}/>
                        <div class="separator disabled">{@html SVG.arrow}</div>
                        <textarea class="component wide" placeholder="Replacement" rows={5} bind:value={replacement} style="flex: 1 1 auto"/>
                    </div>
                </div>

                <div class="section">
                    <Heading title="Flags"/>
                    <div class="section horizontal content wrap">
                        {#each regexFlags as flag, i}
                        <label title={flag.description}>
                            <input type="checkbox" class="component flag" bind:checked={selectedFlags[i]}>
                            {flag.label}
                        </label>
                        {/each}
                    </div>
                </div>

                <Segmented
                    bind:value={mode}
                    elements={modes}
                    key={(e) => e.key}
                    label={(e) => e.label}
                />
            </div>

        </Accordion>

        <div class="controls">
            <button class="component danger" title="Remove" on:click={remove}>{@html SVG.trashcan}</button>
        </div>
    </div>
</div>

<style>
    .row{
        display: grid;
        grid-template-columns: 32px auto 32px;
        gap: 8px;
    }

    .content{
        gap: 16px
    }

    .fields{
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .disabled{
        opacity: 0.25;
    }

    .controls{
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .controls .component{
        padding: 6px;
    }

    input[type="checkbox"]{
        align-self: center;
        width: 20px;
        height: 20px;
    }

    label{
        font-size: 0.9em;
    }

    .flag{
        width: 16px;
        height: 16px;
    }

    .controls button{
        width: 32px;
        height: 32px;
    }

    .separator{
        width: 100%;
        height: 24px;
        display: flex;
    }


    .separator :global(svg){
        transform: scaleX(-1) rotate(-90deg);
        translate: 1px 0px;
        width: 100%;
        height: 100%;
    }
</style>