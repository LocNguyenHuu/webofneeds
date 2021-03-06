/**
 * Component for rendering the connection indicators as an svg images, with unread count and select handle on the latest (possibly unread) connnectionuri
 * Created by fsuda on 10.04.2017.
 */
import angular from "angular";
import won from "../won-es6.js";
import "ng-redux";
import { labels } from "../won-label-utils.js";
import { actionCreators } from "../actions/actions.js";
import { getPosts, getOwnedPosts } from "../selectors/general-selectors.js";
import { getChatConnectionsByNeedUri } from "../selectors/connection-selectors.js";

import { attach, sortByDate, getIn } from "../utils.js";
import { connect2Redux } from "../won-utils.js";
import { classOnComponentRoot } from "../cstm-ng-utils.js";
import {
  isChatConnection,
  isGroupChatConnection,
} from "../connection-utils.js";

import "style/_connection-indicators.scss";

const serviceDependencies = ["$ngRedux", "$scope", "$element"];
function genComponentConf() {
  let template = `
        <a class="indicators__item"
            ng-if="!self.postLoading"
            ng-click="self.latestConnectedUri && self.setOpen(self.latestConnectedUri)"
            ng-class="{
              'indicators__item--reads': !self.hasUnreadConnected && self.latestConnectedUri,
              'indicators__item--unreads': self.hasUnreadConnected && self.latestConnectedUri,
              'indicators__item--disabled': !self.latestConnectedUri,
            }">
                <svg class="indicators__item__icon" title="Show latest message/request">
                    <use xlink:href="#ico36_message" href="#ico36_message"></use>
                </svg>
        </a>
        <div class="indicators__item indicators__item--skeleton" ng-if="self.postLoading">
            <svg class="indicators__item__icon">
                <use xlink:href="#ico36_message" href="#ico36_message"></use>
            </svg>
            <span class="indicators__item__caption"></span>
        </div>
    `;

  class Controller {
    constructor() {
      attach(this, serviceDependencies, arguments);
      this.labels = labels;

      const selectFromState = state => {
        const ownedPosts = getOwnedPosts(state);
        const allPosts = getPosts(state);
        const ownedPost = ownedPosts && ownedPosts.get(this.needUri);
        const chatConnectionsByNeedUri =
          this.needUri && getChatConnectionsByNeedUri(state, this.needUri);

        const connected =
          chatConnectionsByNeedUri &&
          chatConnectionsByNeedUri.filter(conn => {
            const remoteNeedUri = conn.get("remoteNeedUri");
            const remoteNeedActiveOrLoading =
              remoteNeedUri &&
              allPosts &&
              allPosts.get(remoteNeedUri) &&
              (getIn(state, ["process", "needs", remoteNeedUri, "loading"]) ||
                allPosts.getIn([remoteNeedUri, "state"]) ===
                  won.WON.ActiveCompacted);

            return (
              remoteNeedActiveOrLoading &&
              (isChatConnection(conn) || isGroupChatConnection(conn)) &&
              conn.get("state") !== won.WON.Suggested &&
              conn.get("state") !== won.WON.Closed
            );
          });

        const hasUnreadConnected =
          connected && !!connected.find(conn => conn.get("unread"));

        return {
          WON: won.WON,
          ownedPost,
          postLoading:
            !ownedPost ||
            getIn(state, ["process", "needs", ownedPost.get("uri"), "loading"]),
          hasUnreadConnected,
          latestConnectedUri: this.retrieveLatestUri(connected),
        };
      };

      connect2Redux(selectFromState, actionCreators, ["self.needUri"], this);

      classOnComponentRoot("won-is-loading", () => this.postLoading, this);
    }

    /**
     * This method returns either the latest unread uri of the given connection elements, or the latest uri of a read connection, if nothing is found undefined is returned
     * @param elements connection elements to retrieve the latest uri from
     * @returns {*}
     */
    retrieveLatestUri(elements) {
      const unreadElements =
        elements && elements.filter(conn => conn.get("unread"));

      const sortedUnreadElements = sortByDate(unreadElements);
      const unreadUri =
        sortedUnreadElements &&
        sortedUnreadElements[0] &&
        sortedUnreadElements[0].get("uri");

      if (unreadUri) {
        return unreadUri;
      } else {
        const sortedElements = sortByDate(elements);
        return (
          sortedElements && sortedElements[0] && sortedElements[0].get("uri")
        );
      }
    }

    setOpen(connectionUri) {
      this.onSelectedConnection({ connectionUri: connectionUri }); //trigger callback with scope-object
    }
  }
  Controller.$inject = serviceDependencies;
  return {
    restrict: "E",
    controller: Controller,
    controllerAs: "self",
    bindToController: true, //scope-bindings -> ctrl
    scope: {
      needUri: "=",
      onSelectedConnection: "&",
    },
    template: template,
  };
}

export default angular
  .module("won.owner.components.connectionIndicators", [])
  .directive("wonConnectionIndicators", genComponentConf).name;
