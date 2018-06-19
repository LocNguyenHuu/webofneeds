/**
 * Created by maxstolze on 19.02.2018.
 */
import angular from "angular";

import "ng-redux";
import needMapModule from "./need-map.js";
import personDetailsModule from "./person-details.js";

import { attach } from "../utils.js";

//TODO can't inject $scope with the angular2-router, preventing redux-cleanup
const serviceDependencies = [
  "$ngRedux",
  "$scope",
  "$element" /*, '$routeParams' /*injections as strings here*/,
];

function genComponentConf() {
  const template = `
            <h2 class="post-info__heading"
                ng-show="self.isOrSeeksPart.isOrSeeks.get('title')">
                Title
            </h2>
            <p class="post-info__details"
                ng-show="self.isOrSeeksPart.isOrSeeks.get('title')">
                {{ self.isOrSeeksPart.isOrSeeks.get('title')}}
            </p>

            <h2 class="post-info__heading"
                ng-if="self.person">
                Person Details
            </h2>
            <won-person-details 
              ng-if="self.person"
              person="self.person">
            </won-person-details>

           	<h2 class="post-info__heading"
                ng-show="self.isOrSeeksPart.isOrSeeks.get('description')">
                Description
            </h2>
            <p class="post-info__details--prewrap" ng-show="self.isOrSeeksPart.isOrSeeks.get('description')">{{ self.isOrSeeksPart.isOrSeeks.get('description')}}</p> <!-- no spaces or newlines within the code-tag, because it is preformatted -->

            <h2 class="post-info__heading"
                ng-show="self.isOrSeeksPart.isOrSeeks.get('tags')">
                Tags
            </h2>
            <div class="post-info__details post-info__tags"
                ng-show="self.isOrSeeksPart.isOrSeeks.get('tags')">
                    <span class="post-info__tags__tag" ng-repeat="tag in self.isOrSeeksPart.isOrSeeks.get('tags').toJS()">#{{tag}}</span>
            </div>

            <h2 class="post-info__heading"
                ng-show="self.isOrSeeksPart.location">
                Location
            </h2>
            <p class="post-info__details clickable"
               ng-show="self.isOrSeeksPart.address" ng-click="self.toggleMap()">
                {{ self.isOrSeeksPart.address }}
				        <svg class="post-info__carret">
                  <use xlink:href="#ico-filter_map" href="#ico-filter_map"></use>
                </svg>
				        <svg class="post-info__carret" ng-show="!self.showMap">
	                <use xlink:href="#ico16_arrow_down" href="#ico16_arrow_down"></use>
	              </svg>
                <svg class="post-info__carret" ng-show="self.showMap">
                   <use xlink:href="#ico16_arrow_up" href="#ico16_arrow_up"></use>
                </svg>
            </p>                
            <won-need-map 
              locations="[self.isOrSeeksPart.location]"
              ng-if="self.isOrSeeksPart.location && self.showMap">
            </won-need-map>

            <h2 class="post-info__heading"
                ng-show="self.isOrSeeksPart.travelAction">
                Route
            </h2>
            <p class="post-info__details clickable"
               ng-show="self.isOrSeeksPart.travelAction"
               ng-click="self.toggleRouteMap()">

              <span ng-if="self.isOrSeeksPart.fromAddress">
                <strong>From: </strong>{{ self.isOrSeeksPart.fromAddress }}
              </span>
              </br>
              <span ng-if="self.isOrSeeksPart.toAddress">
              <strong>To: </strong>{{ self.isOrSeeksPart.toAddress }}
              </span>

              <svg class="post-info__carret">
                <use xlink:href="#ico-filter_map" href="#ico-filter_map"></use>
              </svg>
              <svg class="post-info__carret" ng-show="!self.showRouteMap">
                <use xlink:href="#ico16_arrow_down" href="#ico16_arrow_down"></use>
              </svg>
              <svg class="post-info__carret" ng-show="self.showRouteMap">
                  <use xlink:href="#ico16_arrow_up" href="#ico16_arrow_up"></use>
              </svg>
            </p>
            <won-need-map
              locations="self.travelLocations"
              ng-if="self.isOrSeeksPart.travelAction && self.showRouteMap">
            </won-need-map>
    	`;

  class Controller {
    constructor(/* arguments <- serviceDependencies */) {
      attach(this, serviceDependencies, arguments);

      //TODO debug; deleteme
      window.isis4dbg = this;

      this.showMap = false;
      this.showRouteMap = false;

      const self = this;

      this.$scope.$watch("self.isOrSeeksPart.isOrSeeks", newIs => {
        self.person = newIs && newIs.get("person");
      });

      this.$scope.$watch("self.isOrSeeksPart.travelAction", newValue => {
        self.travelLocations = newValue && [
          newValue.get("fromLocation"),
          newValue.get("toLocation"),
        ];
      });
    }

    toggleMap() {
      this.showMap = !this.showMap;
    }

    toggleRouteMap() {
      this.showRouteMap = !this.showRouteMap;
    }
  }

  Controller.$inject = serviceDependencies;

  return {
    restrict: "E",
    controller: Controller,
    controllerAs: "self",
    bindToController: true, //scope-bindings -> ctrl
    scope: {
      isOrSeeksPart: "=",
    },
    template: template,
  };
}

export default //.controller('CreateNeedController', [...serviceDependencies, CreateNeedController])
angular
  .module("won.owner.components.postIsOrSeeksInfo", [
    needMapModule,
    personDetailsModule,
  ])
  .directive("wonPostIsOrSeeksInfo", genComponentConf).name;