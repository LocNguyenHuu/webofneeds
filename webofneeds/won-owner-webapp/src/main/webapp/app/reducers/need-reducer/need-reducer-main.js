/**
 * Created by syim on 11.12.2015.
 */
import { actionTypes } from "../../actions/actions.js";
import Immutable from "immutable";
import won from "../../won-es6.js";
import { msStringToDate, getIn } from "../../utils.js";
import {
  addOwnActiveNeedsInLoading,
  addOwnInactiveNeedsInLoading,
  addOwnInactiveNeedsToLoad,
  addTheirNeedsInLoading,
  addNeed,
  addNeedInCreation,
  changeNeedState,
} from "./reduce-needs.js";
import {
  addMessage,
  addExistingMessages,
  markMessageAsRead,
  markMessageAsRelevant,
} from "./reduce-messages.js";
import {
  addConnectionFull,
  addActiveConnectionsToNeedInLoading,
  markConnectionAsRated,
  setConnectionLoadingMessages,
  markConnectionAsRead,
  selectNeedByConnectionUri,
  changeConnectionState,
  changeConnectionStateByFun,
  storeConnectionsData,
  updateAgreementStateData,
  setShowAgreementData,
} from "./reduce-connections.js";

const initialState = Immutable.fromJS({});

export default function(allNeedsInState = initialState, action = {}) {
  switch (action.type) {
    case actionTypes.logout:
    case actionTypes.needs.clean:
      return initialState;

    case actionTypes.loginStarted:
      // starting a new login process. this could mean switching
      // to a different session. we need to mark any needs
      // that are already loaded as non-owned.
      return allNeedsInState.map(need =>
        need.set("ownNeed", false).set("connections", Immutable.Map())
      );

    case actionTypes.initialPageLoad:
    case actionTypes.needs.fetchUnloadedNeeds:
    case actionTypes.login: {
      const activeNeedUris = action.payload.get("activeNeedUris");
      const inactiveNeedUris = action.payload.get("inactiveNeedUris");
      const inactiveNeedUrisLoading = action.payload.get(
        "inactiveNeedUrisLoading"
      );
      const theirNeedUrisInLoading = action.payload.get(
        "theirNeedUrisInLoading"
      );

      const needUriForConnections = action.payload.get("needUriForConnections");
      const activeConnectionUrisLoading = action.payload.get(
        "activeConnectionUrisLoading"
      );

      let ownNeeds = action.payload.get("ownNeeds");
      ownNeeds = ownNeeds ? ownNeeds : Immutable.Set();
      let theirNeeds = action.payload.get("theirNeeds");
      theirNeeds = theirNeeds ? theirNeeds : Immutable.Set();

      const stateWithOwnInactiveNeedUrisToLoad = addOwnInactiveNeedsToLoad(
        allNeedsInState,
        inactiveNeedUris
      );

      const stateWithOwnInactiveNeedUrisInLoading = addOwnInactiveNeedsInLoading(
        stateWithOwnInactiveNeedUrisToLoad,
        inactiveNeedUrisLoading
      );

      const stateWithOwnNeedUrisInLoading = addOwnActiveNeedsInLoading(
        stateWithOwnInactiveNeedUrisInLoading,
        activeNeedUris
      );

      const stateWithOwnNeeds = ownNeeds.reduce(
        (updatedState, ownNeed) => addNeed(updatedState, ownNeed, true),
        stateWithOwnNeedUrisInLoading
      );

      const stateWithOwnNeedsAndTheirNeedsInLoading = addTheirNeedsInLoading(
        stateWithOwnNeeds,
        theirNeedUrisInLoading
      );

      const stateWithOwnAndTheirNeeds = theirNeeds.reduce(
        (updatedState, theirNeed) => addNeed(updatedState, theirNeed, false),
        stateWithOwnNeedsAndTheirNeedsInLoading
      );

      const stateWithConnectionsToLoad = addActiveConnectionsToNeedInLoading(
        stateWithOwnAndTheirNeeds,
        needUriForConnections,
        activeConnectionUrisLoading
      );

      return storeConnectionsData(
        stateWithConnectionsToLoad,
        action.payload.get("connections")
      );
    }

    case actionTypes.messages.closeNeed.failed:
      return storeConnectionsData(
        allNeedsInState,
        action.payload.get("connections")
      );

    case actionTypes.router.accessedNonLoadedPost:
      return addNeed(allNeedsInState, action.payload.get("theirNeed"), false);

    case actionTypes.needs.fetch:
      return action.payload.reduce(
        (updatedState, ownNeed) => addNeed(updatedState, ownNeed, true),
        allNeedsInState
      );

    case actionTypes.messages.reopenNeed.failed:
      return storeConnectionsData(
        allNeedsInState,
        action.payload.get("connections")
      );

    case actionTypes.needs.reopen:
      return changeNeedState(
        allNeedsInState,
        action.payload.ownNeedUri,
        won.WON.ActiveCompacted
      );

    case actionTypes.needs.close:
      return changeNeedState(
        allNeedsInState,
        action.payload.ownNeedUri,
        won.WON.InactiveCompacted
      );

    case actionTypes.needs.create: // optimistic need adding
      return addNeedInCreation(
        allNeedsInState,
        action.payload.need,
        action.payload.needUri
      );
    //return addNeedInCreation(allNeedsInState, action.payload.needList, action.payload.needUri);
    case actionTypes.needs.createSuccessful:
      return addNeed(allNeedsInState, action.payload.need, true);

    case actionTypes.connections.load:
      return action.payload.reduce(
        (updatedState, connectionWithRelatedData) =>
          storeConnectionAndRelatedData(
            updatedState,
            connectionWithRelatedData,
            false
          ),
        allNeedsInState
      );

    case actionTypes.messages.openMessageReceived:
    case actionTypes.messages.connectMessageReceived: {
      const ownNeedFromState = allNeedsInState.get(action.payload.ownNeedUri);
      const remoteNeed = action.payload.remoteNeed;

      // let changedState = ownNeedFromState
      //   ? allNeedsInState
      //   : addNeed(allNeedsInState, ownNeed, true);
      let changedState;

      if (!ownNeedFromState) {
        throw new Error(
          "Would need to call addNeed with ownNeed, but it is not defined!"
        );
      } else {
        changedState = allNeedsInState;
      }

      //guarantee that remoteNeed is in state
      changedState = addNeed(changedState, remoteNeed, false);
      if (action.type == actionTypes.messages.connectMessageReceived) {
        changedState = addConnectionFull(
          changedState,
          action.payload.connection
        );
      }

      if (action.payload.message) {
        changedState = addMessage(changedState, action.payload.message);
      }
      changedState = changeConnectionStateByFun(
        changedState,
        action.payload.updatedConnection,
        state => {
          if (!state) return won.WON.RequestReceived; //fallback if no state present
          if (state == won.WON.RequestSent) return won.WON.Connected;
          if (state == won.WON.Suggested) return won.WON.RequestReceived;
          if (state == won.WON.Closed) return won.WON.RequestReceived;
          return won.WON.RequestReceived;
        }
      );
      return changedState;
    }
    case actionTypes.messages.hintMessageReceived:
      return storeConnectionAndRelatedData(
        allNeedsInState,
        action.payload,
        true
      );

    // NEW CONNECTIONS STATE UPDATES
    case actionTypes.connections.close:
      return changeConnectionState(
        allNeedsInState,
        action.payload.connectionUri,
        won.WON.Closed
      );

    case actionTypes.needs.connect: {
      // user has sent a connect request
      const optimisticEvent = action.payload.optimisticEvent;
      const ownNeedUri = optimisticEvent.getSenderNeed();
      const theirNeedUri = optimisticEvent.getReceiverNeed();
      const eventUri = optimisticEvent.getMessageUri();
      let stateUpdated;

      if (action.payload.ownConnectionUri) {
        stateUpdated = changeConnectionState(
          allNeedsInState,
          action.payload.ownConnectionUri,
          won.WON.RequestSent
        );
        //because we have a connection uri, we can add the message
        return addMessage(stateUpdated, action.payload.optimisticEvent);
      } else {
        const tmpConnectionUri = "connectionFrom:" + eventUri;
        //need to wait for success-response to sett hat
        const optimisticConnection = Immutable.fromJS({
          uri: tmpConnectionUri,
          usingTemporaryUri: true,
          state: won.WON.RequestSent,
          remoteNeedUri: theirNeedUri,
          unread: true,
          messages: {
            [eventUri]: {
              uri: eventUri,
              text: optimisticEvent.getTextMessage(),
              date: msStringToDate(optimisticEvent.getSentTimestamp()),
              outgoingMessage: true,
              unread: true,
              connectMessage: true,
              isRelevant: true,
            },
          },
        });
        return allNeedsInState.setIn(
          [ownNeedUri, "connections", tmpConnectionUri],
          optimisticConnection
        );
      }
    }
    case actionTypes.connections.open: {
      // user has sent an open request
      const cnctStateUpdated = changeConnectionStateByFun(
        allNeedsInState,
        action.payload.connectionUri,
        state => {
          if (!state) return won.WON.RequestSent; //fallback if no state present
          if (state == won.WON.RequestReceived) return won.WON.Connected;
          if (state == won.WON.Suggested) return won.WON.RequestSent;
          if (state == won.WON.Closed) return won.WON.RequestSent;
        }
      );
      return addMessage(cnctStateUpdated, action.payload.optimisticEvent);
    }
    case actionTypes.messages.open.failure:
      return changeConnectionState(
        allNeedsInState,
        action.payload.events["msg:FromSystem"].hasReceiver,
        won.WON.RequestReceived
      );

    case actionTypes.messages.open.successRemote:
    case actionTypes.messages.connect.successRemote: {
      // use the remote success message to obtain the remote connection
      // uri (which we may not have known)
      const wonMessage = action.payload;
      const connectionUri = wonMessage.getReceiver();
      const needUri = wonMessage.getReceiverNeed();
      const remoteConnectionUri = wonMessage.getSender();

      if (allNeedsInState.getIn([needUri, "connections", connectionUri])) {
        const eventUri = wonMessage.getIsRemoteResponseTo();
        // we want to use the response date to update the original message
        // date
        allNeedsInState = allNeedsInState.setIn(
          [
            needUri,
            "connections",
            connectionUri,
            "messages",
            eventUri,
            "isReceivedByRemote",
          ],
          true
        );

        return allNeedsInState.setIn(
          [needUri, "connections", connectionUri, "remoteConnectionUri"],
          remoteConnectionUri
        );
      } else {
        console.warn(
          "Open/Connect success for a connection that is not stored in the state yet, connUri: ",
          connectionUri
        );
        return allNeedsInState;
      }
    }

    case actionTypes.messages.connect.successOwn: {
      // TODO SRP; split in isSuccessOfAdHocConnect, addAddHoc(?) and
      // changeConnectionState
      const wonMessage = action.payload;
      const eventUri = wonMessage.getIsResponseTo();
      const tmpConnectionUri = "connectionFrom:" + wonMessage.getIsResponseTo();
      const connectionUri = wonMessage.getReceiver();
      const needForTmpCnct = selectNeedByConnectionUri(
        allNeedsInState,
        tmpConnectionUri
      );
      const unsortedAdHocConnection =
        needForTmpCnct &&
        needForTmpCnct.getIn(["connections", tmpConnectionUri]);
      if (unsortedAdHocConnection) {
        // connection was established from scratch without having a
        // connection uri. now that we have the uri, we can store it
        // (see connectAdHoc)
        const needUri = needForTmpCnct.get("uri");
        if (!needForTmpCnct.get("ownNeed")) {
          throw new Error(
            'Trying to add/change connection for need that\'s not an "ownNeed".'
          );
        }

        const properConnection = unsortedAdHocConnection
          .delete("usingTemporaryUri")
          .set("uri", connectionUri);

        allNeedsInState = allNeedsInState
          .deleteIn([needUri, "connections", tmpConnectionUri])
          .mergeDeepIn(
            [needUri, "connections", connectionUri],
            properConnection
          );

        allNeedsInState = allNeedsInState.setIn(
          [
            needUri,
            "connections",
            connectionUri,
            "messages",
            eventUri,
            "isReceivedByOwn",
          ],
          true
        );

        return allNeedsInState;
      } else {
        // connection has been stored as match first
        allNeedsInState = changeConnectionState(
          allNeedsInState,
          connectionUri,
          won.WON.RequestSent
        );

        const needFromConnection = selectNeedByConnectionUri(
          allNeedsInState,
          connectionUri
        );

        if (needFromConnection) {
          allNeedsInState = allNeedsInState.setIn(
            [
              needFromConnection.get("uri"),
              "connections",
              connectionUri,
              "messages",
              eventUri,
              "isReceivedByOwn",
            ],
            true
          );
        }

        return allNeedsInState;
      }
    }

    case actionTypes.messages.close.success:
      return changeConnectionState(
        allNeedsInState,
        action.payload.getReceiver(),
        won.WON.Closed
      );
    case actionTypes.messages.markAsRead:
      return markMessageAsRead(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri
      );
    case actionTypes.messages.markAsRelevant:
      return markMessageAsRelevant(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.relevant
      );
    case actionTypes.connections.markAsRead:
      return markConnectionAsRead(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.needUri
      );
    case actionTypes.connections.markAsRated:
      return markConnectionAsRated(
        allNeedsInState,
        action.payload.connectionUri
      );
    case actionTypes.connections.setLoadingMessages:
      return setConnectionLoadingMessages(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.isLoadingMessages
      );

    case actionTypes.connections.updateAgreementData:
      return updateAgreementStateData(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.agreementData
      );
    case actionTypes.connections.showAgreementData:
      return setShowAgreementData(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.showAgreementData
      );
    // NEW MESSAGE STATE UPDATES
    case actionTypes.messages.connectionMessageReceived:
      // ADD RECEIVED CHAT MESSAGES
      // payload; { events }
      return addMessage(allNeedsInState, action.payload);

    case actionTypes.connections.sendChatMessage:
      // ADD SENT TEXT MESSAGE
      /*
             * payload: { eventUri: optimisticEvent.uri, message,
             * optimisticEvent, }
             */
      return addMessage(allNeedsInState, action.payload.optimisticEvent);

    // update timestamp on success response
    case actionTypes.messages.open.successOwn:
    case actionTypes.messages.chatMessage.successOwn: {
      const wonMessage = getIn(action, ["payload"]);
      const eventUri = wonMessage.getIsResponseTo();
      const needUri = wonMessage.getReceiverNeed();
      const connectionUri = wonMessage.getReceiver();
      // we want to use the response date to update the original message
      // date
      // in order to use server timestamps everywhere
      const responseDateOnServer = msStringToDate(wonMessage.getTimestamp());
      // make sure we have an event with that uri:
      const eventToUpdate = allNeedsInState.getIn([
        needUri,
        "connections",
        connectionUri,
        "messages",
        eventUri,
      ]);
      if (eventToUpdate) {
        allNeedsInState = allNeedsInState.setIn(
          [needUri, "connections", connectionUri, "messages", eventUri, "date"],
          responseDateOnServer
        );
        allNeedsInState = allNeedsInState.setIn(
          [
            needUri,
            "connections",
            connectionUri,
            "messages",
            eventUri,
            "isReceivedByOwn",
          ],
          true
        );
      }
      return allNeedsInState;
    }

    case actionTypes.messages.chatMessage.failure: {
      const wonMessage = getIn(action, ["payload"]);
      const eventUri = wonMessage.isFromExternal()
        ? wonMessage.getIsRemoteResponseTo()
        : wonMessage.getIsResponseTo();
      const needUri = wonMessage.getReceiverNeed();
      const connectionUri = wonMessage.getReceiver();

      allNeedsInState = allNeedsInState.setIn(
        [
          needUri,
          "connections",
          connectionUri,
          "messages",
          eventUri,
          "failedToSend",
        ],
        true
      );
      return allNeedsInState;
    }

    case actionTypes.messages.chatMessage.successRemote: {
      const wonMessage = getIn(action, ["payload"]);
      const eventUri = wonMessage.getIsRemoteResponseTo();
      const needUri = wonMessage.getReceiverNeed();
      const connectionUri = wonMessage.getReceiver();

      allNeedsInState = allNeedsInState.setIn(
        [
          needUri,
          "connections",
          connectionUri,
          "messages",
          eventUri,
          "isReceivedByRemote",
        ],
        true
      );
      return allNeedsInState;
    }

    case actionTypes.connections.showLatestMessages:
    case actionTypes.connections.showMoreMessages: {
      const isLoadingMessages = action.payload.get("isLoadingMessages");
      const connectionUri = action.payload.get("connectionUri");

      if (isLoadingMessages && connectionUri) {
        allNeedsInState = setConnectionLoadingMessages(
          allNeedsInState,
          connectionUri,
          true
        );
      }

      const loadedMessages = action.payload.get("events");
      if (loadedMessages) {
        allNeedsInState = addExistingMessages(allNeedsInState, loadedMessages);
        allNeedsInState = setConnectionLoadingMessages(
          allNeedsInState,
          connectionUri,
          false
        );
      }
      const error = action.payload.get("error");

      if (error && connectionUri) {
        allNeedsInState = setConnectionLoadingMessages(
          allNeedsInState,
          connectionUri,
          false
        );
      }

      return allNeedsInState;
    }

    default:
      return allNeedsInState;
  }
}

function storeConnectionAndRelatedData(state, connectionWithRelatedData) {
  const { ownNeed, remoteNeed, connection } = connectionWithRelatedData;
  // guarantee that ownNeed is in state:
  const stateWithOwnNeed = addNeed(state, ownNeed, true);

  // guarantee that  remoteNeed  is  in  state:
  const stateWithBothNeeds = addNeed(stateWithOwnNeed, remoteNeed, false);

  return addConnectionFull(stateWithBothNeeds, connection);
}