/** A command in the story's text: a span in backticks. */
export const CODE_SPAN = /`([^`]+)`/g

/**
 * Words that ask for the span right after them: "type `vtysh`", "Then `end`", "Leave vtysh with
 * `exit`". Case matters: a lowercase "and" or "then" joins clauses far more often than it asks.
 */
export const ASKING_WORD = /(?:^|[\s(])(?:type|Type|run|Run|open|Open|Now|Then|And|First|with|Try)\s*$/

/** A colon or comma that introduces the span: "Ask who answered: `show daemons`." */
export const INTRODUCING_MARK = /[:,]\s*$/

/**
 * What may follow a span a colon or comma introduced, for it to be the thing asked for: the end of
 * the sentence, or "then" ("Finish it: `link to router c`, then Enter."). "about `a-c`: `shutdown`,
 * the setting you met" names a word, it doesn't ask for one.
 */
export const ENDS_THE_ASK = /^(?:[.!]|\s*$|,\s*then\b)/

/** A sentence that starts with the span ("`conf t`.", "`show ip route` again."). */
export const SENTENCE_START = /(?:^|[.!?]\s+)$/
export const SENTENCE_OF_ITS_OWN = /^(?:[.,!]|\s+again\b)/

/**
 * A span that can be typed as a command: it starts with a lowercase word, a path or a `?`. Left
 * out: names and output (`UP`, `LINE`, `Unknown command`, `ttl=63`), numbers and addresses
 * (`10.0.1.2`, `fe80::`), options (`-d`) and prompts (`a#`, `a(config-if)#`, `b:~#`).
 */
export const LOOKS_TYPED = /^(?:[a-z][\w.-]*\??|\/\S*|\?)(?:\s|$)/
export const PROMPT_LIKE = /[#>]$/

/** A prompt in front of a finished command line, bash's (`a:~# `) or vtysh's (`a(config-if)# `). */
export const LEADING_PROMPT = /^(?:[a-z][a-z0-9]*:[~/]\S*# |[A-Za-z0-9][A-Za-z0-9._-]*(?:\([a-z0-9-]+\))?[#>] )/

/** A word FRR lets the player shorten (`sh`, `int`, `running-config`): letters and hyphens only. */
export const KEYWORD = /^[A-Za-z-]+$/

/** `"show daemons"` and `'show daemons'` are the same command to the shell. */
export const QUOTES = /["']/g

/** Where the story moves the terminal to another router: "Click c in the topology". */
export const ROUTER_CLICK = /\b[Cc]lick ([a-z][a-z0-9]*)\b/g
