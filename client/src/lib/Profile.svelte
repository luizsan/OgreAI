<script>
    import { currentProfile } from "../State";
    import * as Server from "./Server.svelte";

</script>

<div class="content wide" on:change={() => Server.request("/save_profile", $currentProfile)}>
    <div>
        <h1>User Profile</h1>
        <hr>
    </div>

    <div class="section">
        <div>
            <div class="title">Display Name</div>
            <div class="explanation">User's name displayed in chat</div>
        </div>

        <input type="text" class="component wide" bind:value={$currentProfile.name}>
    </div>

    <div class="section">
        <div>
            <div class="title">Avatar</div>
            <div class="explanation">User avatar URL</div>
        </div>
        <input type="text" class="component wide" bind:value={$currentProfile.avatar}>
    </div>
</div>


<style>
    :global(p) {
        margin: 0px;
    }

    h1{
        margin-bottom: 0;
        font-size: 40px;
    }

    hr{
        color: gray;
        opacity: 0.25;
    }    

    .title{
        font-weight: 600;
        margin: 0px;
    }

    .explanation{
        color: #606060;
        font-size: 85%;
    }

    .content{
        display: flex;
        flex-direction: column;
        gap: 32px;
        padding: 24px;
        box-sizing: border-box;
    }
</style>