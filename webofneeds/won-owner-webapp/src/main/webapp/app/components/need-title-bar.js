/**
 * Created by ksinger on 20.08.2015.
 */
;

import angular from 'angular';

function genComponentConf() {
    let template = `
        <nav class="need-tab-bar" ng-cloak ng-show="{{true}}">
            <div class="ntb__inner">
                <div class="ntb__inner__left">
                    <img src="generated/icon-sprite.svg#ico36_backarrow" class="ntb__icon">
                    <img class="ntb__inner__left__image" src="images/someNeedTitlePic.png"></img>
                    <div class="ntb__inner__left__titles">
                        <h1 class="ntb__title">New flat, need furniture [TITLE]</h1>
                        <div class="ntb__inner__left__titles__type">I want to have something [TYPE]</div>
                    </div>
                </div>
                <div class="ntb__inner__right">
                    <img class=" ntb__inner__right__settings ntb__icon" src="generated/icon-sprite.svg#ico_settings">
                    <ul class="ntb__tabs">
                        <li><a href="#">
                            Messages
                            <span class="ntb__tabs__unread">5</span>
                        </a></li>
                        <li class="ntb__tabs__selected"><a href="#">
                            Matches
                            <span class="ntb__tabs__unread">5</span>
                        </a></li>
                        <li><a href="#">
                             Requests
                            <span class="ntb__tabs__unread">18</span>
                        </a></li>
                        <li><a href="#">
                             Sent Requests
                            <span class="ntb__tabs__unread">18</span>
                        </a></li>
                    </ul>
                </div>
            </div>
        </nav>
    `;

    return {
        restrict: 'E',
        template: template
    }
}
export default angular.module('won.owner.components.needTitleBar', [])
    .directive('wonNeedTitleBar', genComponentConf)
    .name;
