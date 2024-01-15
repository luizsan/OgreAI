export default class Profile{
    static path = "../user/profile.json"

    constructor(){
        this.Reset();
    }

    SetFrom(json){
        if( json.name ) this.name = json.name
        if( json.avatar ) this.avatar = json.avatar
        if( json.customization ) this.customization = json.customization
    }

    Reset(){
        this.name = "You"
        this.avatar = ""
        this.customization = {}
    }
}