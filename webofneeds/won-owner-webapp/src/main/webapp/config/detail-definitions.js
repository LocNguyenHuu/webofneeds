import * as personDetails from "./details/person.js";
import * as locationDetails from "./details/location.js";
import * as timeDetails from "./details/datetime.js";
import * as fileDetails from "./details/files.js";
import * as priceDetails from "./details/price.js";
import * as basicDetails from "./details/basic.js";
import * as workflowDetails from "./details/workflow.js";
import * as reviewDetails from "./details/review.js";
import * as paymentDetails from "./details/payment.js";

import * as abstractDetails_ from "./details/abstract.js";
export const abstractDetails = abstractDetails_; // reexport
import Immutable from "immutable";

const emptyDraftImm = Immutable.fromJS({
  content: {
    facets: {
      "#chatFacet": "won:ChatFacet",
      "#holdableFacet": "won:HoldableFacet",
    },
    defaultFacet: { "#chatFacet": "won:ChatFacet" },
  },
  seeks: {},
  matchingContext: undefined,
});

/**
 * This is used so we can inject preset values for certain UseCases, be aware that it does not merge the content completely.
 *
 * Facets and defaultFacet will be overwritten if set in the useCase itself FIXME: Figure out a better way to handle or communicate
 * this
 * @param contentToMerge
 * @returns {any|*}
 */
export function mergeInEmptyDraft(contentToMerge) {
  if (!contentToMerge) return emptyDraftImm.toJS();
  const contentToMergeImm = Immutable.fromJS(contentToMerge);
  const mergeFacets = contentToMergeImm.getIn(["content", "facets"]);
  const mergeDefaultFacet = contentToMergeImm.getIn([
    "content",
    "defaultFacet",
  ]);

  let mergedDraftImm = emptyDraftImm;

  if (mergeFacets && mergeFacets.size > 0) {
    mergedDraftImm = mergedDraftImm.removeIn(["content", "facets"]);
  }
  if (mergeDefaultFacet && mergeDefaultFacet.size > 0) {
    mergedDraftImm = mergedDraftImm.removeIn(["content", "defaultFacet"]);
  }

  mergedDraftImm = mergedDraftImm.mergeDeep(contentToMergeImm);
  return mergedDraftImm.toJS();
}

export const details = {
  title: basicDetails.title,
  personaName: basicDetails.personaName,
  description: basicDetails.description,
  tags: basicDetails.tags,
  searchString: basicDetails.searchString,

  fromDatetime: timeDetails.fromDatetime,
  throughDatetime: timeDetails.throughDatetime,
  datetimeRange: timeDetails.datetimeRange,

  location: locationDetails.location,
  travelAction: locationDetails.travelAction,

  person: personDetails.person,

  files: fileDetails.files,
  images: fileDetails.images,

  pricerange: priceDetails.pricerange,
  price: priceDetails.price,
  review: reviewDetails.review,
  responseToUri: basicDetails.responseToUri,
  website: basicDetails.website,
  flags: basicDetails.flags,
  sPlanAction: basicDetails.sPlanAction,
  facets: basicDetails.facets,
  defaultFacet: basicDetails.defaultFacet,
  type: basicDetails.type,
};

export const messageDetails = {
  suggestPost: basicDetails.suggestPost,
  bpmnWorkflow: workflowDetails.bpmnWorkflow,
  petriNetWorkflow: workflowDetails.petriNetWorkflow,
  petriNetTransition: workflowDetails.petriNetTransition,
  paypalPayment: paymentDetails.paypalPayment,
};
