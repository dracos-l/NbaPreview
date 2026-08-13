export const BOSTON_CELTICS_ID = "583eccfa-fb46-11e1-82cb-f4ce4684ea4c";
export const FIXTURE_NAMES = ["team-profile", "depth-chart", "seasonal-stats", "injuries", "transfers", "news", "change-log"] as const;
export type FixtureName = (typeof FIXTURE_NAMES)[number];
