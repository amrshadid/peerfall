/** Heavy rule: every 2px line is a real boundary (sheet edge, table, section line). */
export const RULE_WIDTH_PX = 2

/** Thin rule, inside a sheet. */
export const RULE_THIN_WIDTH_PX = 1

/** Section 2 is square-cut: no rounded corners anywhere. */
export const RADIUS = 0

/** Icons sit on a 24px grid with a stroke as heavy as the rule. */
export const ICON_GRID_PX = 24
export const ICON_STROKE_PX = RULE_WIDTH_PX

/** Default for the Settings UI scale; every size in the kit is in rem, so this scales the whole UI. */
export const DEFAULT_UI_SCALE = 1
