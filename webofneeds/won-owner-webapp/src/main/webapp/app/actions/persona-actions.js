import { getIn, get, generateIdString } from "../utils";
import won from "../won-es6";
import { getRandomWonId } from "../won-utils";
import { actionTypes } from "./actions";
import { getOwnedNeedByConnectionUri } from "../selectors/general-selectors";
import { getOwnedConnectionByUri } from "../selectors/connection-selectors";
import { buildConnectMessage, buildCloseMessage } from "../won-message-utils";

export function createPersona(persona, nodeUri) {
  return (dispatch, getState) => {
    const state = getState();
    if (!nodeUri) {
      nodeUri = getIn(state, ["config", "defaultNodeUri"]);
    }

    const publishedContentUri = nodeUri + "/need/" + getRandomWonId();
    const msgUri = nodeUri + "/event/" + getRandomWonId();

    //FIXME: THIS SHOULD NOT USE ANY OF THE CODE BELOW BUT EXECUTE OUR ALREADY PRESENT NEED-CREATION WITH A GIVEN DRAFT INSTEAD
    const graph = {
      "@id": publishedContentUri,
      "@type": ["won:Need", "won:Persona"],
      "won:hasFacet": [
        {
          "@id": "#holderFacet",
          "@type": "won:HolderFacet",
        },
        {
          "@id": "#reviewFacet",
          "@type": "won:ReviewFacet",
        },
      ],
      "won:hasFlag": [
        { "@id": "won:NoHintForCounterpart" },
        { "@id": "won:NoHintForMe" },
      ],
      "s:name": persona.displayName,
      "s:description": persona.aboutMe || undefined,
      "s:url": persona.website || undefined,
    };
    const graphEnvelope = {
      "@graph": [graph],
    };

    const msg = won.buildMessageRdf(graphEnvelope, {
      receiverNode: nodeUri, //mandatory
      senderNode: nodeUri, //mandatory
      msgType: won.WONMSG.createMessage, //mandatory
      publishedContentUri: publishedContentUri, //mandatory
      msgUri: msgUri,
    });

    msg["@context"]["@base"] = publishedContentUri;

    dispatch({
      type: actionTypes.personas.create,
      payload: {
        eventUri: msgUri,
        message: msg,
        needUri: publishedContentUri,
        persona: graph,
      },
    });
  };
}

async function connectReview(
  dispatch,
  ownPersona,
  foreignPersona,
  connectMessage,
  connectionUri = undefined
) {
  const getFacet = persona => {
    const reviewFacet = persona
      .getIn(["content", "facets"])
      .filter(facetType => facetType == "won:ReviewFacet")
      .keySeq()
      .first();

    if (!reviewFacet) {
      throw new Error(
        `Persona ${persona.get("uri")} does not have a review facet`
      );
    }
    return reviewFacet;
  };

  const cnctMsg = buildConnectMessage({
    ownedNeedUri: ownPersona.get("uri"),
    theirNeedUri: foreignPersona.get("uri"),
    ownNodeUri: ownPersona.get("nodeUri"),
    theirNodeUri: foreignPersona.get("nodeUri"),
    connectMessage: connectMessage,
    optionalOwnConnectionUri: connectionUri,
    ownFacet: getFacet(ownPersona),
    theirFacet: getFacet(foreignPersona),
  });
  const optimisticEvent = await won.wonMessageFromJsonLd(cnctMsg.message);
  dispatch({
    type: actionTypes.needs.connect,
    payload: {
      eventUri: cnctMsg.eventUri,
      message: cnctMsg.message,
      ownConnectionUri: connectionUri,
      optimisticEvent: optimisticEvent,
    },
  });
}

export function connectPersona(needUri, personaUri) {
  return async dispatch => {
    const response = await fetch("rest/action/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          pending: false,
          facet: `${personaUri}#holderFacet`,
        },
        {
          pending: false,
          facet: `${needUri}#holdableFacet`,
        },
      ]),
      credentials: "include",
    });
    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Could not connect identity: ${errorMsg}`);
    }
    dispatch({
      type: actionTypes.personas.connect,
      payload: {
        needUri: needUri,
        personaUri: personaUri,
      },
    });
  };
}

export function disconnectPersona(needUri, personaUri) {
  return (dispatch, getState) => {
    const state = getState();
    const persona = state.getIn(["needs", personaUri]);
    const need = state.getIn(["needs", needUri]);

    const connectionUri = persona
      .get("connections")
      .filter(
        connection =>
          connection.get("remoteNeedUri") == need.get("uri") &&
          connection.get("facet") == won.WON.HolderFacetCompacted
      )
      .keySeq()
      .first();

    const connection = getOwnedConnectionByUri(state, connectionUri);

    buildCloseMessage(
      connectionUri,
      personaUri,
      needUri,
      persona.get("nodeUri"),
      need.get("nodeUri"),
      connection.get("remoteConnectionUri")
    ).then(({ eventUri, message }) => {
      dispatch({
        type: actionTypes.connections.close,
        payload: {
          connectionUri,
          eventUri,
          message,
        },
      });
    });
  };
}

export function reviewPersona(reviewableConnectionUri, review) {
  return (dispatch, getState) => {
    const state = getState();
    const connection = getOwnedConnectionByUri(state, reviewableConnectionUri);

    const ownNeed = getOwnedNeedByConnectionUri(state, reviewableConnectionUri);
    const foreignNeedUri = get(connection, "remoteNeedUri");
    const foreignNeed = getIn(state, ["needs", foreignNeedUri]);

    const getPersona = need => {
      const personaUri = get(need, "heldBy");
      const persona = state.getIn(["needs", personaUri]);

      return persona;
    };

    const getConnection = (ownPersona, foreignPersona) => {
      return ownPersona
        .get("connections")
        .filter(
          connection =>
            connection.get("remoteNeedUri") == foreignPersona.get("uri") &&
            connection.get("facet") == won.WON.ReviewFacet
        )
        .keySeq()
        .first();
    };

    const ownPersona = getPersona(ownNeed);
    const foreignPersona = getPersona(foreignNeed);
    const identifier = "review";
    const reviewRdf = {
      "s:review": {
        "@type": "s:Review",
        "@id":
          reviewableConnectionUri && identifier
            ? reviewableConnectionUri +
              "/" +
              identifier +
              "/" +
              generateIdString(10)
            : undefined,

        "s:about": foreignPersona.get("uri"),
        "s:author": ownPersona.get("uri"),
        "s:reviewRating": {
          "@type": "s:Rating",
          "@id":
            reviewableConnectionUri && identifier
              ? reviewableConnectionUri +
                "/" +
                identifier +
                "/" +
                generateIdString(10)
              : undefined,
          "s:bestRating": { "@value": 5, "@type": "xsd:int" }, //not necessary but possible
          "s:ratingValue": { "@value": review.value, "@type": "xsd:int" },
          "s:worstRating": { "@value": 1, "@type": "xsd:int" }, //not necessary but possible
        },
        "s:description": review.message,
      },
    };

    connectReview(
      dispatch,
      ownPersona,
      foreignPersona,
      reviewRdf,
      getConnection(ownPersona, foreignPersona)
    );
  };
}
