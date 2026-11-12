import { read, run, start } from '#lab/container'
import { FAULT_ENDS } from '#lab/network'

const PROBE_FILE = '/tmp/probe.txt'
const MONITOR_FILE = '/tmp/monitor.txt'
const [near] = FAULT_ENDS

/** The probe the game uses: twenty pings a second from one end's loopback to the other's, each reply stamped. */
export const PROBE_LINE = `ip netns exec ${near.router} ping -D -i 0.05 -I ${near.loopback} ${near.peerLoopback}`
/** Every change to the kernel's routing table in the probing router, stamped. */
export const MONITOR_LINE = `ip -ts -n ${near.router} monitor route`

export function startProbe(): void {
  start(`exec ${PROBE_LINE} > ${PROBE_FILE} 2>&1`)
  start(`exec ${MONITOR_LINE} > ${MONITOR_FILE} 2>&1`)
}

/** Stops the probe and the monitor and returns what each wrote. ping flushes its replies when interrupted. */
export function stopProbe(): { probe: string; monitor: string } {
  run('pkill -INT -x ping; pkill -f "monitor[ ]route"; sleep 0.3')
  return { probe: read(`cat ${PROBE_FILE}`), monitor: read(`cat ${MONITOR_FILE}`) }
}

export interface Outage {
  /** The longest time between two replies, in seconds: with a reply every 0.05 s, how long traffic was lost. */
  readonly seconds: number
  /** The last reply before that gap and the first after it, in seconds since the epoch. */
  readonly lastReply: number
  readonly firstReply: number
  /** Probes sent in the gap that were never answered. */
  readonly lost: number
  readonly replies: number
}

const REPLY = /^\[(\d+\.\d+)\] \d+ bytes from .* icmp_seq=(\d+) /

export function longestGap(probe: string): Outage {
  const replies = probe
    .split('\n')
    .map((line) => REPLY.exec(line))
    .filter((match) => match !== null)
    .map((match) => ({ at: Number(match[1]), seq: Number(match[2]) }))
  let outage: Outage = { seconds: 0, lastReply: 0, firstReply: 0, lost: 0, replies: replies.length }
  replies.forEach((reply, index) => {
    const before = replies[index - 1]
    if (before && reply.at - before.at > outage.seconds) {
      outage = {
        seconds: Number((reply.at - before.at).toFixed(3)),
        lastReply: before.at,
        firstReply: reply.at,
        lost: reply.seq - before.seq - 1,
        replies: replies.length,
      }
    }
  })
  return outage
}
