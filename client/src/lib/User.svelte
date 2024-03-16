<script lang="ts">
    import Avatar from "../components/Avatar.svelte";
    import Preset from "../components/Preset.svelte";
    import * as Server from "../modules/Server.svelte";
    import { currentProfile, currentPresets, defaultPrompt } from "../State";

    const key : string = "persona";
</script>

<div class="content wide" on:change={() => Server.request("/save_profile", $currentProfile)}>
    <div class="section">
        <div>
            <div class="title">Display Name</div>
            <div class="explanation">User's name displayed in chat.</div>
        </div>
        <input type="text" class="component wide" bind:value={$currentProfile.name}>
    </div>

    <div class="section avatar grid">
        <div class="avatar container">
            <Avatar is_bot={false} size={80}/>
        </div>
        
        <div class="section" style="gap: 24px">
            <div class="section">
                <div>
                    <div class="title">Avatar Image</div>
                    <div class="explanation">User avatar URL.</div>
                </div>
                <input type="text" class="component wide" bind:value={$currentProfile.avatar}>
            </div>

            <div class="section">
                <div>
                    <div class="title">Avatar Style</div>
                    <div class="explanation">Define the avatar style in chat.</div>
                </div>

                <select class="component" bind:value={$currentProfile.customization.avatarShape}>
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                    <option value="portrait">Portrait</option>
                </select>
            </div>
        </div>
    </div>

    <div class="section">
        <div>
            <div class="title">User Persona</div>
            <div class="explanation">{$defaultPrompt.persona.description}</div>
        </div>

        <Preset
            key={key}
            bind:elements={ $currentPresets[key] } 
            content={ $currentProfile.persona } 
            item={(v) => v.content } 
            update={(v) => $currentProfile.persona = v }
            resizable={true}
            rows={8}
        />
    </div>
</div>


<style>
    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        box-sizing: border-box;
    }

    .avatar.grid{
        display: grid;
        grid-template-columns: min-content auto;
        gap: 32px;
    }

    .avatar.container{
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
    }


</style>