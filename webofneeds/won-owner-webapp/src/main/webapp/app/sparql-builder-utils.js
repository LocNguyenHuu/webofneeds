/**
 * Module for utility-functions for string-building sparql-queries.
 * NOTE: This is a super-hacky/-fragile approach and should be replaced by a proper lib / ast-utils
 */

import won from "./won-es6.js";
import {
  isValidNumber,
  isValidDate,
  toLocalISODateString,
  is,
} from "./utils.js";
import { Parser as SparqlParser } from "sparqljs";

/**
 *
 * @param {Object} prefixes key-value pairs of prefix and full URL
 * @param {String} selectDistinct the variable to select
 * @param {Array<String>} where any operations to add to the `WHERE`-block
 * @param {Array<Object>} subQueries array of sparql-query objects. will be placed
 *   in `where`-block and their prefixes lifted to the overall-queries prefix block.
 * @param {*} orderBy Array of objects like `{order: "ASC", variable: "?geoDistance"}`
 */
export function sparqlQuery({
  prefixes,
  variables,
  distinct,
  where,
  orderBy,
  groupBy,
  subQueries,
}) {
  // ---------- prepare query string ----------

  const distinctStr = distinct ? "DISTINCT" : "";

  let orderByStr = "";
  if (orderBy && is("Array", orderBy)) {
    const orderClauses = orderBy
      .map(o => `${o.order}(${o.variable})`)
      .join(" ");
    orderByStr = orderClauses ? "ORDER BY " + orderClauses : "";
  }

  let groupByStr = "";
  if (groupBy) {
    groupByStr = `GROUP BY (${groupBy})`;
  }

  const queryTemplate = `
${prefixesString(prefixes)}
SELECT ${distinctStr} ${variables.join(" ")}
WHERE {
  ${where ? where.join("\n") : ""}
} ${orderByStr} ${groupByStr}`;

  // ---------- parse root-query ----------

  const queryAST = new SparqlParser().parse(queryTemplate);

  // ---------- if there are sub-queries, add their ASTs and prefixes ----------

  if (subQueries && is("Array", subQueries)) {
    subQueries.forEach(q => addSubQuery(queryAST, q));
  }

  // ---------- return AST ----------

  return queryAST;
}

function addSubQuery(queryAST, subQuery) {
  // add prefixes
  Object.assign(queryAST.prefixes, subQuery.prefixes);

  // inject sub-query (without the lifted prefixes) into where-block
  queryAST.where.push({
    type: "group",
    patterns: [
      {
        ...subQuery,
        prefixes: undefined, // overwrites any `prefixes` that might come from `subQuery`
      },
    ],
  });
  return queryAST;
}

/**
 * returns e.g.:
 * ```
 * {
 *   prefixes: { s: "http://schema.org/", ...},
 *   operations: [
 *      "FILTER (?currency = 'EUR')",... ],
 *      "?is s:priceSpecification ?pricespec .", ...],
 *    ],
 * }
 * ```
 * The defaults are empty objects and arrays as properties.
 *
 * @param {*} returnValue
 */
export function wellFormedFilter(returnValue) {
  return Object.assign(emptyFilter(), returnValue);
}

export function emptyFilter() {
  return {
    prefixes: {},
    operations: [], // basic graph patterns, filters etc. anything that goes into the where clause
  };
}

/**
 * Concatenates filter-objects generated by other functions in this
 * module into a single one.
 * @param {*} filters see `wellFormedFilter` for the returned structure.
 */
export function concatenateFilters(filters) {
  const concatenatedFilter = filters
    .filter(f => f) // filter out undefined filters
    .reduce((acc, f) => {
      if (!f) {
        return acc;
      } else {
        const prefixes = Object.assign({}, acc.prefixes, f.prefixes);
        const operations = acc.operations.concat(f.operations).filter(o => o);
        return {
          prefixes,
          operations,
        };
      }
    }, emptyFilter());

  return concatenatedFilter;
}

/**
 * Collapses a filter's operations and wraps them in
 * an `OPTIONAL` block.
 * @param {*} filter
 */
export function optionalFilter(filter) {
  const joinedOperations = filter.operations.join(" ");
  const operationString =
    joinedOperations && `OPTION { ${joinedOperations} } .`;
  return wellFormedFilter({
    prefixes: filter.prefixes,
    operations: [operationString],
  });
}

/**
 * Concatenates the filters and then calls `optionalFilter`.
 * @param {Array} filters
 */
export function optionalFilters(filters) {
  return optionalFilter(concatenateFilters(filters));
}

/**
 * @param {String} rootSubject: a variable name via which the location is connected
 *  to the rest of the graph-patterns . e.g. `"?location"`. Needs to start with a
 *  variable indicator (i.e. `?`) as other variable names will be derived by
 *  suffixing it.
 * @param {*} location: an object containing `lat` and `lng`
 * @param {Number} radius: distance in km that matches can be away from the location
 * @returns see wellFormedFilter
 */
export function filterInVicinity(rootSubject, location, radius = 10) {
  if (!location || !location.lat || !location.lng) {
    return emptyFilter();
  } else {
    /* "prefix" variable name with root-subject so filter can be used 
     * multiple times for different roots
     * results in e.g. `?location_geo`
     */
    const geoVar = `${rootSubject}_geo`;
    return wellFormedFilter({
      prefixes: {
        s: won.defaultContext["s"],
        won: won.defaultContext["won"],
        geo: "http://www.bigdata.com/rdf/geospatial#",
        geoliteral: "http://www.bigdata.com/rdf/geospatial/literals/v1#",
      },
      operations: [
        `${rootSubject} s:geo ${geoVar}.`,
        `SERVICE geo:search {
  ${geoVar} geo:search "inCircle" .
  ${geoVar} geo:searchDatatype geoliteral:lat-lon .
  ${geoVar} geo:predicate won:geoSpatial .
  ${geoVar} geo:spatialCircleCenter "${location.lat}#${location.lng}" .
  ${geoVar} geo:spatialCircleRadius "${radius}" .
  ${geoVar} geo:distanceValue ${rootSubject}_geoDistance .
}`,
      ],
    });
  }
}

/**
 * @param {String} rootSubject: a variable name that the score judges, e.g. `?need`
 * @param {String} scoreName: the variable name for the score (use the same name for
 *   sorting/aggregating in the parent query)
 * @param {String} pathToLocation: the predicates to be traversed to get to the root
 *   of the location (i.e. the `s:Place`) in the RDF-graph.
 * @param {*} location: an object containing `lat` and `lng`
 * @param {Number} radius: distance in km that matches can be away from the location
 * @returns see `sparqlQuery`
 */
export function vicinityScoreSubQuery(
  resultName,
  scoreName,
  pathToLocation,
  location,
  radius = 10
) {
  // const locationFilter = filterInVicinity("?jobLocation", jobLocation);
  return sparqlQuery({
    prefixes: {
      s: won.defaultContext["s"],
      won: won.defaultContext["won"],
      geo: "http://www.bigdata.com/rdf/geospatial#",
      geoliteral: "http://www.bigdata.com/rdf/geospatial/literals/v1#",
    },
    variables: [resultName, scoreName],
    where: [
      `${resultName} ${pathToLocation}/s:geo ?geo`,
      `SERVICE geo:search {
            ?geo geo:search "inCircle" .
            ?geo geo:searchDatatype geoliteral:lat-lon .
            ?geo geo:predicate won:geoSpatial .
            ?geo geo:spatialCircleCenter "${location.lat}#${location.lng}" .
            ?geo geo:spatialCircleRadius "${radius}" .
            ?geo geo:distanceValue ?geoDistance .
          }`,
      `BIND((${radius} - ?geoDistance) / ${radius} as ?geoScoreRaw)`, // 100 is the spatialCircleRadius / maxDistance in km
      `BIND(IF(?geoScoreRaw > 0, ?geoScoreRaw , 0 ) as ${scoreName})`,
    ],
  });
}

export function tagOverlapScoreSubQuery() {
  /*
  TODO use code from job-search.js' generateQuery
  {
SELECT DISTINCT ?result ?industry_jaccardIndex WHERE {
  BIND(?industry_targetOverlap / ((?industry_targetTotal + 2 ) - ?industry_targetOverlap) AS ?industry_jaccardIndex)
  FILTER(?industry_jaccardIndex > 0 )
  ?result (won:is/s:jobLocation) ?jobLocation.
  {
    SELECT ?result ((SUM(?var0)) + (SUM(?var1)) AS ?industry_targetOverlap) (COUNT(?result) AS ?industry_targetTotal) WHERE {
      ?result <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> won:Need.
      ?result (won:is/s:industry) ?industry.
      BIND(IF((STR(?industry)) = "notconstruction", 1 , 0 ) AS ?var0)
      BIND(IF((STR(?industry)) = "design", 1 , 0 ) AS ?var1)
    }
    GROUP BY ?result
  }
}
}
*/
}

/**
 * Constructs a filter for which holds:
 *
 * `datetime - 12h <= matchedTime <= datetime + 12h`
 *
 * @param {*} rootSubject the sparql-variable that is the `xsd:dateTime`
 * @param {*} datetime the datetime around which to construct a filter-bracket
 * @param {*} hoursBeforeAndAfter
 */
export function filterAboutTime(
  rootSubject,
  datetime,
  hoursBeforeAndAfter = 12
) {
  if (!isValidDate(datetime)) {
    return emptyFilter();
  } else {
    const min = new Date(datetime);
    min.setHours(min.getHours() - hoursBeforeAndAfter);
    const minStr = toLocalISODateString(min);
    const max = new Date(datetime);
    max.setHours(max.getHours() + hoursBeforeAndAfter);
    const maxStr = toLocalISODateString(max);

    return wellFormedFilter({
      prefixes: {
        s: won.defaultContext["s"],
        xsd: won.defaultContext["xsd"],
      },
      operations: [
        `FILTER (${rootSubject} >= "${minStr}"^^xsd:dateTime )`,
        `FILTER (${rootSubject} <= "${maxStr}"^^xsd:dateTime )`,
      ],
    });
  }
}

export function filterFloorSizeRange(rootSubject, min, max) {
  const operations = [];
  const prefixes = {
    s: won.defaultContext["s"],
  };
  const minIsNum = isValidNumber(min);
  const maxIsNum = isValidNumber(max);
  const floorSizeVar = `${rootSubject}_floorSize`;
  if (minIsNum || maxIsNum) {
    operations.push(`${rootSubject} s:floorSize/s:value ${floorSizeVar}.`);
  }
  if (minIsNum) {
    operations.push(`FILTER (${floorSizeVar} >= ${min} )`);
  }
  if (maxIsNum) {
    operations.push(`FILTER (${floorSizeVar} <= ${max} )`);
  }
  return wellFormedFilter({ operations, prefixes });
}

/**
 * Uses a given numeric property and finds needs that constrain that
 * property using sh:property, sh:path, sh:minInclusive and sh:maxInclusive.
 *
 * @param {string} rootSubject sparql variable name (must start with '?') to attach triples to
 *  (commonly '?is' or '?seeks')
 * @param {number} number the numeric value for which we are looking for matching constraints
 * @param {URI} property the property (off rootSubject) we're checking. If a prefix other than 's'
 *  is used, it must be added to the query
 * @param {string} sparqlVarPrefix a prefix that will be added to sparql variable generated here
 *  to differentiate them through consecutive calls. The client must make sure the prefixes don't clash!
 */
export function filterNumericProperty(
  rootSubject,
  number,
  property,
  sparqlVarPrefix
) {
  const prefixes = {
    s: won.defaultContext["s"],
  };
  let operations = [];
  const isNum = isValidNumber(number);
  const prefix = `${rootSubject}_${sparqlVarPrefix}`;
  const numberProperty = `${prefix}_prop`;
  const maxVar = `${prefix}_max`;
  const minVar = `${prefix}_min`;
  const restrictedVar = `${prefix}_restricted`;
  const matchedVar = `${prefix}_matched`;
  if (isNum && isSparqlVariable(rootSubject)) {
    operations.push(
      ` 
      OPTIONAL {
        ${rootSubject} sh:property ${numberProperty} .
        ${numberProperty} sh:path ${property} .
        OPTIONAL {
          ${numberProperty} sh:minInclusive ${minVar} .
        }
        OPTIONAL {
          ${numberProperty} sh:maxInclusive ${maxVar} .
        }
        BIND (
           (!BOUND(${minVar}) || ${minVar} <= ${number}) &&
           (!BOUND(${maxVar}) || ${maxVar} >= ${number}) &&
            (BOUND(${maxVar}) || BOUND(${minVar}) 
        ) AS ${matchedVar}) 
      }
      BIND( BOUND(${numberProperty}) as ${restrictedVar})
      FILTER( ! ${restrictedVar} || ${matchedVar} )
      `
    );
  }
  return wellFormedFilter({ operations, prefixes });
}

export function filterNumOfRoomsRange(rootSubject, min, max) {
  const prefixes = {
    s: won.defaultContext["s"],
  };
  const operations = [];
  const minIsNum = isValidNumber(min);
  const maxIsNum = isValidNumber(max);
  const numberOfRoomsVar = `${rootSubject}_numberOfRooms`;
  if (minIsNum || maxIsNum) {
    operations.push(`${rootSubject} s:numberOfRooms ${numberOfRoomsVar}.`);
  }
  if (minIsNum) {
    operations.push(`FILTER (${numberOfRoomsVar} >= ${min} )`);
  }
  if (maxIsNum) {
    operations.push(`FILTER (${numberOfRoomsVar} <= ${max} )`);
  }
  return wellFormedFilter({ operations, prefixes });
}

export function filterRentRange(rootSubject, min, max, currency) {
  const prefixes = {
    s: won.defaultContext["s"],
  };
  let operations = [];
  const minIsNum = isValidNumber(min);
  const maxIsNum = isValidNumber(max);
  const pricespecVar = `${rootSubject}_pricespec`;
  const currencyVar = `${rootSubject}_currency`;
  const priceVar = `${rootSubject}_price`;
  if ((minIsNum || maxIsNum) && currency) {
    operations.push(`FILTER (${currencyVar} = "${currency}") `);
    operations = operations.concat([
      `${rootSubject} s:priceSpecification ${pricespecVar} .`,
      `${pricespecVar} s:price ${priceVar} .`,
      `${pricespecVar} s:priceCurrency ${currencyVar} .`,
    ]);
  }
  if (minIsNum) {
    operations.push(`FILTER (${priceVar} >= ${min} )`);
  }
  if (maxIsNum) {
    operations.push(`FILTER (${priceVar} <= ${max} )`);
  }

  return wellFormedFilter({ operations, prefixes });
}

/**
 * Uses a given rent to find needs that have a matching rentRange. Works like filterNumericProperty (see docs there).
 */
export function filterRent(rootSubject, rent, currency, sparqlVarPrefix) {
  const prefixes = {
    s: won.defaultContext["s"],
  };
  let operations = [];
  const rentIsNum = isValidNumber(rent);
  const prefix = `${rootSubject}_${sparqlVarPrefix}`;
  const priceRangeVar = `${prefix}_pricerange`;
  const currencyVar = `${prefix}_currency`;
  const maxVar = `${prefix}_maxprice`;
  const minVar = `${prefix}_minprice`;
  const restrictedVar = `${prefix}_restricted`;
  const matchedVar = `${prefix}_matched`;
  if (rentIsNum && currency) {
    operations.push(
      `
      OPTIONAL {
         ${rootSubject} s:priceSpecification ${priceRangeVar} .
         ${priceRangeVar} s:priceCurrency ${currencyVar} .
         OPTIONAL {
            ${priceRangeVar} s:maxPrice ${maxVar} .
         }
         OPTIONAL {
            ${priceRangeVar} s:minPrice ${minVar} .
         }
         BIND (
           (${currencyVar} = "${currency}") &&
           (!BOUND(${minVar}) || ${minVar} <= ${rent}) &&
           (!BOUND(${maxVar}) || ${maxVar} >= ${rent}) &&
            (BOUND(${maxVar}) || BOUND(${minVar})
         ) AS ${matchedVar})
      }
      BIND( BOUND(${priceRangeVar}) as ${restrictedVar})
      FILTER( ! ${restrictedVar} || ${matchedVar} )
      `
    );
  }
  return wellFormedFilter({ operations, prefixes });
}

/**
 * @param {*} prefixes an object which' keys are the prefixes
 *  and values the long-form URIs.
 * @returns {String} in the form of e.g.
 * ```
 * prefix s: <http://schema.org/>
 * prefix won: <http://purl.org/webofneeds/model#>
 * ```
 */
export function prefixesString(prefixes) {
  if (!prefixes) {
    return "";
  } else {
    const prefixesStrings = Object.entries(prefixes).map(
      ([prefix, uri]) => `PREFIX ${prefix}: <${uri}>\n`
    );
    return prefixesStrings.join("");
  }
}

function isSparqlVariable(str) {
  return str && str.search(/^\?\w+$/) > -1;
}
//TODO should return a context-def as well

export function generateWhatsAroundQuery(latitude, longitude) {
  return (
    `PREFIX won: <http://purl.org/webofneeds/model#>
          PREFIX s: <http://schema.org/>
          PREFIX geo: <http://www.bigdata.com/rdf/geospatial#>
          PREFIX geoliteral: <http://www.bigdata.com/rdf/geospatial/literals/v1#>
          SELECT DISTINCT ?result WHERE {
            {
              SELECT DISTINCT ?result WHERE {
                  ?result <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> won:Need.
                  ?result won:is ?is.
                  ?is won:hasLocation ?location.
                  ?location s:geo ?location_geo.
                  SERVICE geo:search {
                      ?location_geo geo:search "inCircle".
                      ?location_geo geo:searchDatatype geoliteral:lat-lon.
                      ?location_geo geo:predicate won:geoSpatial.
                      ?location_geo geo:spatialCircleCenter "` +
    latitude +
    `#` +
    longitude +
    `".
                      ?location_geo geo:spatialCircleRadius "10".
                      ?location_geo geo:distanceValue ?location_geoDistance.
                  }
                  FILTER NOT EXISTS { ?result won:hasFlag won:NoHintForCounterpart }
                  FILTER EXISTS { ?result won:isInState  won:Active }
              }
            }
          UNION {
            SELECT DISTINCT ?result WHERE {
                  ?result <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> won:Need.
                  ?result won:seeks ?seeks.
                  ?seeks won:hasLocation ?location.
                  ?location s:geo ?location_geo.
                  SERVICE geo:search {
                      ?location_geo geo:search "inCircle".
                      ?location_geo geo:searchDatatype geoliteral:lat-lon.
                      ?location_geo geo:predicate won:geoSpatial.
                      ?location_geo geo:spatialCircleCenter "` +
    latitude +
    `#` +
    longitude +
    `".
                      ?location_geo geo:spatialCircleRadius "10".
                      ?location_geo geo:distanceValue ?location_geoDistance.
                  }
                  FILTER NOT EXISTS { ?result won:hasFlag won:NoHintForCounterpart }
                  FILTER EXISTS { ?result won:isInState  won:Active }
              }
            }
          }
          ORDER BY (?location_geoDistance)`
  );
}

export function generateWhatsNewQuery() {
  return `PREFIX won: <http://purl.org/webofneeds/model#>
        PREFIX s: <http://schema.org/>
        PREFIX dct: <http://purl.org/dc/terms/>
        SELECT DISTINCT ?result WHERE {
          ?result <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> won:Need.
          ?result dct:created ?created.
          FILTER NOT EXISTS { ?result won:hasFlag won:NoHintForCounterpart }
          FILTER EXISTS { ?result won:isInState  won:Active }
        }
        ORDER BY DESC(?created)`;
}
