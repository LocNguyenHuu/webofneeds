/**
 * Created by fsuda on 18.09.2018.
 */
import { details, emptyDraft } from "../detail-definitions.js";
import { findLatestIntervallEndInJsonLdOrNowAndAddMillis } from "../../app/won-utils.js";
import won from "../../app/won-es6.js";
import { getIn, isValidDate } from "../../app/utils.js";
import {
  filterInVicinity,
  filterAboutTime,
  concatenateFilters,
  sparqlQuery,
} from "../../app/sparql-builder-utils.js";

export const rideShareOffer = {
  identifier: "rideShareOffer",
  label: "Offer to Share a Ride",
  icon: "#ico36_uc_taxi_offer",
  doNotMatchAfter: findLatestIntervallEndInJsonLdOrNowAndAddMillis,
  draft: {
    ...emptyDraft,
    content: {
      title: "Share a Ride",
      type: "http://dbpedia.org/resource/Ridesharing",
    },
  },
  details: {
    title: { ...details.title },
    description: { ...details.description },
    fromDatetime: { ...details.fromDatetime },
    throughDatetime: { ...details.throughDatetime },
    travelAction: { ...details.travelAction },
  },
  generateQuery: (draft, resultName) => {
    const toLocation = getIn(draft, ["content", "travelAction", "toLocation"]);
    const fromLocation = getIn(draft, [
      "content",
      "travelAction",
      "fromLocation",
    ]);

    const fromTime = getIn(draft, ["content", "fromDatetime"]);
    const filters = [
      {
        // to select seeks-branch
        prefixes: {
          won: won.defaultContext["won"],
        },
        operations: [
          `${resultName} a won:Need.`,
          `${resultName} won:seeks ?seeks.`,
          fromLocation &&
            "?seeks won:travelAction/s:fromLocation ?fromLocation.",
          toLocation && "?seeks won:travelAction/s:toLocation ?toLocation.",
          isValidDate(fromTime) && "?seeks s:validFrom ?starttime",
        ],
      },

      filterInVicinity("?fromLocation", fromLocation, /*radius=*/ 5),

      filterInVicinity("?toLocation", toLocation, /*radius=*/ 5),

      filterAboutTime("?starttime", fromTime, 12 /* hours before and after*/),
    ];

    const concatenatedFilter = concatenateFilters(filters);

    return sparqlQuery({
      prefixes: concatenatedFilter.prefixes,
      distinct: true,
      variables: [resultName],
      where: concatenatedFilter.operations,
      orderBy: [
        {
          order: "ASC",
          variable: "?fromLocation_geoDistance",
        },
      ],
    });
  },
};