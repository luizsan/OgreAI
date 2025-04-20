export default class Profile{
    static path = "../user/profile.json"

    constructor(){
        Profile.Validate( {} );
    }

    static Validate(obj){
        obj.name ||= "You";
        obj.persona ||= "";
        obj.avatar ||= "";
        obj.customization ||= {};
    }
}