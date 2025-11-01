<script lang="ts">
  import type {
    IPromptConfig
  } from "@shared/types";

  import {
    currentPresets,
    defaultPrompt
  } from "@/State";

  import { createEventDispatcher } from "svelte";
  import Preset from "@/components/Preset.svelte";
  import * as SVG from "@/svg/Common.svelte";

  export let item: Array<IPromptConfig>

  const dispatch = createEventDispatcher();
  const presets_categories = ["base_prompt", "sub_prompt", "prefill_prompt"]

  function toggleOpen(index: number){
    item[index].open = !item[index].open
    dispatch("change")
  }

  function removeAt(index: number){
    item.splice(index, 1);
    item = item;
    dispatch("change")
  }

  function dispatchChange(){
    dispatch("change")
  }
</script>


<div class="group">
{#each item as entry, i}
  {@const toggleable = $defaultPrompt[entry.key]?.toggleable}
  {@const editable = $defaultPrompt[entry.key]?.editable}
  {@const overridable = $defaultPrompt[entry.key]?.overridable}
  {@const label = $defaultPrompt[entry.key]?.label}

  <div class="container" class:open={item[i].open} on:change={dispatchChange}>
    <div class="main" >
      <div class="center toggle" class:disabled={!toggleable}>
        <label>
          {#if toggleable}
            <input type="checkbox" class="component small" title="Toggle" bind:checked={entry.enabled} on:mousedown|preventDefault>
          {:else}
            <input type="checkbox" class="component small" disabled checked={true}>
          {/if}
        </label>
      </div>

      <button class="normal borderless fold" class:disabled={!editable} on:click={() => toggleOpen(i)}>
        <div class="text deselect grow">
          {#if entry.key === "custom"}
            {entry.label || "Custom Prompt"}
          {:else}
            {label}
          {/if}
        </div>

        {#if editable}
          <div class="icon">
            {@html SVG.arrow}
          </div>
        {/if}
      </button>
    </div>

    {#if editable && item[i].open}
    <div class="inner section" class:custom={entry.key === "custom"}>

      {#if entry.key === "custom"}
        <div class="section horizontal custom">
          <input
            type="text"
            class="component borderless wide"
            placeholder="Custom Prompt"
            bind:value={ entry.label }
          >
          <select class="component borderless" bind:value={ entry.role }>
            <option value="user">User</option>
            <option value="assistant">Assistant</option>
            <option value="system">System</option>
          </select>
        </div>
      {:else}
        <div>
          <div class="explanation">{$defaultPrompt[entry.key]?.description}</div>
        </div>
      {/if}

      {#if presets_categories.includes(entry.key)}
        <Preset
          bind:elements={ $currentPresets[entry.key] }
          bind:content={ entry.content }
          key={ entry.key }
          resizable={true}
          borderless={false}
          highlighted={true}
          rows={$defaultPrompt[entry.key]?.row_size || 4}
        />
      {:else}
        <textarea
          class="component wide"
          rows={$defaultPrompt[entry.key]?.row_size || 4}
          bind:value={ entry.content }
        />
      {/if}

      {#if overridable}
        <div class="section horizontal center override">
          <label class="deselect explanation">
            <input type="checkbox" class="component small" title="Allow Override" bind:checked={ entry.allow_override }>
            <span>Allow Override</span>
          </label>
        </div>
      {/if}

      {#if entry.key === "custom"}
        <div class="section horizontal wide center">
          <button class="danger component custom delete" title="Remove" on:click={() => removeAt(i)}>
            {@html SVG.trashcan} Delete
          </button>
        </div>
      {/if}

    </div>
    {/if}
  </div>

{/each}
</div>

<style>
  .group{
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    gap: 0px;
  }

  .container{
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    margin: 2px 0px;
  }

  .container.open, .container:hover{
    border-radius: 6px;
  }

  .main{
    display: grid;
    grid-template-columns: 32px auto;
    align-items: center;
    gap: 0px;
    width: 100%;
    height: 100%;
    min-height: 32px;
  }

  .toggle{
    position: relative;
    height: 100%;
  }

  .toggle label{
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .toggle input[type="checkbox"]{
    margin: 0px;
    left: 50%;
    transform: translate(-50%, 0px);
  }

  .fold{
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
    gap: 8px;
    padding: 0px 8px;
  }

  .text{
    text-align: left;
    align-self: center;
  }

  .icon{
    align-self: center;
    scale: -1 1;
    transition: all 0.1s ease-in-out;
  }

  .open .icon{
    translate: -2px 0px;
    rotate: 90deg;
  }

  .inner{
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 16px 16px 8px;
    box-sizing: border-box;
  }

  .explanation{
    font-size: 80%;
    line-height: 1.2em;
  }

  .override label{
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
</style>