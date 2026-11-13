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
2026/11/13 21:41:59.055 STATIC: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:00
2026/11/13 21:41:59.055 STATIC: [G6NKK-8C6DV] end_config: VTY:0xb79fe5a0, pending SET-CFG: 0
```

> **zebra:** Each line is a time, the daemon that wrote it, `STATIC:` for staticd, and a code for the message. staticd read the configuration in. Not a word about the bad line.
>
> **watchfrr:** Don't look at me. I don't write to that file: on this router I speak in your terminal. Restart FRR and listen: `/usr/lib/frr/frrinit.sh restart a`.

---

```
a:~# /usr/lib/frr/frrinit.sh restart a
watchfrr[571]: [NG1AJ-FP2TQ] Terminating on signal
Stopped watchfrr
Stopped zebra
Stopped mgmtd
Stopped staticd
Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'
watchfrr[699]: [T83RR-8SM5G] watchfrr 10.6.1 starting: vty@0
watchfrr[699]: [ZCJ3S-SPH5S] mgmtd state -> down : initial connection attempt failed
watchfrr[699]: [ZCJ3S-SPH5S] zebra state -> down : initial connection attempt failed
watchfrr[699]: [ZCJ3S-SPH5S] staticd state -> down : initial connection attempt failed
watchfrr[699]: [YFT0P-5Q5YX] Forked background command [pid 700]: /usr/lib/frr/watchfrr.sh restart all
watchfrr[699]: [VTVCM-Y2NW3] Configuration Read in Took: 00:00:00
watchfrr[699]: [ZJW5C-1EHNT] restart all process 700 exited with non-zero status 2
watchfrr[699]: [QDG3Y-BY5TN] staticd state -> up : connect succeeded
watchfrr[699]: [QDG3Y-BY5TN] zebra state -> up : connect succeeded
watchfrr[699]: [QDG3Y-BY5TN] mgmtd state -> up : connect succeeded
watchfrr[699]: [KWE5Q-QNGFC] all daemons up, doing startup-complete notify
Started watchfrr
```

> **watchfrr:** `restart all process` and a number, which changes every start, then `exited with non-zero status 2`. The command I ran to start everyone ended with status 2: something went wrong, and that number is all it told me.

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

> **zebra:** `2`, the same number watchfrr passed on. You could fix the file by hand, and mistype again. vtysh refuses a word it doesn't know the moment you type it, so a line it accepts will be read at the next start too. Type the line there, in `a-c`'s own mode. Open `vtysh`.

---

> **zebra:** `conf t`.

---

> **zebra:** `int a-c`.

---

> **zebra:** `description link to router c`.

---

> **zebra:** `end`.

---

> **zebra:** Save it: `write memory`.

---

> **zebra:** Leave with `exit`.

---

> **watchfrr:** Now restart me: `/usr/lib/frr/frrinit.sh restart a`.

---

## Watch it

> **zebra:** `write memory` saved your line, and the restart read the file. What happened to the misspelt one? Read the file: `cat /etc/frr/a/frr.conf`.
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

> **zebra:** Gone. The running configuration never held it, so the new file doesn't either. The old file waits in `frr.conf.sav`. Check the new one: `vtysh -C -f /etc/frr/a/frr.conf`.

---

```
a:~# vtysh -C -f /etc/frr/a/frr.conf
a:~# 
```

> **zebra:** Not a word. Now `echo $?`.

---

```
a:~# echo $?
0
```

> **watchfrr:** Clean. Ask for the descriptions: `vtysh -c "show interface description"`.

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

Then read the log it names: a `filename` with `sudo tail`, or syslog with `journalctl -u frr`.

A file FRR has never started from is worth checking before the next restart reads it.
