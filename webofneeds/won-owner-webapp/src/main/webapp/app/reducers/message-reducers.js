/**
 * Created by ksinger on 26.11.2015.
 */

import { actionTypes } from "../actions/actions.js";
import Immutable from "immutable";

const initialState = Immutable.fromJS({
  enqueued: {},
  waitingForAnswer: {},
  claimOnSuccess: {},
  refreshDataOnSuccess: {},
  lostConnection: false,
  reconnecting: false,
});
export function messagesReducer(messages = initialState, action = {}) {
  switch (action.type) {
    case actionTypes.needs.connect:
    case actionTypes.personas.create:
    case actionTypes.needs.create:
      return messages.setIn(
        ["enqueued", action.payload.eventUri],
        action.payload.message
      );

    case actionTypes.needs.createSuccessful:
      return messages.removeIn([
        "waitingForAnswer",
        action.payload.publishEventUri,
      ]);

    case actionTypes.messages.chatMessage.failure:
    case actionTypes.messages.chatMessage.success:
      return messages.removeIn(["waitingForAnswer", action.payload.eventUri]);

    case actionTypes.messages.waitingForAnswer: {
      const pendingEventUri = action.payload.eventUri;
      const msg = messages.getIn(["enqueued", pendingEventUri]);
      return messages
        .removeIn(["enqueued", pendingEventUri])
        .setIn(["waitingForAnswer", pendingEventUri], msg);
    }

    case actionTypes.connections.open:
    case actionTypes.connections.sendChatMessage:
    case actionTypes.connections.rate:
    case actionTypes.connections.close:
    case actionTypes.messages.send:
      return messages.setIn(
        ["enqueued", action.payload.eventUri],
        action.payload.message
      );

    case actionTypes.connections.sendChatMessageRefreshDataOnSuccess:
      return messages
        .setIn(["enqueued", action.payload.eventUri], action.payload.message)
        .setIn(
          ["refreshDataOnSuccess", action.payload.eventUri],
          action.payload.message
        );

    case actionTypes.connections.sendChatMessageClaimOnSuccess:
      return messages
        .setIn(["enqueued", action.payload.eventUri], action.payload.message)
        .setIn(
          ["claimOnSuccess", action.payload.eventUri],
          action.payload.message
        );

    case actionTypes.lostConnection:
      return messages.set("lostConnection", true).set("reconnecting", false);

    case actionTypes.initialLoadFinished: {
      return messages.set("lostConnection", false).set("reconnecting", false);
    }

    case actionTypes.account.loginFinished: {
      return messages.set("lostConnection", false).set("reconnecting", false);
    }

    case actionTypes.upgradeHttpSession: {
      return messages.set("reconnecting", true);
    }

    case actionTypes.downgradeHttpSession: {
      return messages.set("reconnecting", true);
    }

    case actionTypes.account.logoutFinished: {
      return initialState;
    }

    case actionTypes.reconnect.start:
      return messages.set("reconnecting", true);

    case actionTypes.reconnect.success:
      return messages.set("lostConnection", false).set("reconnecting", false);

    case actionTypes.messages.dispatchActionOn.registerSuccessOwn: {
      const pathSO = ["dispatchOnSuccessOwn", action.payload.eventUri];
      const toDispatchListSO = messages.getIn(pathSO);
      if (!toDispatchListSO) {
        return messages.setIn(pathSO, [action.payload.actionToDispatch]);
      }
      return messages.updateIn(pathSO, list =>
        list.push(action.payload.actionToDispatch)
      );
    }

    case actionTypes.messages.dispatchActionOn.registerFailureOwn: {
      const pathFO = ["dispatchOnFailureOwn", action.payload.eventUri];
      const toDispatchListFO = messages.getIn(pathFO);
      if (!toDispatchListFO) {
        return messages.setIn(pathFO, [action.payload.actionToDispatch]);
      }
      return messages.updateIn(pathFO, list =>
        list.push(action.payload.actionToDispatch)
      );
    }

    case actionTypes.messages.dispatchActionOn.registerSuccessRemote: {
      const pathSR = ["dispatchOnSuccessRemote", action.payload.eventUri];
      const toDispatchListSR = messages.getIn(pathSR);
      if (!toDispatchListSR) {
        return messages.setIn(pathSR, [action.payload.actionToDispatch]);
      }
      return messages.updateIn(pathSR, list =>
        list.push(action.payload.actionToDispatch)
      );
    }

    case actionTypes.messages.dispatchActionOn.registerFailureRemote: {
      const pathFR = ["dispatchOnFailureRemote", action.payload.eventUri];
      const toDispatchListFR = messages.getIn(pathFR);
      if (!toDispatchListFR) {
        return messages.setIn(pathFR, [action.payload.actionToDispatch]);
      }
      return messages.updateIn(pathFR, list =>
        list.push(action.payload.actionToDispatch)
      );
    }

    case actionTypes.messages.dispatchActionOn.failureOwn:
    case actionTypes.messages.dispatchActionOn.successOwn:
      //all the dispatching was done by the action creator. remove the queued actions now:
      return messages
        .removeIn(["dispatchOnSuccessOwn", action.payload.eventUri])
        .removeIn(["dispatchOnFailureOwn", action.payload.eventUri]);

    case actionTypes.messages.dispatchActionOn.failureRemote:
      return messages
        .removeIn(["dispatchOnSuccessRemote", action.payload.eventUri])
        .removeIn(["dispatchOnFailureRemote", action.payload.eventUri]);

    case actionTypes.messages.dispatchActionOn.successRemote:
      return messages
        .removeIn(["claimOnSuccess", action.payload.eventUri])
        .removeIn(["refreshDataOnSuccess", action.payload.eventUri])
        .removeIn(["dispatchOnSuccessRemote", action.payload.eventUri])
        .removeIn(["dispatchOnFailureRemote", action.payload.eventUri]);

    default:
      return messages;
  }
}
