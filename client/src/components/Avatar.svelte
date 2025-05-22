<script lang="ts">
    import { run } from 'svelte/legacy';

    import { currentProfile, localServer } from '../State';
    import type { ICharacter } from '@shared/types';

    interface Props {
        is_bot: boolean;
        size?: number;
        character?: ICharacter;
    }

    let { is_bot, size = 56, character = null }: Props = $props();

    let w : number = $state();
    let h : number = $state();
    let ratio : number = $state(1);
    let roundness : number = $state(50);
    let unit : string = $state("%")

    const avatar_user_default = localServer + "/img/user_default.png";
    const protocol_regex = /^([a-zA-Z]+):\/\//;

    let append : string = $state();
    let img : string = $state();
    let url : string = $state();

    run(() => {

        if($currentProfile.customization){
            switch($currentProfile.customization.avatarShape){
                case "square":
                    roundness = 5;
                    unit = "px"
                    ratio = 1;
                    break;

                case "portrait":
                    roundness = 5;
                    unit = "px"
                    ratio = (2 / 3.0)
                    break;

                default:
                    roundness = 50;
                    unit = "%"
                    ratio = 1;
                    break;
            }
        }

        w = size;
        h = size * ( ratio >= 1 ? ratio : (1.0 / ratio ));

        if(is_bot && character){
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

<div class="avatar" style="background-image: url({url}); width: {w}px; height: {h}px; border-radius: {roundness}{unit}"></div>

<style>
    .avatar{
        background: #00000020;
        background-size: cover;
        background-position: center;
    }
</style>