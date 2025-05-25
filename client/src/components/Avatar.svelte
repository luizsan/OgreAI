<script lang="ts">
    import { currentProfile, localServer } from '../State';
    import type { ICharacter } from '@shared/types';

    interface Props {
        size?: number;
        character?: ICharacter;
    }

    let {
        size = 56,
        character = null
    }: Props = $props();

    const protocol_regex = /^([a-zA-Z]+):\/\//;
    const avatar_user_default = localServer + "/img/user_default.png";
    const avatar_style = {
        "portrait": { roundness: `${5}px`, ratio: (2.0 / 3.0) },
        "square": { roundness: `${5}px`, ratio: 1 },
        "round": { roundness: `${50}%`, ratio: 1 }
    }

    let shape: string = $derived($currentProfile?.customization?.avatarShape)
    let roundness : string = $derived(avatar_style[shape]?.roundness || `${5}px`);
    let ratio : number = $derived(avatar_style[shape]?.ratio || 1);
    let w : number = $derived(size);
    let h : number = $derived(size * ( ratio >= 1 ? ratio : (1.0 / ratio )));

    let append : string;
    let img : string;
    let url : string = $state();

    let is_bot: boolean = $derived(!!character);

    $effect(() => {
        if(character){
            img = localServer + "/user/characters/" + character.temp.filepath.replace("../", "")
            append = is_bot ? "?" + character.metadata.modified : "";
        }else{
            img = $currentProfile.avatar ? $currentProfile.avatar : avatar_user_default;
            if(!protocol_regex.test(img)){
                img = localServer + "/" + img;
            }
            append = ""
        }
        url = encodeURIComponent(img).replace(/%2F/g, '/').replace(/%3A/g, ':') + append;
    });
</script>

<div style="background-image: url({url}); width: {w}px; height: {h}px; border-radius: {roundness}"></div>

<style>
    div{
        background: #00000020;
        background-size: cover;
        background-position: center;
    }
</style>