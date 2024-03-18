<script lang="ts">
    import Avatar from "../components/Avatar.svelte";
    import Heading from "../components/Heading.svelte";
    import Dropdown from "../components/Dropdown.svelte";
    import Preset from "../components/Preset.svelte";
    import * as Server from "../modules/Server.svelte";
    import { currentProfile, currentPresets, defaultPrompt } from "../State";

    const key : string = "persona";
    const avatarStyles = [
        { key: "round", title: "Round" },
        { key: "square", title: "Square" },
        { key: "portrait", title: "Portrait" },
    ]
</script>

<div class="content wide" on:change={() => Server.request("/save_profile", $currentProfile)}>
    <div class="section">
        <Heading title="Display Name" description="User's name displayed in chat."/>
        <input type="text" class="component wide" bind:value={$currentProfile.name}>
    </div>

    <div class="section avatar grid">
        <div class="avatar container">
            <Avatar is_bot={false} size={80}/>
        </div>
        
        <div class="section" style="gap: 24px">
            <div class="section">
                <Heading title="Avatar Image" description="User avatar URL."/>
                <input type="text" class="component wide" bind:value={$currentProfile.avatar}>
            </div>

            <Dropdown 
                bind:value={$currentProfile.customization.avatarShape} 
                choices={avatarStyles} 
                title="Avatar Style" 
                description="Define the avatar style in chat."
                wide={true}
            />
        </div>
    </div>

    <div class="section">
        <div>
            <div class="title">User Persona</div>
            <div class="explanation">{$defaultPrompt.persona.description}</div>
        </div>

        <Preset
            bind:elements={ $currentPresets[key] } 
            bind:content={ $currentProfile.persona } 
            key={key}
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