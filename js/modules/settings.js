class Settings{
    constructor(){
        this.Reset();
    }

    static path = "./user/settings.json"

    SetFrom(json){
        if( json.api_url ) this.api_url = json.api_url
        if( json.max_length ) this.max_length = json.max_length
        if( json.context_size ) this.context_size = json.context_size
        if( json.temperature ) this.temperature = json.temperature
        if( json.repetition_penalty ) this.repetition_penalty = json.repetition_penalty
        if( json.repetition_slope ) this.repetition_slope = json.repetition_slope
        if( json.penalty_range ) this.penalty_range = json.penalty_range
        if( json.top_p ) this.top_p = json.top_p
        if( json.top_k ) this.top_k = json.top_k
        if( json.typical_p ) this.typical_p = json.typical_p
    }

    Reset(){
        this.api_url = ""
        this.max_length = 128
        this.context_size = 1024
        this.temperature = 0.5
        this.repetition_penalty = 1.05
        this.repetition_slope = 1
        this.penalty_range = 1024
        this.top_p = 0.9
        this.top_k = 40
        this.typical_p = 1
    }
}

exports.Settings = Settings