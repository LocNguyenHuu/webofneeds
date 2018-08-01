import { is } from "../app/utils.js";
import Immutable from "immutable";
import { details, abstractDetails } from "detailDefinitions";
import { Parser as SparqlParser } from "sparqljs";

export const emptyDraft = {
  is: {},
  seeks: {},
  matchingContext: undefined,
};

/**
 * USE CASE REQUIREMENTS
 * detail identifiers in is and seeks have to be unique
 * detail identifiers must not be "search"
 * if two details use the same predicate on the same level,
 * the latter detail will overwrite the former.
 * Example:
 * useCase: {
 *    identifier: "useCase",
 *    isDetails: {
 *        detailA: {...details.description, identifier: "detailA"},
 *        detailB: {...details.description, identifier: "detailB"},
 *    }
 * }
 *
 * In this case, the value of detailB will overwrite the value of detailA, because
 * both use the predicate "dc:description".
 * To avoid this, redefine the parseToRDF() and parseFromRDF() methods for either
 * detail to use a different predicate.
 *
 * SUPPLYING A QUERY
 * If it is necessary to fine-tune the matching behaviour of a usecase, a custom SPARQL query can be added to the definition.
 * Exmaple:
 * useCase: {
 *    ...,
 *    generateQuery: (draft, resultName) => {
 *        new SparqlParser.parse(`
 *            PREFIX won: <http://purl.org/webofneeds/model#>
 *
 *            SELECT ${resultName} WHERE {
 *                ${resultName} a won:Need .
 *            }
 *        `)
 *    }
 * }
 *
 * A `generateQuery` is a function that takes the current need draft and the name of the result variable and returns a sparqljs json representation of the query. This can be created either programmatically or by using the Parser class from the sparqljs library.
 *
 * The query needs to be a SELECT query and select only the resultName variable.
 * This will be automatically enforced by the need builder.
 */

const allDetailsUseCase = {
  allDetails: {
    identifier: "allDetails",
    label: "New custom post",
    icon: "#ico36_uc_custom",
    draft: { ...emptyDraft },
    isDetails: details,
    seeksDetails: details,
  },
  testPickerUseCase: {
    identifier: "pickerTestUseCase",
    label: "Picker Test",
    icon: "#ico36_uc_custom",
    draft: {
      ...emptyDraft,
      is: {
        checkbox: ["1", "2", "4", "5+"],
        minMaxFloorSize: { min: 10, max: 15 },
      },
      seeks: {
        radio: "4",
        minMaxFloorSize: { min: 10, max: 15 },
      },
    },
    isDetails: {
      checkbox: {
        component: "won-select-picker",
        viewerComponent: "won-select-viewer",
        identifier: "checkbox",
        label: "Checkbox",
        icon: "#ico36_tags_circle",
        multiSelect: true,
        options: [
          { value: "1", label: "one" },
          { value: "2", label: "two" },
          { value: "3", label: "three" },
          { value: "4", label: "four" },
          { value: "5+", label: "more" },
        ],
        parseToRDF: function({ value }) {
          if (!value) {
            return { "won:hasCheckbox": undefined };
          }
          return { "won:hasCheckbox": value };
        },
        parseFromRDF: function(jsonLDImm) {
          const checkbox = jsonLDImm && jsonLDImm.get("won:hasCheckbox");

          if (!checkbox) {
            return undefined;
          } else if (is("String", checkbox)) {
            return Immutable.fromJS([checkbox]);
          } else if (is("Array", checkbox)) {
            return Immutable.fromJS(checkbox);
          } else if (Immutable.List.isList(checkbox)) {
            return checkbox; // id; it is already in the format we want
          } else {
            console.error(
              "Found unexpected format of checkbox (should be Array, " +
                "Immutable.List, or a single checkbox as string): " +
                JSON.stringify(checkbox)
            );
            return undefined;
          }
        },
        generateHumanReadable: function({ value, includeLabel }) {
          if (value && this.options) {
            let humanReadable = "";

            for (const key in value) {
              const foundOption = this.options.find(
                elem => elem.value === value[key]
              );
              const foundOptionLabel = foundOption && foundOption.label;
              if (foundOptionLabel) {
                humanReadable += foundOptionLabel + ", ";
              }
            }
            humanReadable = humanReadable.trim();

            if (humanReadable.length > 0) {
              humanReadable = humanReadable.substr(0, humanReadable.length - 1);
              return includeLabel
                ? this.label + ": " + humanReadable
                : humanReadable;
            }
          }
          return undefined;
        },
      },
    },
    seeksDetails: {
      radio: {
        component: "won-select-picker",
        viewerComponent: "won-select-viewer",
        identifier: "radio",
        label: "Radio",
        icon: "#ico36_tags_circle",
        multiSelect: false,
        options: [
          { value: "1", label: "one" },
          { value: "2", label: "two" },
          { value: "3", label: "three" },
          { value: "4", label: "four" },
          { value: "5+", label: "more" },
        ],
        parseToRDF: function({ value }) {
          if (!value) {
            return { "won:hasRadio": undefined };
          }
          return { "won:hasRadio": value };
        },
        parseFromRDF: function(jsonLDImm) {
          const radio = jsonLDImm && jsonLDImm.get("won:hasRadio");

          if (!radio) {
            return undefined;
          } else if (is("String", radio)) {
            return Immutable.fromJS([radio]);
          } else if (is("Array", radio)) {
            return Immutable.fromJS(radio);
          } else if (Immutable.List.isList(radio)) {
            return radio; // id; it is already in the format we want
          } else {
            console.error(
              "Found unexpected format of checkbox (should be Array, " +
                "Immutable.List, or a single radio as string): " +
                JSON.stringify(radio)
            );
            return undefined;
          }
        },
        generateHumanReadable: function({ value, includeLabel }) {
          if (value && this.options) {
            let humanReadable = "";

            for (const key in value) {
              const foundOption = this.options.find(
                elem => elem.value === value[key]
              );
              const foundOptionLabel = foundOption && foundOption.label;
              if (foundOptionLabel) {
                humanReadable += foundOptionLabel + ", ";
              }
            }
            humanReadable = humanReadable.trim();

            if (humanReadable.length > 0) {
              humanReadable = humanReadable.substr(0, humanReadable.length - 1);
              return includeLabel
                ? this.label + ": " + humanReadable
                : humanReadable;
            }
          }
          return undefined;
        },
      },
    },
  },
};

const skillsDetail = {
  ...details.tags,
  identifier: "skills",
  label: "Skills",
  icon: "#ico36_skill_circle",
  placeholder: "e.g. RDF, project-management",
  parseToRDF: function({ value }) {
    if (!value) {
      return { "s:knowsAbout": undefined };
    }
    return { "s:knowsAbout": value };
  },
  parseFromRDF: function(jsonLDImm) {
    const skills = jsonLDImm && jsonLDImm.get("s:knowsAbout");
    if (!skills) {
      return undefined;
    } else if (is("String", skills)) {
      return Immutable.fromJS([skills]);
    } else if (is("Array", skills)) {
      return Immutable.fromJS(skills);
    } else if (Immutable.List.isList(skills)) {
      return skills; // id; it is already in the format we want
    } else {
      console.error(
        "Found unexpected format of skills (should be Array, " +
          "Immutable.List, or a single tag as string): " +
          JSON.stringify(skills)
      );
      return undefined;
    }
  },
};

const interestsDetail = {
  ...details.tags,
  identifier: "interests",
  label: "Interests",
  icon: "#ico36_heart_circle",
  placeholder: "e.g. food, cats",
  parseToRDF: function({ value }) {
    if (!value) {
      return { "foaf:topic_interest": undefined };
    }
    return { "foaf:topic_interest": value };
  },
  parseFromRDF: function(jsonLDImm) {
    const interests = jsonLDImm && jsonLDImm.get("foaf:topic_interest");
    if (!interests) {
      return undefined;
    } else if (is("String", interests)) {
      return Immutable.fromJS([interests]);
    } else if (is("Array", interests)) {
      return Immutable.fromJS(interests);
    } else if (Immutable.List.isList(interests)) {
      return interests; // id; it is already in the format we want
    } else {
      console.error(
        "Found unexpected format of interests (should be Array, " +
          "Immutable.List, or a single tag as string): " +
          JSON.stringify(interests)
      );
      return undefined;
    }
  },
};

// TODO: roles?
// note: if no details are to be added for is or seeks,
// there won't be an is or seeks part unless defined in the draft
// details predefined in the draft can only be changed IF included in the correct detail list
const socialUseCases = {
  breakfast: {
    identifier: "breakfast",
    label: "Get breakfast",
    icon: "#ico36_uc_breakfast",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm up for breakfast! Any plans?",
        tags: ["breakfast"],
      },
      seeks: { title: "breakfast" },
      searchString: "breakfast",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      foodAllergies: {
        ...details.description,
        identifier: "foodallergies",
        label: "Food Allergies",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "won:foodAllergies": undefined }; // FIXME: won:foodAllergies does not exist
          }
          return { "won:foodAllergies": value };
        },
        parseFromRDF: function(jsonLDImm) {
          return jsonLDImm && jsonLDImm.get("won:foodAllergies");
        },
      },
      location: { ...details.location },
      interests: { ...interestsDetail },
    },
    seeksDetails: undefined,
  },
  lunch: {
    identifier: "lunch",
    label: "Get lunch",
    icon: "#ico36_uc_meal-half",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm up for lunch! Any plans?",
        tags: ["lunch"],
      },
      searchString: "lunch",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      foodAllergies: {
        ...details.description,
        identifier: "foodallergies",
        label: "Food Allergies",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "won:foodAllergies": undefined }; // FIXME: won:foodAllergies does not exist
          }
          return { "won:foodAllergies": value };
        },
        parseFromRDF: function(jsonLDImm) {
          return jsonLDImm && jsonLDImm.get("won:foodAllergies");
        },
      },
      location: { ...details.location },
      interests: { ...interestsDetail },
    },
    seeksDetails: undefined,
  },
  afterparty: {
    identifier: "afterparty",
    label: "Go out",
    icon: "#ico36_uc_drinks",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm up for partying! Any plans?",
        tags: ["afterparty"],
      },
      searchString: "afterparty",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
      interests: { ...interestsDetail },
    },
  },
  sightseeing: {
    identifier: "sightseeing",
    label: "Go sightseeing",
    icon: "#ico36_uc_sightseeing",
    draft: {
      ...emptyDraft,
      is: { tags: ["sightseeing"] },
      searchString: "sightseeing",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
      interests: { ...interestsDetail },
    },
  },
};

const professionalUseCases = {
  getToKnow: {
    identifier: "getToKnow",
    label: "Find people",
    icon: "#ico36_uc_find_people",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm up for meeting new people!",
        tags: ["meetup"],
      },
      searchString: "meetup",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
      person: { ...details.person },
      skills: { ...skillsDetail },
      interests: { ...interestsDetail },
    },
    seeksDetails: {
      description: { ...details.description },
      location: { ...details.location },
      skills: { ...skillsDetail },
      interests: { ...interestsDetail },
    },
  },
  phdIs: {
    identifier: "phdIs",
    label: "Offer a PhD position",
    icon: "#ico36_uc_phd",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm offering a PhD position!",
        tags: ["offer-phd"],
      },
      searchString: "search-phd",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
    },
    seeksDetails: {
      skills: { ...skillsDetail, placeholder: "" }, // TODO: find good placeholders
      interests: { ...interestsDetail, placeholder: "" },
    },
  },
  phdSeeks: {
    identifier: "phdSeeks",
    label: "Find a PhD position",
    icon: "#ico36_uc_phd",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm looking for a PhD position!",
        tags: ["search-phd"],
      },
      searchString: "offer-phd",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      person: { ...details.person },
      skills: { ...skillsDetail, placeholder: "" }, // TODO: find good placeholders
      interests: { ...interestsDetail, placeholder: "" },
    },
    seeksDetails: {
      description: { ...details.description },
      location: { ...details.location },
    },
  },
  postDocIs: {
    identifier: "postDocIs",
    label: "Offer a PostDoc position",
    icon: "#ico36_uc_postdoc",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm offering a PostDoc position!",
        tags: ["offer-postdoc"],
      },
      searchString: "search-postdoc",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
    },
    seeksDetails: {
      skills: { ...skillsDetail, placeholder: "" }, // TODO: find good placeholders
      interests: { ...interestsDetail, placeholder: "" },
    },
  },
  postDocSeeks: {
    identifier: "postDocSeeks",
    label: "Find a PostDoc position",
    icon: "#ico36_uc_postdoc",
    draft: {
      ...emptyDraft,
      is: {
        title: "I'm looking for a PostDoc position!",
        tags: ["search-postdoc"],
      },
      searchString: "offer-postdoc",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      person: { ...details.person },
      skills: { ...skillsDetail, placeholder: "" }, // TODO: find good placeholders
      interests: { ...interestsDetail, placeholder: "" },
    },
    seeksDetails: {
      description: { ...details.description },
      location: { ...details.location },
    },
  },
  consortiumIs: {
    identifier: "consortiumIs",
    label: "Offer slot in a project consortium",
    icon: "#ico36_uc_consortium-offer",
    draft: {
      ...emptyDraft,
      is: {
        title: "Offering a slot in a project consortium",
        tags: ["offer-consortium"],
      },
      searchString: "search-consortium",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
    },
    seeksDetails: {
      description: { ...details.description },
      location: { ...details.location },
      skills: { ...skillsDetail, placeholder: "" }, // TODO: find good placeholders
      interests: { ...interestsDetail, placeholder: "" },
    },
  },
  consortiumSeeks: {
    identifier: "consortiumSeeks",
    label: "Find a project consortium to join",
    icon: "#ico36_uc_consortium-search",
    draft: {
      ...emptyDraft,
      is: {
        title: "Looking for a slot in a project consortium",
        tags: ["search-consortium"],
      },
      searchString: "offer-consortium",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
      skills: { ...skillsDetail, placeholder: "" }, // TODO: find good placeholders
      interests: { ...interestsDetail, placeholder: "" },
    },
    seeksDetails: {
      description: { ...details.description },
      location: { ...details.location },
    },
  },
};

const infoUseCases = {
  question: {
    identifier: "question",
    label: "Ask a question",
    icon: "#ico36_uc_question",
    draft: {
      ...emptyDraft,
      is: { tags: ["question"] },
      seeks: { tags: "answer" },
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
      tags: {
        ...details.tags,
        placeholder: "e.g. question, general, area-of-interest",
      },
    },
    seeksDetails: undefined,
  },
  answer: {
    //answer should have 'no hint for counterpart'
    identifier: "answer",
    label: "Answer questions",
    icon: "#ico36_uc_answer",
    draft: {
      ...emptyDraft,
      is: {
        title: "Answer questions",
        tags: ["answer"],
      },
      seeks: { tags: "question" },
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: { ...details.location },
      tags: {
        ...details.tags,
        placeholder: "e.g. answer, general, area-of-interest",
      },
    },
    seeksDetails: undefined,
  },
};

const realEstateFloorSizeDetail = {
  ...abstractDetails.number,
  identifier: "floorSize",
  label: "Floor size in square meters",
  icon: "#ico36_plus_circle", // TODO: better icon
  parseToRDF: function({ value }) {
    if (!value) {
      return { "s:floorSize": undefined };
    }
    return {
      "s:floorSize": {
        "@type": "s:QuantitativeValue",
        "s:value": [{ "@value": value, "@type": "xsd:float" }],
        "s:unitCode": "MTK",
      },
    };
  },
  parseFromRDF: function(jsonLDImm) {
    const floorSize = jsonLDImm && jsonLDImm.get("s:floorSize");
    const fs = floorSize && floorSize.get("s:value");
    const unit = floorSize && floorSize.get("s:unitCode");
    if (!fs) {
      return undefined;
    } else {
      if (unit === "MTK") {
        return fs + "m²";
      } else if (unit === "FTK") {
        return fs + "sq ft";
      } else if (unit === "YDK") {
        return fs + "sq yd";
      } else if (!unit) {
        return fs + " (no unit specified)";
      }
      return fs + " " + unit;
    }
  },
  generateHumanReadable: function({ value, includeLabel }) {
    if (value) {
      return (includeLabel ? this.label + ": " + value : value) + "m²";
    }
    return undefined;
  },
};

const realEstateNumberOfRoomsDetail = {
  ...abstractDetails.range,
  identifier: "numberOfRooms",
  label: "Number of Rooms",
  minLabel: "From",
  maxLabel: "To",
  icon: "#ico36_plus_circle", // TODO: better icon
  parseToRDF: function({ value }) {
    if (!value) {
      return {};
    }
    return {
      "https://www.w3.org/ns/shacl#property": {
        "https://www.w3.org/ns/shacl#path": "s:numberOfRooms",
        "https://www.w3.org/ns/shacl#minInclusive": value.min,
        "https://www.w3.org/ns/shacl#maxInclusive": value.max,
      },
    };
  },
  parseFromRDF: function(jsonLDImm) {
    let properties =
      jsonLDImm && jsonLDImm.get("https://www.w3.org/ns/shacl#property");
    if (!properties) return undefined;

    if (!Immutable.List.isList(properties))
      properties = Immutable.List.of(properties);

    const numberOfRooms = properties.find(
      property =>
        property.get("https://www.w3.org/ns/shacl#path") == "s:numberOfRooms"
    );

    if (numberOfRooms) {
      return Immutable.fromJS({
        min: numberOfRooms.get("https://www.w3.org/ns/shacl#minInclusive"),
        max: numberOfRooms.get("https://www.w3.org/ns/shacl#maxInclusive"),
      });
    } else {
      return undefined;
    }
  },
  generateHumanReadable: function({ value, includeLabel }) {
    if (value) {
      return `${includeLabel ? `${this.label}: ` : ""}${value.min} - ${
        value.max
      } Rooms`;
    }
    return undefined;
  },
};

const realEstateFeaturesDetail = {
  ...details.tags,
  identifier: "features",
  label: "Features",
  icon: "#ico36_plus_circle", //TODO: better icon
  placeholder: "e.g. balcony, bathtub",
  parseToRDF: function({ value }) {
    if (!value) {
      return { "s:amenityFeature": undefined };
    } else {
      return {
        "s:amenityFeature": {
          "@type": "s:LocationFeatureSpecification",
          "s:name": value,
        },
      };
    }
  },
  parseFromRDF: function(jsonLDImm) {
    const amenityFeature = jsonLDImm && jsonLDImm.get("s:amenityFeature");
    const features = amenityFeature && amenityFeature.get("s:name");

    if (!features) {
      return undefined;
    } else if (is("String", features)) {
      return Immutable.fromJS([features]);
    } else if (is("Array", features)) {
      return Immutable.fromJS(features);
    } else if (Immutable.List.isList(features)) {
      return features;
    } else {
      console.error(
        "Found unexpected format of features (should be Array, " +
          "Immutable.List, or a single tag as string): " +
          JSON.stringify(features)
      );
      return undefined;
    }
  },
};

const realEstateRentDetail = {
  ...abstractDetails.number,
  identifier: "rent",
  label: "Rent in EUR/month",
  icon: "#ico36_plus_circle", //TODO: better icon
  parseToRDF: function({ value }) {
    if (!value) {
      return { "s:priceSpecification": undefined };
    }
    return {
      "s:priceSpecification": {
        "@type": "s:CompoundPriceSpecification",
        "s:price": [{ "@value": value, "@type": "xsd:float" }],
        "s:priceCurrency": "EUR",
        "s:description": "total rent per month",
        // "s:priceComponent": {
        //   "@type": "s:UnitPriceSpecification",
        //   "s:price": 0,
        //   "s:priceCurrency": "EUR",
        //   "s:description": "",
        // }
      },
    };
  },
  parseFromRDF: function(jsonLDImm) {
    const rentPrice = jsonLDImm && jsonLDImm.get("s:priceSpecification");
    const rent = rentPrice && rentPrice.get("s:price");

    if (!rent) {
      return undefined;
    } else {
      return rent + " EUR/month";
    }
  },
  generateHumanReadable: function({ value, includeLabel }) {
    if (value) {
      return (includeLabel ? this.label + ": " + value : value) + " EUR/month";
    }
    return undefined;
  },
};

const realEstateRentRangeDetail = {
  ...abstractDetails.range,
  identifier: "rentRange",
  label: "Rent in EUR/month",
  minLabel: "From",
  maxLabel: "To",
  icon: "#ico36_plus_circle", //TODO: better icon
  parseToRDF: function({ value }) {
    if (!value || !(value.min || value.max)) {
      return { "s:priceSpecification": undefined };
    }
    return {
      "s:priceSpecification": {
        "@type": "s:CompoundPriceSpecification",
        "s:minPrice": value.min && [
          { "@value": value.min, "@type": "xsd:float" },
        ],
        "s:maxPrice": value.max && [
          { "@value": value.max, "@type": "xsd:float" },
        ],
        "s:priceCurrency": "EUR",
        "s:description": "total rent per month in between min/max",
      },
    };
  },
  parseFromRDF: function(jsonLDImm) {
    const rentPrice = jsonLDImm && jsonLDImm.get("s:priceSpecification");
    const minRent = rentPrice && rentPrice.get("s:minPrice");
    const maxRent = rentPrice && rentPrice.get("s:maxPrice");

    // if there's anything, use it
    if (minRent || maxRent) {
      const rentRange = {
        min: minRent && minRent + " EUR/month",
        max: maxRent && maxRent + " EUR/month",
      };

      return Immutable.fromJS(rentRange);
    }
    return undefined;
  },
  generateHumanReadable: function({ value, includeLabel }) {
    if (value) {
      let humanReadable;
      if (value.min && value.max) {
        humanReadable =
          "between " + value.min + " and " + value.max + " EUR/month";
      } else if (value.min) {
        humanReadable = "at least " + value.min + "EUR/month";
      } else if (value.max) {
        humanReadable = "at most " + value.max + "EUR/month";
      }
      if (humanReadable) {
        return includeLabel ? this.label + ": " + humanReadable : humanReadable;
      }
    }
    return undefined;
  },
};

const realEstateUseCases = {
  searchRent: {
    identifier: "searchRent",
    label: "Find a place to rent",
    icon: "#ico36_uc_realestate",
    draft: {
      ...emptyDraft,
      seeks: {
        type: "won:Rent",
        tags: ["for-rent"],
      },
      is: {
        type: "won:SearchRent",
        tags: ["to-rent"],
      },
    },
    isDetails: undefined,
    seeksDetails: {
      location: { ...details.location },
      floorSize: { ...realEstateFloorSizeDetail },
      numberOfRooms: { ...realEstateNumberOfRoomsDetail },
      features: { ...realEstateFeaturesDetail },
      rentRange: { ...realEstateRentRangeDetail },
    },
    generateQuery: (draft, resultName) => {
      const seeksBranch = draft && draft.seeks;
      const rentRange = seeksBranch && seeksBranch.rentRange;
      let filterStrings = [];

      if (rentRange) {
        if (rentRange.min || rentRange.max) {
          filterStrings.push("FILTER (?currency = 'EUR') ");
        }
        if (rentRange.min) {
          filterStrings.push(
            "FILTER (?price >= " + draft.seeks.rentRange.min + " )"
          );
        }
        if (rentRange.max) {
          filterStrings.push(
            "FILTER (?price <= " + draft.seeks.rentRange.max + " )"
          );
        }
      }

      const prefixes = `
        prefix s:     <http://schema.org/>
        prefix won:   <http://purl.org/webofneeds/model#>
        prefix dc:    <http://purl.org/dc/elements/1.1/>
      `;
      let queryTemplate =
        prefixes +
        " Select " +
        resultName +
        "WHERE { " +
        resultName +
        ` won:is ?is.
          ?is s:priceSpecification ?pricespec.
          ?pricespec s:price ?price.
          ?pricespec s:priceCurrency ?currency. ` +
        (filterStrings && filterStrings.join(" ")) +
        " }";

      return new SparqlParser().parse(queryTemplate);
    },
  },
  offerRent: {
    identifier: "offerRent",
    label: "Rent a place out",
    icon: "#ico36_uc_realestate",
    draft: {
      ...emptyDraft,
      is: {
        title: "For Rent",
        tags: ["for-rent"],
      },
      seeks: {
        tags: ["to-rent"],
      },
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      location: {
        ...details.location,
        mandatory: true,
      },
      floorSize: { ...realEstateFloorSizeDetail },
      numberOfRooms: { ...realEstateNumberOfRoomsDetail },
      features: { ...realEstateFeaturesDetail },
      rent: {
        ...realEstateRentDetail,
        mandatory: true,
      },
    },
    seeksDetails: undefined,
  },
  // searchBuy: {},
  // offerBuy: {},
};

const transportUseCases = {
  taxiDemand: {
    identifier: "taxiDemand",
    label: "Find a taxi",
    icon: "#ico36_uc_route_demand",
    draft: {
      ...emptyDraft,
      is: { title: "Looking for a taxi", tags: "search-taxi" },
      searchString: "offer-taxi",
    },
    // TODO: amount of people? other details?
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
    },
    seeksDetails: {
      location: { ...details.location },
      travelAction: { ...details.travelAction },
    },
  },
  taxiOffer: {
    identifier: "taxiOffer",
    label: "Offer a taxi",
    icon: "#ico36_uc_taxi_offer",
    draft: {
      ...emptyDraft,
      is: { title: "Taxi", tags: "offer-taxi" },
      searchString: "search-taxi",
    },
    isDetails: {
      title: { ...details.title },
      description: { ...details.description },
      // location: {...details.location}, // TODO: add area of service
    },
  },
  transportDemand: {
    identifier: "transportDemand",
    label: "Send something",
    icon: "#ico36_uc_transport_demand",
    draft: {
      ...emptyDraft,
      is: { title: "Looking to get something transported" },
    },
    isDetails: {
      title: { ...details.title },
      content: {
        ...details.description,
        identifier: "content",
        label: "Content",
        placeholder: "Provide information about what should be transported",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "s:name": undefined };
          } else {
            return { "@type": "s:Product", "s:name": value };
          }
        },
        parseFromRDF: function(jsonLDImm) {
          const content = jsonLDImm && jsonLDImm.get("s:name");
          if (content) {
            console.log("JSONLDImm of @type: ", jsonLDImm.get("@type"));
            return content;
          }
        },
      },
      weight: {
        ...abstractDetails.number,
        identifier: "weight",
        label: "Weight in kg",
        icon: "#ico36_plus_circle",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "s:weight": undefined };
          } else {
            return {
              "@type": "s:Product",
              "s:weight": {
                "@type": "s:QuantitativeValue",
                "s:value": [{ "@value": value, "@type": "xsd:float" }],
                "s:unitCode": "KGM",
              },
            };
          }
        },
        parseFromRDF: function(jsonLDImm) {
          const weight = jsonLDImm && jsonLDImm.get("s:weight");
          const w = weight && weight.get("s:value");
          const unit = weight && weight.get("s:unitCode");

          if (!w) {
            return undefined;
          } else {
            if (unit === "KGM") {
              return w + "kg";
            } else if (unit === "GRM") {
              return w + "g";
            } else if (!unit) {
              return w + " (no unit specified)";
            }
            return w + " " + unit;
          }
        },
        generateHumanReadable: function({ value, includeLabel }) {
          if (value) {
            return (includeLabel ? this.label + ": " + value : value) + "kg";
          }
          return undefined;
        },
      },
      length: {
        ...abstractDetails.number,
        identifier: "length",
        label: "Length in cm",
        icon: "#ico36_plus_circle",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "s:length": undefined };
          } else {
            return {
              "@type": "s:Product",
              "s:length": {
                "@type": "s:QuantitativeValue",
                "s:value": [{ "@value": value, "@type": "xsd:float" }],
                "s:unitCode": "CMT",
              },
            };
          }
        },
        parseFromRDF: function(jsonLDImm) {
          const length = jsonLDImm && jsonLDImm.get("s:length");
          const l = length && length.get("s:value");
          const unit = length && length.get("s:unitCode");

          if (!l) {
            return undefined;
          } else {
            if (unit === "CMT") {
              return l + "cm";
            } else if (unit === "MTR") {
              return l + "m";
            } else if (!unit) {
              return l + " (no unit specified)";
            }
            return l + " " + unit;
          }
        },
        generateHumanReadable: function({ value, includeLabel }) {
          if (value) {
            return (includeLabel ? this.label + ": " + value : value) + "cm";
          }
          return undefined;
        },
      },
      width: {
        ...abstractDetails.number,
        identifier: "width",
        label: "Width in cm",
        icon: "#ico36_plus_circle",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "s:width": undefined };
          } else {
            return {
              "@type": "s:Product",
              "s:width": {
                "@type": "s:QuantitativeValue",
                "s:value": [{ "@value": value, "@type": "xsd:float" }],
                "s:unitCode": "CMT",
              },
            };
          }
        },
        parseFromRDF: function(jsonLDImm) {
          const width = jsonLDImm && jsonLDImm.get("s:width");
          const w = width && width.get("s:value");
          const unit = width && width.get("s:unitCode");

          if (!w) {
            return undefined;
          } else {
            if (unit === "CMT") {
              return w + "cm";
            } else if (unit === "MTR") {
              return w + "m";
            } else if (!unit) {
              return w + " (no unit specified)";
            }
            return w + " " + unit;
          }
        },
        generateHumanReadable: function({ value, includeLabel }) {
          if (value) {
            return (includeLabel ? this.label + ": " + value : value) + "cm";
          }
          return undefined;
        },
      },
      height: {
        ...abstractDetails.number,
        identifier: "height",
        label: "Height in cm",
        icon: "#ico36_plus_circle",
        parseToRDF: function({ value }) {
          if (!value) {
            return { "s:height": undefined };
          } else {
            return {
              "@type": "s:Product",
              "s:height": {
                "@type": "s:QuantitativeValue",
                "s:value": [{ "@value": value, "@type": "xsd:float" }],
                "s:unitCode": "CMT",
              },
            };
          }
        },
        parseFromRDF: function(jsonLDImm) {
          const height = jsonLDImm && jsonLDImm.get("s:height");
          const h = height && height.get("s:value");
          const unit = height && height.get("s:unitCode");

          if (!h) {
            return undefined;
          } else {
            if (unit === "CMT") {
              return h + "cm";
            } else if (unit === "MTR") {
              return h + "m";
            } else if (!unit) {
              return h + " (no unit specified)";
            }
            return h + " " + unit;
          }
        },
        generateHumanReadable: function({ value, includeLabel }) {
          if (value) {
            return (includeLabel ? this.label + ": " + value : value) + "cm";
          }
          return undefined;
        },
      },
      tags: { ...details.tags },
    },
    seeksDetails: {
      travelAction: { ...details.travelAction },
    },
  },
  transportOffer: {
    identifier: "transportOffer",
    label: "Offer Transportation",
    icon: "#ico36_uc_transport_offer",
    draft: {
      ...emptyDraft,
      is: { title: "Transportation Offer" },
      searchString: "transport", // TODO: replace this with a query
    },
    isDetails: {
      title: { ...details.title },
      location: { ...details.location },
    },
    seeksDetails: {
      tags: { ...details.tags },
      description: { ...details.description },
    },
  },
};

export const useCases = {
  ...socialUseCases,
  ...professionalUseCases,
  ...infoUseCases,
  ...realEstateUseCases,
  ...transportUseCases,
  ...allDetailsUseCase,
};

export const useCaseGroups = {
  social: {
    identifier: "socialgroup",
    label: "Fun activities to do together",
    icon: undefined,
    useCases: { ...socialUseCases },
  },
  realEstate: {
    identifier: "realestategroup",
    label: "Real Estate",
    icon: undefined,
    useCases: { ...realEstateUseCases },
  },
  transport: {
    identifier: "transportgroup",
    label: "Transport",
    icon: undefined,
    useCases: { ...transportUseCases },
  },
  professional: {
    identifier: "professionalgroup",
    label: "Professional networking",
    icon: undefined,
    useCases: { ...professionalUseCases },
  },
  info: {
    identifier: "infogroup",
    label: "Questions and Answers",
    icon: undefined,
    useCases: { ...infoUseCases },
  },
  other: {
    identifier: "othergroup",
    label: "Something else",
    icon: undefined,
    useCases: { ...allDetailsUseCase },
  },
};
