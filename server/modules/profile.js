class Profile{
    constructor(){
        this.Reset();
    }

    static path = "./user/profile.json"

    SetFrom(json){
        if( json.name ) this.name = json.name
        if( json.avatar ) this.avatar = json.avatar
    }

    Reset(){
        this.name = "You"
        this.avatar = ""
    }
}

const _Profile = Profile;
export { _Profile as Profile };