/** A skill's id, as `skills.yaml` lists it and missions earn and need it: `read-interfaces-and-routes`. */
export type SkillId = string

/**
 * One node of the skill tree: something concrete the player can do once a mission is completed,
 * such as "read a router's interfaces and routes". Missions earn skills and need them, and a
 * mission opens once every skill it needs is earned.
 */
export interface SkillDefinition {
  readonly id: SkillId
  /** In plain words, for a beginner: "Read a router's interfaces and routes". */
  readonly title: string
  /** The region of `chapters.yaml` whose mission earns it. */
  readonly region: string
  /** The skills it builds on. */
  readonly prerequisites: readonly SkillId[]
}
