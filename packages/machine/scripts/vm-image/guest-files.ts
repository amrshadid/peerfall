import {
  VM_BASHRC,
  VM_CONTROL_DONE,
  VM_CONTROL_READY,
  VM_EVENT_TTY,
  VM_FRR_USER,
  VM_HOSTNAME,
  VM_ROUTER_FILE,
  VM_SHELL,
  VM_SHELL_PID_FILE,
} from '#types/definitions/vm'
import type { ArchiveEntry } from '#vm-image/archive'

// The 9p root is v86's "host9p" share; its modules come from this initramfs. cache=mmap, not
// loose: loose keeps a file's old pages, so a configuration the editor writes would never reach FRR.
export const INIT = `#!/bin/busybox sh
/bin/busybox --install -s /bin
mount -t proc proc /proc
mount -t sysfs sys /sys
mount -t devtmpfs dev /dev
for m in netfs 9pnet 9pnet_virtio 9p; do insmod /lib/$m.ko; done
mkdir -p /newroot
until mount -t 9p -o trans=virtio,version=9p2000.L,cache=mmap,msize=512000 host9p /newroot; do
  echo "Mounting the root failed. Type 'exit' to try again."
  sh
done
mount --move /dev /newroot/dev
umount /proc /sys
exec switch_root /newroot /sbin/init
`

// The terminal's shell starts inside the selected router's namespace, so ip, ping and the FRR
// daemons' sockets are that router's. init starts the next one when this one is killed, which is
// how the terminal moves to another router. Every exec keeps the pid, so the pid file names bash.
export const SHELL = `#!/bin/sh
echo $$ > ${VM_SHELL_PID_FILE}
export TERM=xterm-256color HOME=/root
cd /root
router=$(cat ${VM_ROUTER_FILE} 2>/dev/null)
[ -n "$router" ] && exec ip netns exec "$router" env PF_ROUTER="$router" bash --rcfile ${VM_BASHRC} -i
exec bash --rcfile ${VM_BASHRC} -i
`

// On a real router plain vtysh reaches its daemons. Here every router's daemons share one
// filesystem and are told apart by FRR's -N <name>, so vtysh gets the selected router's name.
export const BASHRC = `if [ -n "$PF_ROUTER" ]; then
  PS1="$PF_ROUTER:\\w# "
  vtysh() { command vtysh -N "$PF_ROUTER" "$@"; }
else
  PS1='${VM_HOSTNAME}:\\w# '
fi
`

// busybox init: a login-free root shell on the player's terminal (COM1), root's control channel on COM3.
export const INITTAB = `::sysinit:/etc/pf-rc
ttyS0::respawn:/sbin/getty -n -l ${VM_SHELL} 115200 ttyS0 vt100
ttyS2::respawn:/usr/sbin/pf-control
::ctrlaltdel:/sbin/reboot
::shutdown:/bin/umount -a -r
`

// veth joins the routers' namespaces and sch_netem drops a link's packets while it stays up: no
// hotplug helper loads them on demand. FRR's daemons run as frr and keep their sockets, state and
// logs in these folders, one sub-folder per router (their -N option).
export const RC = `#!/bin/sh
mount -t proc proc /proc 2>/dev/null
mount -t sysfs sys /sys 2>/dev/null
mkdir -p /dev/pts /dev/shm
mount -t devpts devpts /dev/pts
mount -t tmpfs tmpfs /tmp
mount -t tmpfs tmpfs /run
hostname ${VM_HOSTNAME}
ip link set lo up
ln -s /proc/self/fd /dev/fd
modprobe -q veth
modprobe -q sch_netem
mkdir -p /run/frr /var/log/frr /var/lib/frr
chown ${VM_FRR_USER.name}:${VM_FRR_USER.name} /run/frr /var/log/frr /var/lib/frr /etc/frr
`

// The host's root channel for a mission's setup: a command line in, its status out. init starts
// it, so it is no descendant of the player's shell.
// bash, for EPOCHREALTIME: a fault's moment is stamped by the shell that injects it, without
// starting a process. The event port (COM2) is raw too, so lines arrive as they were written.
export const CONTROL = `#!/bin/bash
stty -F ${VM_EVENT_TTY} raw -echo
stty -F /dev/ttyS2 raw -echo
exec </dev/ttyS2 >/dev/ttyS2 2>&1
echo ${VM_CONTROL_READY}
while IFS= read -r line; do
  eval "$line"
  echo "${VM_CONTROL_DONE} $?"
done
`

/** The frr user in /etc/passwd and /etc/group: the package's install script, which this build doesn't run. */
export const FRR_PASSWD = `${VM_FRR_USER.name}:x:${VM_FRR_USER.uid}:${VM_FRR_USER.gid}:${VM_FRR_USER.name}:/var/run/frr:/sbin/nologin\n`
export const FRR_GROUP = `${VM_FRR_USER.name}:x:${VM_FRR_USER.gid}:${VM_FRR_USER.name}\n${VM_FRR_USER.vtyGroup}:x:${VM_FRR_USER.vtyGid}:${VM_FRR_USER.name}\n`

export function guestFile(path: string, content: string, mode = 0o644): ArchiveEntry {
  return { path, kind: 'file', mode, uid: 0, gid: 0, mtime: 0, link: '', data: new TextEncoder().encode(content) }
}
