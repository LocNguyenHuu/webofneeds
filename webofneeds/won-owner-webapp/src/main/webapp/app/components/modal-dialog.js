/**
 * Created by quasarchimaere on 24.05.2018.
 */

import angular from "angular";
import { actionCreators } from "../actions/actions.js";
import { attach } from "../utils.js";
import { connect2Redux } from "../won-utils.js";
import * as srefUtils from "../sref-utils.js";

import "style/_modal-dialog.scss";

const serviceDependencies = ["$scope", "$ngRedux", "$element", "$state"];
function genComponentConf() {
  let template = `
      <div class="md__dialog">
          <div class="md__dialog__header">
             <span class="md__dialog__header__caption" ng-if="!self.showTerms">{{self.modalDialogCaption}}</span>
             <span class="md__dialog__header__caption" ng-if="self.showTerms">Attention</span>
          </div>
          <div class="md__dialog__content">
             <span class="md__dialog__content__text" ng-if="!self.showTerms">{{self.modalDialogText}}</span>
             <span class="md__dialog__content__text" ng-if="self.showTerms">
                You are about to create an anoymous Account.
                <br/>
                This is only possible if you accept the <a target="_blank" href="{{ self.absHRef(self.$state, 'about', {'#': 'aboutTermsOfService'}) }}">Terms Of Service</a>.
                <br/>
                <br/>
                Do you want to want to proceed and thus also accept the Terms of Service?
              </span>
          </div>
          <div class="md__dialog__footer">
             <button
                ng-repeat="button in self.modalDialogButtons"
                class="won-button--filled lighterblue"
                ng-click="button.get('callback')()">
                    <span>{{button.get("caption")}}</span>
             </button>
          </div>
      </div>
    `;

  class Controller {
    constructor() {
      attach(this, serviceDependencies, arguments);
      Object.assign(this, srefUtils); // bind srefUtils to scope

      const selectFromState = state => {
        const modalDialog = state.getIn(["view", "modalDialog"]);
        const modalDialogCaption = modalDialog && modalDialog.get("caption");
        const modalDialogText = modalDialog && modalDialog.get("text");
        const modalDialogButtons = modalDialog && modalDialog.get("buttons");

        const showTerms = modalDialog && modalDialog.get("showTerms");
        return {
          modalDialogCaption,
          modalDialogText,
          showTerms,
          modalDialogButtons:
            modalDialogButtons && modalDialogButtons.toArray(),
        };
      };

      connect2Redux(selectFromState, actionCreators, [], this);
    }
  }
  Controller.$inject = serviceDependencies;

  return {
    restrict: "E",
    controller: Controller,
    controllerAs: "self",
    bindToController: true, //scope-bindings -> ctrl
    // //scope: { }, // not isolated on purpose to allow using parent's scope
    scope: {},
    template: template,
  };
}

export default angular
  .module("won.owner.components.modalDialog", [])
  .directive("wonModalDialog", genComponentConf).name;
