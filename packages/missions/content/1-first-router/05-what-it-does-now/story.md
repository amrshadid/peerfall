# What It Does Now

**Question:** Where can you read everything FRR is doing right now?

## Scene

> **zebra:** Both of a's cables are lit, and the night is quiet for a moment. Use it. The next engineer on call won't know what a's cables are for, so label them and spare them the guessing. In The Router's Language you changed something in FRR. Tonight you find out where FRR keeps every change, and everything else it is doing.

## See it

> **zebra:** In vtysh, type `show running-config`.

---

```
a# show running-config
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

> **zebra:** This is the _running configuration_: every setting FRR's daemons hold right now, written in the same words you would type. `Building configuration...` is vtysh asking each daemon for its part and putting the answers together. `frr version` says which FRR wrote it, and `frr defaults traditional` which set of default values it starts from. `hostname a` is the router's name. The two `log` lines say where the daemons write their news and how finely they stamp the time. `service integrated-vtysh-config` keeps every daemon's settings in one file. Each `!` separates one block from the next.

> **zebra:** Nothing about interfaces, though a has three. A setting appears here only when it differs from its default. That is why `no shutdown` leaves no line behind: it puts the interface back to its default, and a block with nothing to say isn't printed. Now `show interface description`.

---

```
a# show interface description

	VRF default(0)

Interface       Status  Protocol  Description
a-b             up      up        
a-c             up      up        
lo              up      up        
```

> **zebra:** `VRF default` is a's one routing table, as in Nobody Answers. `Status up` means switched on, and `Protocol up` that the cable is alive: the `UP` and `LOWER_UP` of The Dark Cable. The last column, `Description`, is empty for every interface.

## Build it

> **zebra:** A _description_ is a label for an interface, for people only: FRR does nothing else with it. Type `configure terminal`, then `description link to router c`.

---

```
a# configure terminal
a(config)# description link to router c
% Unknown command: description link to router c
```

> **zebra:** Refused, and you know why from The Router's Language. Configure mode is for the router as a whole, and a description belongs to one interface. Go into it with `interface a-c`. Not sure what follows the word? Ask: `description ?`.

---

```
a(config)# interface a-c
a(config-if)# description 
  LINE  Characters describing this interface
a(config-if)# description 
```

> **zebra:** `LINE` means any words you like, spaces and all, up to the end of the line. Finish it: `link to router c`, then Enter, then `end`.

---

```
a(config-if)# description link to router c
a(config-if)# end
a# 
```

> **zebra:** Not a word back. When a change works, vtysh says nothing. An interface has one label: a second `description` replaces the first, and `no description` takes it away.

## Watch it

> **zebra:** You gave `a-c` a description. Is it in `/etc/frr/a/frr.conf`, the file FRR reads when it starts?
>
> - yes, FRR wrote it there
> - [x] no, the file is unchanged
> - only once you typed `end`

---

> **zebra:** Look at both. First `show running-config`.

---

```
a# show running-config
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
interface a-c
 description link to router c
exit
!
end
```

> **zebra:** Your label, in a block of its own that ends with `exit`. Now leave vtysh with `exit` and type `cat /etc/frr/a/frr.conf`.

---

```
a:~# cat /etc/frr/a/frr.conf
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
```

> **zebra:** The file didn't move. The running configuration lives in the daemons' memory and changes the moment you type. The file changes only when something writes it, and so far nothing has. Linux never hears of the label at all: `ip link show a-c` prints none.

## Debrief

> **zebra:** The running configuration is what FRR does now, and every change you type lands in it at once. The file didn't change. What happens to your label when FRR restarts? In Gone After the Restart.

## Real world

On a router of your own, label an interface the same way and compare:

```
sudo vtysh
show running-config
configure terminal
interface eth0
description uplink to the core
end
show interface description
exit
cat /etc/frr/frr.conf
```
