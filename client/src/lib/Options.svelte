<script>
    import { sectionSettings, currentSettings } from "@/State";
    import Screen from "@/components/Screen.svelte";
    import Settings from "@/lib/Settings.svelte"
</script>

{#if $sectionSettings && $currentSettings != null}
    <Screen>
        <Settings/>
    </Screen>
{/if}