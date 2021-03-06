/**
 * Created by fsuda on 18.09.2018.
 */
import { details, mergeInEmptyDraft } from "../detail-definitions.js";
import won from "../../app/won-es6.js";
import { genresDetail, instrumentsDetail } from "../details/musician.js";
import { findLatestIntervallEndInJsonLdOrNowAndAddMillis } from "../../app/won-utils.js";
import {
  vicinityScoreSubQuery,
  tagOverlapScoreSubQuery,
  sparqlQuery,
} from "../../app/sparql-builder-utils.js";

import { getIn } from "../../app/utils.js";

export const bandSearch = {
  identifier: "bandSearch",
  label: "Find Band",
  icon: "#ico36_uc_find_band",
  timeToLiveMillisDefault: 1000 * 60 * 60 * 24 * 30,
  doNotMatchAfter: findLatestIntervallEndInJsonLdOrNowAndAddMillis,
  draft: {
    ...mergeInEmptyDraft({
      content: {
        title: "I'm looking for a band!",
        type: ["won:Musician"],
      },
      seeks: {
        type: ["s:MusicGroup"],
      },
    }),
  },
  details: {
    title: { ...details.title },
    description: { ...details.description },
    instruments: {
      ...instrumentsDetail,
    },
  },
  seeksDetails: {
    description: { ...details.description },
    genres: { ...genresDetail },
    location: {
      ...details.location,
      mandatory: true,
    },
  },
  generateQuery: (draft, resultName) => {
    // genres
    const genresSQ = tagOverlapScoreSubQuery({
      resultName: resultName,
      bindScoreAs: "?genres_jaccardIndex",
      pathToTags: "won:genres",
      prefixesInPath: {
        s: won.defaultContext["s"],
        won: won.defaultContext["won"],
      },
      tagLikes: getIn(draft, ["seeks", "genres"]),
    });

    // instruments
    const instrumentsSQ = tagOverlapScoreSubQuery({
      resultName: resultName,
      bindScoreAs: "?instruments_jaccardIndex",
      pathToTags: "won:seeks/won:instruments",
      prefixesInPath: {
        s: won.defaultContext["s"],
        won: won.defaultContext["won"],
      },
      tagLikes: getIn(draft, ["content", "instruments"]),
    });

    const vicinityScoreSQ = vicinityScoreSubQuery({
      resultName: resultName,
      bindScoreAs: "?location_geoScore",
      pathToGeoCoords: "s:location/s:geo",
      prefixesInPath: {
        s: won.defaultContext["s"],
        won: won.defaultContext["won"],
      },

      geoCoordinates: getIn(draft, ["seeks", "location"]),
    });

    const subQueries = [genresSQ, instrumentsSQ, vicinityScoreSQ]
      .filter(sq => sq) // filter out non-existing details (the SQs should be `undefined` for them)
      .map(sq => ({
        query: sq,
        optional: true, // so counterparts without that detail don't get filtered out (just assigned a score of 0 via `coalesce`)
      }));

    const query = sparqlQuery({
      prefixes: {
        won: won.defaultContext["won"],
        rdf: won.defaultContext["rdf"],
        s: won.defaultContext["s"],
      },
      distinct: true,
      variables: [resultName],
      subQueries: subQueries,
      where: [
        `${resultName} rdf:type won:Need.`,
        `${resultName} rdf:type s:MusicGroup.`,

        // calculate average of scores; can be weighed if necessary
        `BIND( ( 
              COALESCE(?instruments_jaccardIndex, 0) + 
              COALESCE(?genres_jaccardIndex, 0) + 
              COALESCE(?location_geoScore, 0) 
            ) / 3  as ?aggregatedScore)`,
        //`FILTER(?aggregatedScore > 0)`,
      ],
      orderBy: [{ order: "DESC", variable: "?aggregatedScore" }],
    });

    return query;
  },
};
