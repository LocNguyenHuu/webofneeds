port module Actions exposing (connectPersona)

import Application exposing (Id)
import Json.Encode as Encode exposing (Value)


port outPort : { action : String, payload : Value } -> Cmd msg


connectPersona :
    { personaUrl : Id
    , needUrl : Id
    }
    -> Cmd msg
connectPersona { personaUrl, needUrl } =
    outPort
        { action = "personas__connect"
        , payload =
            Encode.list Encode.string
                [ needUrl
                , personaUrl
                ]
        }
