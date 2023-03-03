class Profile{
    constructor(){
        this.Reset();
    }

    static path = "./user/profile.json"

    SetFrom(json){
        if( json.name ) this.name = json.name
        if( json.avatar ) this.name = json.avatar
    }

    Reset(){
        this.name = "You"
        this.avatar = ""
    }
}

exports.Profile = Profile