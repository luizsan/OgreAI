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
        user.name = source.name || user.name || "You";
        user.persona = source.persona || user.persona || "";
        user.avatar = source.avatar || user.avatar || "";
        user.customization = source.customization || user.customization || {};
    }
}