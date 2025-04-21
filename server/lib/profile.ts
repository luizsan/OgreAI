import { IUser } from "../../shared/types.js";

export default class Profile{

    static create(): IUser{
        return {
            name: "You",
            persona: "",
            avatar: "",
            customization: {},
        }
    }

    static Validate(user: IUser, source: any){
        user.name = user.name || source.name || "You";
        user.persona = user.persona || source.persona || "";
        user.avatar = user.avatar || source.avatar || "";
        user.customization = user.customization || source.customization || {};
    }
}