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
} from "./reduce-needs.js";
import {
  addMessage,
  addExistingMessages,
  updateMessageStatus,
  markMessageAsSelected,
  markMessageAsCollapsed,
  markMessageShowActions,
  markMessageAsRead,
  markMessageAsClaimed,
  markMessageAsProposed,
  markMessageAsRejected,
  markMessageAsRetracted,
  markMessageAsAccepted,
  markMessageAsCancelled,
  markMessageAsCancellationPending,
  markMessageExpandReferences,
} from "./reduce-messages.js";
import {
  addConnectionsToLoad,
  markConnectionAsRated,
  markConnectionAsRead,
  getOwnedNeedByConnectionUri,
  changeConnectionState,
  changeConnectionStateByFun,
  storeConnectionsData,
  updateAgreementStateData,
  updatePetriNetStateData,
  setShowAgreementData,
  setShowPetriNetData,
  setMultiSelectType,
} from "./reduce-connections.js";

const initialState = Immutable.fromJS({});

export default function(allNeedsInState = initialState, action = {}) {
  switch (action.type) {
    case actionTypes.account.reset:
    case actionTypes.needs.clean:
      return initialState;

    case actionTypes.account.loginStarted:
      // starting a new login process. this could mean switching
      // to a different session. we need to mark any needs
      // that are already loaded as non-owned.
      return allNeedsInState.map(need =>
        need.set("isOwned", false).set("connections", Immutable.Map())
      );

    case actionTypes.needs.storeOwnedActiveUris: {
      return addOwnActiveNeedsInLoading(
        allNeedsInState,
        action.payload.get("uris")
      );
    }

    case actionTypes.needs.storeOwnedInactiveUris: {
      return addOwnInactiveNeedsToLoad(
        allNeedsInState,
        action.payload.get("uris")
      );
    }

    case actionTypes.needs.storeOwnedInactiveUrisInLoading: {
      return addOwnInactiveNeedsInLoading(
        allNeedsInState,
        action.payload.get("uris")
      );
    }

    case actionTypes.personas.storeTheirUrisInLoading:
    case actionTypes.needs.storeTheirUrisInLoading: {
      return addTheirNeedsInLoading(
        allNeedsInState,
        action.payload.get("uris")
      );
    }

    case actionTypes.needs.storeOwned: {
      let needs = action.payload.get("needs");
      needs = needs ? needs : Immutable.Set();

      return needs.reduce(
        (updatedState, need) => addNeed(updatedState, need, true),
        allNeedsInState
      );
    }

    case actionTypes.connections.storeUrisToLoad: {
      return addConnectionsToLoad(
        allNeedsInState,
        action.payload.get("needUri"),
        action.payload.get("connections")
      );
    }

    case actionTypes.connections.storeActive: {
      return storeConnectionsData(
        allNeedsInState,
        action.payload.get("connections")
      );
    }

    case actionTypes.needs.storeTheirs:
    case actionTypes.personas.storeTheirs: {
      let needs = action.payload.get("needs");
      needs = needs ? needs : Immutable.Set();

      return needs.reduce(
        (updatedState, need) => addNeed(updatedState, need, false),
        allNeedsInState
      );
    }

    case actionTypes.messages.closeNeed.failed:
      return storeConnectionsData(
        allNeedsInState,
        action.payload.get("connections")
      );

    case actionTypes.messages.reopenNeed.failed:
      return storeConnectionsData(
        allNeedsInState,
        action.payload.get("connections")
      );

    case actionTypes.needs.reopen:
      return allNeedsInState.setIn(
        [action.payload.ownedNeedUri, "state"],
        won.WON.ActiveCompacted
      );

    case actionTypes.needs.close:
      return allNeedsInState.setIn(
        [action.payload.ownedNeedUri, "state"],
        won.WON.InactiveCompacted
      );

    case actionTypes.needs.delete:
      return allNeedsInState.delete(action.payload.ownNeedUri).map(need => {
        const removeHolder = need => {
          if (need.get("heldBy") == action.payload.ownNeedUri) {
            return need.delete("heldBy");
          } else return need;
        };
        const removeHeld = need => {
          return need.updateIn(
            ["holds"],
            heldItems =>
              heldItems &&
              heldItems.filter(
                heldItem => heldItem != action.payload.ownNeedUri
              )
          );
        };
        return removeHeld(removeHolder(need));
      });

    case actionTypes.personas.create: {
      //FIXME: Please let us use the addNeed method as a single entry point to add Needs(even Personas) to the State
      return allNeedsInState.set(
        action.payload.needUri,
        Immutable.fromJS({
          jsonld: action.payload.persona,
          isOwned: true,
          isBeingCreated: true,
          uri: action.payload.needUri,
          creationDate: new Date(),
          content: {
            type: Immutable.Set(["won:Need", "won:Persona"]),
            facets: Immutable.Map(),
          },
          connections: Immutable.Map(),
          holds: Immutable.List(),
          rating: { aggregateRating: 0.0, reviewCount: 0 },
        })
      );
    }

    case actionTypes.needs.create: // optimistic need adding
      return addNeedInCreation(
        allNeedsInState,
        action.payload.need,
        action.payload.needUri
      );

    case actionTypes.needs.createSuccessful:
      return addNeed(allNeedsInState, action.payload.need, true);

    case actionTypes.messages.openMessageReceived:
    case actionTypes.messages.connectMessageReceived: {
      const ownedNeedFromState = allNeedsInState.get(
        action.payload.ownedNeedUri
      );

      if (!ownedNeedFromState) {
        throw new Error("Open or connect received for non owned hint!");
      }

      if (action.payload.message) {
        allNeedsInState = addMessage(allNeedsInState, action.payload.message);
      }
      allNeedsInState = changeConnectionStateByFun(
        allNeedsInState,
        action.payload.updatedConnectionUri,
        state => {
          if (!state) return won.WON.RequestReceived; //fallback if no state present
          if (state === won.WON.Connected) return won.WON.Connected; //stay in connected if it was already the case
          if (state === won.WON.RequestSent) return won.WON.Connected;
          if (state === won.WON.Suggested) return won.WON.RequestReceived;
          if (state === won.WON.Closed) return won.WON.RequestReceived;
          return won.WON.RequestReceived;
        }
      );
      return allNeedsInState;
    }

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
      const ownedNeedUri = optimisticEvent.getSenderNeed();
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
        //need to wait for success-response to set that
        const optimisticConnection = Immutable.fromJS({
          uri: tmpConnectionUri,
          usingTemporaryUri: true,
          state: won.WON.RequestSent,
          remoteNeedUri: theirNeedUri,
          remoteConnectionUri: undefined,
          unread: false,
          facet: won.WON.ChatFacetCompacted, //TODO: INSERT CORRECT FACET FROM NEEDS
          agreementData: {
            agreementUris: Immutable.Set(),
            pendingProposalUris: Immutable.Set(),
            pendingCancellationProposalUris: Immutable.Set(),
            cancellationPendingAgreementUris: Immutable.Set(),
            acceptedCancellationProposalUris: Immutable.Set(),
            cancelledAgreementUris: Immutable.Set(),
            rejectedMessageUris: Immutable.Set(),
            retractedMessageUris: Immutable.Set(),
            proposedMessageUris: Immutable.Set(),
            claimedMessageUris: Immutable.Set(),
          },
          petriNetData: Immutable.Map(),
          creationDate: undefined,
          lastUpdateDate: undefined,
          isRated: false,
          showAgreementData: false,
          showPetriNetData: false,
          multiSelectType: undefined,
          messages: {
            [eventUri]: {
              uri: eventUri,
              content: {
                text: optimisticEvent.getTextMessage(),
              },
              isParsable: !!optimisticEvent.getTextMessage(),
              hasContent: !!optimisticEvent.getTextMessage(),
              hasReferences: false,
              date: msStringToDate(optimisticEvent.getSentTimestamp()),
              outgoingMessage: true,
              unread: false,
              messageType: won.WONMSG.connectMessage,
              messageStatus: {
                isProposed: false,
                isClaimed: false,
                isRetracted: false,
                isRejected: false,
                isAccepted: false,
                isCancelled: false,
                isCancellationPending: false,
              },
            },
          },
        });
        return allNeedsInState.setIn(
          [ownedNeedUri, "connections", tmpConnectionUri],
          optimisticConnection
        );
      }
    }
    case actionTypes.messages.connectMessageSent: {
      // received a message saying we sent a connect request
      const senderConnectionUri = action.payload.senderConnectionUri;
      let stateUpdated;

      if (senderConnectionUri) {
        stateUpdated = changeConnectionState(
          allNeedsInState,
          senderConnectionUri,
          won.WON.RequestSent
        );
        return addMessage(stateUpdated, action.payload.event);
      } else {
        console.warn(
          "actionTypes.messages.connectMessageSent: senderConnectionUri was undefined for payload: ",
          action.payload,
          " -> return unchangedState"
        );
      }
      return allNeedsInState;
    }

    case actionTypes.messages.openMessageSent: {
      const senderNeedUri = action.payload.senderNeedUri;
      const senderConnectionUri = action.payload.senderConnectionUri;
      let stateUpdated;

      if (senderConnectionUri) {
        const senderNeed = allNeedsInState.get(senderNeedUri);
        const existingConnection =
          senderNeed && senderNeed.getIn(["connections", senderConnectionUri]);

        if (existingConnection) {
          stateUpdated = changeConnectionState(
            allNeedsInState,
            senderConnectionUri,
            won.WON.Connected //TODO EITHER SET TO REQUEST SENT OR CONNECTED DEPENDING ON THE CURRENT STATE
          );
          //because we have a connection uri, we can add the message
          return addMessage(stateUpdated, action.payload.event);
        }
      } else {
        console.warn(
          "actionTypes.messages.openMessageSent: senderConnectionUri was undefined for payload: ",
          action.payload,
          " -> return unchangedState"
        );
      }
      return allNeedsInState;
    }

    case actionTypes.connections.open: {
      // user has sent an open request
      const cnctStateUpdated = changeConnectionStateByFun(
        allNeedsInState,
        action.payload.connectionUri,
        state => {
          if (!state) return won.WON.RequestSent; //fallback if no state present
          if (state === won.WON.Connected) return won.WON.Connected; //stay in connected if it was already the case
          if (state === won.WON.RequestReceived) return won.WON.Connected;
          if (state === won.WON.Suggested) return won.WON.RequestSent;
          if (state === won.WON.Closed) return won.WON.RequestSent;
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
      const connUri = wonMessage.getReceiver();

      const tmpConnUri = "connectionFrom:" + wonMessage.getIsResponseTo();
      const tmpNeed = getOwnedNeedByConnectionUri(allNeedsInState, tmpConnUri);
      const tmpConnection = getIn(tmpNeed, ["connections", tmpConnUri]);

      if (tmpConnection) {
        // connection was established from scratch without having a
        // connection uri. now that we have the uri, we can store it
        // (see connectAdHoc)
        const needUri = tmpNeed.get("uri");
        if (!tmpNeed.get("isOwned")) {
          throw new Error("Need not owned, can't alter connection.");
        }

        const properConnection = tmpConnection
          .delete("usingTemporaryUri")
          .set("uri", connUri);

        allNeedsInState = allNeedsInState
          .deleteIn([needUri, "connections", tmpConnUri])
          .mergeDeepIn([needUri, "connections", connUri], properConnection);
        const path = [needUri, "connections", connUri, "messages", eventUri];
        if (allNeedsInState.getIn(path)) {
          allNeedsInState = allNeedsInState.setIn(
            [...path, "isReceivedByOwn"],
            true
          );
        } else {
          console.error(
            "connect.successOwn for message that was not sent(or was not loaded in the state yet, wonMessage: ",
            wonMessage,
            "messageUri: ",
            eventUri
          );
        }
        return allNeedsInState;
      } else {
        const needByConnectionUri = getOwnedNeedByConnectionUri(
          allNeedsInState,
          connUri
        );

        if (needByConnectionUri) {
          // connection has been stored as match first
          allNeedsInState = changeConnectionState(
            allNeedsInState,
            connUri,
            won.WON.RequestSent
          );

          if (
            allNeedsInState.getIn([
              needByConnectionUri.get("uri"),
              "connections",
              connUri,
              "messages",
              eventUri,
            ])
          ) {
            allNeedsInState = allNeedsInState.setIn(
              [
                needByConnectionUri.get("uri"),
                "connections",
                connUri,
                "messages",
                eventUri,
                "isReceivedByOwn",
              ],
              true
            );
          } else {
            console.error(
              "connect.successOwn for message that was not sent(or was not loaded in the state yet, wonMessage: ",
              wonMessage,
              "messageUri: ",
              eventUri
            );
          }
        } else {
          console.warn(
            "Can't add the connection(",
            connUri,
            ") the need is not stored in the state yet"
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
    case actionTypes.messages.viewState.markExpandReference:
      return markMessageExpandReferences(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.isExpanded,
        action.payload.reference
      );
    case actionTypes.messages.viewState.markAsSelected:
      return markMessageAsSelected(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.isSelected
      );
    case actionTypes.messages.viewState.markAsCollapsed:
      return markMessageAsCollapsed(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.isCollapsed
      );
    case actionTypes.messages.viewState.markShowActions:
      return markMessageShowActions(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.showActions
      );
    case actionTypes.messages.markAsRead:
      return markMessageAsRead(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri
      );

    case actionTypes.messages.updateMessageStatus:
      return updateMessageStatus(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.messageStatus
      );

    case actionTypes.messages.messageStatus.markAsProposed:
      return markMessageAsProposed(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.proposed
      );

    case actionTypes.messages.messageStatus.markAsClaimed:
      return markMessageAsClaimed(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.claimed
      );

    case actionTypes.messages.messageStatus.markAsRejected:
      return markMessageAsRejected(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.rejected
      );

    case actionTypes.messages.messageStatus.markAsRetracted:
      return markMessageAsRetracted(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.retracted
      );

    case actionTypes.messages.messageStatus.markAsAccepted:
      return markMessageAsAccepted(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.accepted
      );

    case actionTypes.messages.messageStatus.markAsCancelled:
      return markMessageAsCancelled(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.cancelled
      );

    case actionTypes.messages.messageStatus.markAsCancellationPending:
      return markMessageAsCancellationPending(
        allNeedsInState,
        action.payload.messageUri,
        action.payload.connectionUri,
        action.payload.needUri,
        action.payload.cancellationPending
      );

    case actionTypes.connections.markAsRead:
      return markConnectionAsRead(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.needUri
      );
    case actionTypes.connections.rate:
      return markConnectionAsRated(
        allNeedsInState,
        action.payload.connectionUri
      );
    case actionTypes.connections.updatePetriNetData:
      return updatePetriNetStateData(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.petriNetData
      );
    case actionTypes.connections.updateAgreementData:
      return updateAgreementStateData(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.agreementData
      );
    case actionTypes.connections.showPetriNetData:
      return setShowPetriNetData(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.showPetriNetData
      );
    case actionTypes.connections.showAgreementData:
      return setShowAgreementData(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.showAgreementData
      );
    case actionTypes.connections.setMultiSelectType:
      return setMultiSelectType(
        allNeedsInState,
        action.payload.connectionUri,
        action.payload.multiSelectType
      );
    case actionTypes.messages.processAgreementMessage:
      //add a message that has been already processed (so sent status is ommitted)
      return addMessage(allNeedsInState, action.payload, true);
    // NEW MESSAGE STATE UPDATES
    case actionTypes.messages.processConnectionMessage:
      // ADD RECEIVED CHAT MESSAGES
      // payload; { events }
      return addMessage(allNeedsInState, action.payload);

    case actionTypes.connections.sendChatMessageClaimOnSuccess:
    case actionTypes.connections.sendChatMessageRefreshDataOnSuccess: {
      return addMessage(allNeedsInState, action.payload.optimisticEvent);
    }

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
      const path = [
        needUri,
        "connections",
        connectionUri,
        "messages",
        eventUri,
      ];
      if (allNeedsInState.getIn(path)) {
        allNeedsInState = allNeedsInState
          .setIn([...path, "isReceivedByRemote"], true)
          .setIn([...path, "isReceivedByOwn"], true);
      } else {
        console.error(
          "chatMessage.successRemote for message that was not sent(or was not loaded in the state yet, wonMessage: ",
          wonMessage,
          "messageUri: ",
          eventUri
        );
      }
      return allNeedsInState;
    }

    case actionTypes.connections.fetchMessagesSuccess: {
      const loadedMessages = action.payload.get("events");
      if (loadedMessages) {
        allNeedsInState = addExistingMessages(allNeedsInState, loadedMessages);
      }

      return allNeedsInState;
    }

    default:
      return allNeedsInState;
  }
}
