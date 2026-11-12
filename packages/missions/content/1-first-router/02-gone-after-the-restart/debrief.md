# Debrief: gone after the restart

## Two configurations

A router has two configurations, and they are not the same thing.

The **running configuration** is what FRR is doing now. It lives in the memory of the daemons. `show running-config` prints it, and what you enter after `configure terminal` changes it at once:

```
interface lo
 description loopback of router a
exit
```

The **saved configuration** is a file, `frr.conf`. FRR reads it once, when it starts. After you added the description, the file still had no `interface lo` in it:

```
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
```

## Why the description disappeared

A restart stops every daemon, and what they held in memory goes with them. When FRR starts again it knows only what `frr.conf` says. The description was in the running configuration and never in the file, so the restart took it away. Nobody removed it.

## What write memory does

`write memory` copies the running configuration into the file:

```
Building Configuration...
Integrated configuration saved to /etc/frr/a/frr.conf
[OK]
```

From then on the file has the same `interface lo` block, and every start brings the description back. FRR keeps the file as it was before in `frr.conf.sav`, next to the new one.

The habit to take from this: after a change that should last, save it, and read the file if you want to be sure.

## Try it on real FRR

The same commands work on any FRR router. There the file is `/etc/frr/frr.conf`, and with systemd the restart is `systemctl restart frr`:

```
vtysh
show running-config
configure terminal
 interface lo
  description loopback of router a
end
write memory
exit
cat /etc/frr/frr.conf
sudo systemctl restart frr
vtysh -c 'show running-config'
```
