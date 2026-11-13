# The Skipped Line

**Question:** When FRR starts from a file with a mistake in it, where does it say so?

## Scene

> **watchfrr:** Someone labelled a's cable to c last night. Not in vtysh: they typed the line straight into the saved file, restarted FRR and went home. FRR started fine. I started it myself.
>
> **zebra:** And the label isn't there. A line went into the file and never came out the other side. Let's find out where it went.

## See it

> **zebra:** Start with what FRR is doing now: `vtysh -c "show running-config"`.

---

```
a:~# vtysh -c "show running-config"
Building configuration...

Current configuration:
!
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
end
```

> **zebra:** No `interface a-c` at all. Now the saved file: `cat /etc/frr/a/frr.conf`.

---

```
a:~# cat /etc/frr/a/frr.conf
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
interface a-c
 descripton link to router c
!
```

> **zebra:** There it is, misspelt: `descripton`. FRR didn't know that word, so it skipped the line and applied the rest. Did anyone say so? Every daemon writes its news to _the log_, a file. The `log file` line above names it, and `vtysh -c "show logging"` would tell you the same for zebra, mgmtd and staticd: `filename /var/log/frr/a.log`. Read its last lines: `tail /var/log/frr/a.log`.

---

```
a:~# tail /var/log/frr/a.log
2026/11/13 20:25:46.760 STATIC: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:01
2026/11/13 20:25:46.762 STATIC: [G6NKK-8C6DV] end_config: VTY:0xb7a2a5b0, pending SET-CFG: 0
```

> **zebra:** Each line is a time, the daemon that wrote it, `STATIC:` for staticd, and a code for the message. staticd read the configuration in. Not a word about the bad line.
>
> **watchfrr:** Don't look at me. I don't write to that file: on this router I speak in your terminal. Restart FRR and listen: `/usr/lib/frr/frrinit.sh restart a`.

---

```
a:~# /usr/lib/frr/frrinit.sh restart a
watchfrr[569]: [NG1AJ-FP2TQ] Terminating on signal
Stopped watchfrr
Stopped staticd
Stopped zebra
Stopped mgmtd
Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'
watchfrr[685]: [T83RR-8SM5G] watchfrr 10.6.1 starting: vty@0
watchfrr[685]: [ZCJ3S-SPH5S] mgmtd state -> down : initial connection attempt failed
watchfrr[685]: [ZCJ3S-SPH5S] zebra state -> down : initial connection attempt failed
watchfrr[685]: [ZCJ3S-SPH5S] staticd state -> down : initial connection attempt failed
watchfrr[685]: [YFT0P-5Q5YX] Forked background command [pid 686]: /usr/lib/frr/watchfrr.sh restart all
watchfrr[685]: [QDG3Y-BY5TN] zebra state -> up : connect succeeded
watchfrr[685]: [YFT0P-5Q5YX] Forked background command [pid 701]: /usr/lib/frr/watchfrr.sh restart staticd
watchfrr[685]: [QDG3Y-BY5TN] mgmtd state -> up : connect succeeded
watchfrr[685]: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:00
watchfrr[685]: [ZJW5C-1EHNT] restart all process 686 exited with non-zero status 2
watchfrr[685]: [ZJW5C-1EHNT] restart staticd process 701 exited with non-zero status 2
watchfrr[685]: [QDG3Y-BY5TN] staticd state -> up : connect succeeded
watchfrr[685]: [KWE5Q-QNGFC] all daemons up, doing startup-complete notify
Started watchfrr
```

> **watchfrr:** `restart all process 686 exited with non-zero status 2`. The command I ran to start everyone ended with status 2: something went wrong, and that number is all it told me.

## Build it

> **zebra:** vtysh can read a file the way FRR reads it at start, apply nothing, and name every line it refuses. `-C` means check only, `-f` names the file: `vtysh -C -f /etc/frr/a/frr.conf`.

---

```
a:~# vtysh -C -f /etc/frr/a/frr.conf
line 7: % Unknown command[21]:  descripton link to router c
Configuration file[/etc/frr/a/frr.conf] processing failure: 2
```

> **zebra:** Line 7, refused with `Unknown command`, as when you mistype in vtysh. `[21]` is FRR's number for interface mode, where the line was read. Every command also ends with a number, its _exit status_: `0` means no error. `echo $?` prints the last one.

---

```
a:~# echo $?
2
```

> **zebra:** `2`, the same number watchfrr passed on. You could fix the file by hand, and mistype again. vtysh is safer: it refuses a word it doesn't know the moment you type it, as you saw in The Router's Language, so a line it accepts will be read at the next start too. Type the description properly, in `a-c`'s own mode, and save it with `write memory`.

---

## Watch it

> **zebra:** `write memory` saved your line. What happened to the misspelt one? Read the file: `cat /etc/frr/a/frr.conf`.
>
> - it is still there, beside yours
> - [x] it is gone: the file was written from the running configuration
> - vtysh corrected its spelling

---

```
a:~# cat /etc/frr/a/frr.conf
frr version 10.6.1
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
service integrated-vtysh-config
!
interface a-c
 description link to router c
exit
!
```

> **zebra:** Gone. The running configuration never held it, so the new file doesn't either. The old file waits in `frr.conf.sav`. Check the new one with `vtysh -C -f /etc/frr/a/frr.conf`, then `echo $?`.

---

```
a:~# vtysh -C -f /etc/frr/a/frr.conf
a:~# echo $?
0
```

> **watchfrr:** Clean, and not a word. Restart me, then ask for the descriptions with `vtysh -c "show interface description"`.

---

```
a:~# vtysh -c "show interface description"

	VRF default(0)

Interface       Status  Protocol  Description
a-b             up      up        
a-c             up      up        link to router c
lo              up      up        
```

> **zebra:** `link to router c`, read from the file at the start and applied. Nothing skipped this time.

## Debrief

> **zebra:** FRR skips a line it can't read, applies the rest, and says little: the log stays quiet, and watchfrr passes on a number. So check a file before you trust it. You can now run a router. In A Router from Nothing, you bring one up alone.

## Real world

On a router of your own, the saved file is `/etc/frr/frr.conf`:

```
sudo vtysh -C -f /etc/frr/frr.conf; echo $?   # check the file, apply nothing
sudo vtysh -c "show logging"                  # where each daemon writes its log
```

Then `tail` the file that `show logging` names.

A file FRR has never started from is worth checking before the next restart reads it.
