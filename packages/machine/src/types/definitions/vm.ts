/** What the VM emulates: enough for nine FRR daemons (about 45 MB) with room for more routers. */
export const VM_MEMORY_BYTES = 256 * 1024 * 1024

/** `quiet` keeps the kernel's boot log off the player's terminal. */
export const VM_CMDLINE = 'console=ttyS0 rw tsc=reliable mitigations=off random.trust_cpu=on quiet'

export const VM_HOSTNAME = 'peerfall'

/** Root's control channel prints this once it is listening. */
export const VM_CONTROL_READY = '__PF_READY__'

/** Root's control channel prints this and the exit status after each line it ran. */
export const VM_CONTROL_DONE = '__PF_DONE__'

/** FRR's unprivileged user and its groups, as the `frr` package's install script creates them. */
export const VM_FRR_USER = { name: 'frr', uid: 100, gid: 101, vtyGroup: 'frrvty', vtyGid: 102 } as const

/** What `manifest.json` says about the built image. */
export interface VmManifest {
  /** Changes whenever the image or its command line does, so a cached image never goes stale. */
  readonly version: string
  readonly kernelRelease: string
  readonly frrVersion: string
}
