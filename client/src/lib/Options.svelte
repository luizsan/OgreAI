<script>
    import { sectionSettings, currentSettings } from "../State";
    import Screen from "../components/Screen.svelte";
    import Profile from "./Profile.svelte";
    import Settings from "./Settings.svelte"

    // export let tab = 0;
</script>

{#if $sectionSettings && $currentSettings != null}
    <Screen>
        <Profile/>
        <Settings/>
    </Screen>
{/if}