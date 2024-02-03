export default class Profile{
    static path = "../user/profile.json"

    constructor(){
        Profile.Validate( {} );
    }

    static Validate(obj){
        if( !obj.name ){ 
            obj.name = "You" 
        }

        if( !obj.persona ){ 
            obj.persona = "" 
        }

        if( !obj.avatar ){ 
            obj.avatar = "" 
        }

        if( !obj.customization ){ 
            obj.customization = {} 
        }
    }
}