export type { MachineConfig } from '#types/definitions/config'
export type { MachineEndpoint } from '#types/definitions/endpoint'
export type {
  LinkName,
  MachineEvent,
  MachineEventStamp,
  MachineEventType,
  ProbeDefinition,
  StampedMachineEvent,
} from '#types/definitions/event'
export {
  FRR_BASE_DAEMONS,
  FRR_DAEMONS,
  type FrrDaemon,
  IPV4,
  IPV4_WITH_PREFIX,
  type LinkDefinition,
  type LinkEnd,
  type NetworkDefinition,
  PROBE_ID,
  ROUTER_NAME,
  type RouterDefinition,
} from '#types/definitions/network'
export {
  type ControlReply,
  VM_CMDLINE,
  VM_CONTROL_DONE,
  VM_CONTROL_READY,
  VM_CONTROL_TIMEOUT_MS,
  VM_FRR_USER,
  VM_HOSTNAME,
  VM_MEMORY_BYTES,
  VM_PROMPT,
  type VmEventUpdate,
  type VmManifest,
  type VmPhase,
  type VmSession,
  type VmStartOptions,
  type VmStatus,
} from '#types/definitions/vm'
