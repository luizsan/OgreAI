import type {
    ICharacter,
    IError,
    IReply,
    ISettings,
    IUser
} from "../../shared/types.d.ts";

import { parseNames } from "../../shared/format.mjs";


export interface IAPISettings{
    title: string;
    description: string;
    /**
     * The type of setting. Accepted strings are:
     * - "select": A dropdown selection from predefined choices.
     * - "range": A numeric slider within a specified range.
     * - "checkbox": A toggleable true/false option.
     * - "text": A single-line text input.
     * - "textarea": A multi-line text input.
    **/
    type: string;
    default: any;
}

export default abstract class API {
    prototype: any

    abstract API_NAME: string
    abstract API_VERSION: string
    abstract API_ADDRESS: string
    abstract API_SETTINGS: Record<string, IAPISettings>

    abstract getStatus(settings: object): Promise<boolean>
    abstract getTokenCount( text: string, model: string ): number
    abstract makePrompt( content: any, offset?: number ): any
    abstract generate( content: any ): Promise<any>
    abstract receiveData( raw: string, swipe: boolean ): IReply | { error: any }
    abstract receiveStream( raw: string, swipe: boolean, replace?: boolean ): IReply | IError

    // temporarily store malformed message chunks to possibly recombine with future requests
    __message_chunk: string = ""

    // create a new reply object
    createReply(swipe?: boolean, replace?: boolean): IReply {
        return {
            done: false,
            participant: 0,
            swipe: swipe,
            replace: replace,
            candidate: {
                text: "",
                model: undefined,
                timestamp: Date.now()
            }
        }
    }

    // clean incoming stream data and separate it into lines
    cleanIncomingStream( raw: string ): string[]{
        const buffer = (this.__message_chunk || "") + ( raw.includes(":") ? raw : "")
        const lines = buffer.replace(/data: /gm, '\n').split('\n').filter(line => line.trim() !== '').filter(Boolean);
        return lines
    }

    getCharacterTokens( character: ICharacter, user: IUser, settings: ISettings ): Record<string, number> {
        let count_system: number = 0
        const data_system = ["system_prompt", "post_history_instructions"]
        data_system.forEach(key => {
            count_system += this.getTokenCount( character.data[key], settings.model )
        })

        return {
            system: count_system,
            greeting: this.getTokenCount( character.data.first_mes, settings.model ),
            description: this.getTokenCount( character.data.description, settings.model ),
            personality: this.getTokenCount( character.data.personality, settings.model ),
            scenario: this.getTokenCount( character.data.scenario, settings.model ),
            dialogue: this.getTokenCount( character.data.mes_example, settings.model )
        }
    }

    sanitizeStopSequences(list: any, user: IUser, character: ICharacter): Array<string>{
        if( !list || !Array.isArray(list) )
            return [] as Array<string>
        return list.map((item: any) => parseNames(item, user.name, character.data.name)) as Array<string>
    }

    handleError(error: any, raw: string) {
        if( error instanceof SyntaxError ){
            console.error("Partial or broken JSON received, buffering...")
            this.__message_chunk += raw
        }else{
            console.error("Unexpected error during JSON parsing.", error)
            this.__message_chunk = ""
        }
    }
}