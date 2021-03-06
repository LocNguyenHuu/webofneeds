/**
 * Created by kweinberger on 06.12.2018.
 */

import { details, mergeInEmptyDraft } from "../detail-definitions.js";

export const serviceOffer = {
  identifier: "serviceOffer",
  label: "Offer a Service",
  icon: "#ico36_plus",
  draft: {
    ...mergeInEmptyDraft({
      content: {
        type: ["s:Offer"],
      },
    }),
  },
  details: {
    title: { ...details.title, mandatory: true },
    description: { ...details.description },
    price: { ...details.price, mandatory: true },
    tags: { ...details.tags },
    location: { ...details.location },
  },
  // TODO: what should this match on?
  // generateQuery: (draft, resultName) => {
  //   // return query
  // },
};
