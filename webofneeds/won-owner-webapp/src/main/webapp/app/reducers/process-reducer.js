/**
 * Created by quasarchimaere on 29.11.2018.
 */
import { actionTypes } from "../actions/actions.js";
import Immutable from "immutable";
import { getIn } from "../utils.js";

const initialState = Immutable.fromJS({
  processingInitialLoad: true,
  processingPublish: false,
  processingLogout: false,
  processingLogin: false,
  processingLoginForEmail: undefined,
  processingAcceptTermsOfService: false,
  processingVerifyEmailAddress: false,
  processingResendVerificationEmail: false,
  processingSendAnonymousLinkEmail: false,
});

export default function(processState = initialState, action = {}) {
  switch (action.type) {
    case actionTypes.personas.create:
    case actionTypes.needs.create:
    case actionTypes.needs.whatsNew:
    case actionTypes.needs.whatsAround:
      return processState.set("processingPublish", true);

    case actionTypes.failedToGetLocation:
    case actionTypes.personas.createSuccessful:
    case actionTypes.needs.createSuccessful:
      return processState.set("processingPublish", false);

    case actionTypes.account.logoutStarted:
      return processState.set("processingLogout", true);

    case actionTypes.account.logoutFinished:
      return processState.set("processingLogout", false);

    case actionTypes.account.loginStarted:
      return processState
        .set("processingLogin", true)
        .set("processingLoginForEmail", getIn(action, ["payload", "email"]));

    case actionTypes.account.acceptTermsOfServiceStarted:
      return processState.set("processingAcceptTermsOfService", true);

    case actionTypes.account.verifyEmailAddressStarted:
      return processState.set("processingVerifyEmailAddress", true);

    case actionTypes.account.verifyEmailAddressSuccess:
    case actionTypes.account.verifyEmailAddressFailed:
      return processState.set("processingVerifyEmailAddress", false);

    case actionTypes.account.acceptTermsOfServiceSuccess:
    case actionTypes.account.acceptTermsOfServiceFailed:
      return processState.set("processingAcceptTermsOfService", false);

    case actionTypes.account.resendVerificationEmailStarted:
      return processState.set("processingResendVerificationEmail", true);

    case actionTypes.account.resendVerificationEmailSuccess:
    case actionTypes.account.resendVerificationEmailFailed:
      return processState.set("processingResendVerificationEmail", false);

    case actionTypes.account.loginFinished:
    case actionTypes.account.loginFailed:
      return processState
        .set("processingLogin", false)
        .set("processingLoginForEmail", undefined);

    case actionTypes.initialLoadFinished: {
      return processState.set("processingInitialLoad", false);
    }

    case actionTypes.account.sendAnonymousLinkEmailStarted:
      return processState.set("processingSendAnonymousLinkEmail", true);

    case actionTypes.account.sendAnonymousLinkEmailFailed:
    case actionTypes.account.sendAnonymousLinkEmailSuccess:
      return processState.set("processingSendAnonymousLinkEmail", false);

    default:
      return processState;
  }
}