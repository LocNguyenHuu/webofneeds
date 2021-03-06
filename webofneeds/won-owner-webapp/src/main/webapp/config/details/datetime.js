import {
  isValidDate,
  parseDatetimeStrictly,
  toLocalISODateString,
} from "../../app/utils.js";
import won from "../../app/won-es6.js";

export const fromDatetime = {
  identifier: "fromDatetime",
  label: "Starting at",
  icon: "#ico36_detail_datetime",
  placeholder: "Enter Date and Time...",
  component: "won-datetime-picker",
  viewerComponent: "won-datetime-viewer",
  messageEnabled: true,
  parseToRDF: function({ value }) {
    // value can be an xsd:datetime-string or a javascript date object
    const datetime = parseDatetimeStrictly(value);
    if (!isValidDate(datetime)) {
      return { "s:validFrom": undefined };
    } else {
      const datetimeString = toLocalISODateString(datetime);
      return {
        "s:validFrom": { "@value": datetimeString, "@type": "xsd:dateTime" },
      };
    }
  },
  parseFromRDF: function(jsonLDImm) {
    return won.parseFrom(jsonLDImm, ["s:validFrom"], "xsd:dateTime");
  },
  generateHumanReadable: function({ value, includeLabel }) {
    if (value) {
      const maybeLabel = includeLabel ? this.label + ": " : "";
      const datetime = parseDatetimeStrictly(value);
      const timestring = isValidDate(datetime) ? datetime.toLocaleString() : "";
      return maybeLabel + timestring;
    }
    return undefined;
  },
};

export const throughDatetime = {
  identifier: "throughDatetime",
  label: "Ending at",
  icon: "#ico36_detail_datetime",
  placeholder: "Enter Date and Time...",
  component: "won-datetime-picker",
  viewerComponent: "won-datetime-viewer",
  messageEnabled: true,
  parseToRDF: function({ value }) {
    // value can be an xsd:datetime-string or a javascript date object
    const datetime = parseDatetimeStrictly(value);
    if (!isValidDate(datetime)) {
      return { "s:validThrough": undefined };
    } else {
      const datetimeString = toLocalISODateString(datetime);
      return {
        "s:validThrough": {
          "@value": datetimeString,
          "@type": "xsd:dateTime",
        },
      };
    }
  },
  parseFromRDF: function(jsonLDImm) {
    return won.parseFrom(jsonLDImm, ["s:validThrough"], "xsd:dateTime");
  },
  generateHumanReadable: function({ value, includeLabel }) {
    if (value) {
      const maybeLabel = includeLabel ? this.label + ": " : "";
      const datetime = parseDatetimeStrictly(value);
      const timestring = isValidDate(datetime) ? datetime.toLocaleString() : "";
      return maybeLabel + timestring;
    }
    return undefined;
  },
};

export const datetimeRange = {
  identifier: "datetimeRange",
  label: "Timerange",
  icon: "#ico36_detail_datetime",
  placeholder: undefined,
  component: "won-datetime-range-picker",
  viewerComponent: "won-datetime-viewer", // not used, values are read as fromDatetime and throughDatetime
  messageEnabled: false,
  parseToRDF: function({ value }) {
    if (value) {
      const fromDatetime = parseDatetimeStrictly(value.fromDatetime);
      const toDatetime = parseDatetimeStrictly(value.toDatetime);

      let validFrom = undefined;
      let validThrough = undefined;

      if (isValidDate(fromDatetime)) {
        const fromDatetimeString = toLocalISODateString(fromDatetime);
        validFrom = {
          "@value": fromDatetimeString,
          "@type": "xsd:dateTime",
        };
      }

      if (isValidDate(toDatetime)) {
        const toDatetimeString = toLocalISODateString(toDatetime);
        validThrough = {
          "@value": toDatetimeString,
          "@type": "xsd:dateTime",
        };
      }

      return {
        "s:validFrom": validFrom,
        "s:validThrough": validThrough,
      };
    } else {
      return {
        "s:validFrom": undefined,
        "s:validThrough": undefined,
      };
    }
  },
  parseFromRDF: function() {}, // RDF should be parsed by fromDatetime and throughDatetime
  generateHumanReadable: function() {}, // should be generated by fromDatetime and troughDatetime
};
