import { cyclingGroup } from "./group-cycling.js";
import { lunchGroup } from "./group-lunch.js";

export const activitiesGroup = {
  identifier: "activitiesgroup",
  label: "Activities",
  icon: undefined,
  subItems: {
    lunchGroup: lunchGroup,
    cyclingGroup: cyclingGroup,
  },
};
