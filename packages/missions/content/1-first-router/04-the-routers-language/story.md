# The Router's Language

**Question:** How do you ask FRR for help, and where do you have to be to change something?

## Scene

> **zebra:** Remember the dark cable? FRR on router a was restarted, and the cable to c is dark again. You switched it on from Linux last time, and the restart put it straight back out. Something on a keeps doing that, and that something is FRR. Ask FRR why. You don't know its words yet, and you don't need to: vtysh tells you.

## See it

> **zebra:** Type `vtysh`.

---

> **zebra:** The prompt is `a#`: vtysh waits for you. Type a single `?`, with no Enter, then Continue.

---

```
a# 
  add               Add registration
  clear             Reset functions
  configure         Configuration from vty interface
  copy              Copy from one file to another
  debug             Debugging functions
  disable           Turn off privileged mode command
  enable            Turn on privileged mode command
  end               End current mode and change to enable mode
  exit              Exit current mode and down to previous mode
  find              Find CLI command matching a regular expression
  graceful-restart  Graceful Restart commands
  list              Print command list
  mgmt              Management Daemon (MGMTD) information
  mtrace            Multicast trace route to multicast source
  no                Negate a command or set its defaults
  output            Direct vtysh output to file
  ping              Send echo messages
  quit              Exit current mode and down to previous mode
  rpki              Control rpki specific settings
  send              Send message
  show              Show running system information
  terminal          Set terminal line parameters
  test              Test code
  traceroute        Trace route to destination
  watchfrr          Watchfrr Specific sub-command
  write             Write running configuration to memory, network, or terminal
a# 
```

> **zebra:** Every command vtysh knows at `a#`, each with a line of help. `?` runs nothing: it shows what could come next and leaves your line as it was. It works after a word too. Type `show i?`, then Continue.

---

```
a# show i
  interface  Interface status and configuration
  ip         IP information
  ipv6       IPv6 Information
  isis       IS-IS routing protocol
a# show i
```

> **zebra:** Four words start with `i`. Press Tab twice and vtysh lists the same four, since one letter can't choose. Erase the line, type `sh` and press Tab once: it becomes `show`. You don't even have to finish a word, as long as only one command starts that way. Erase again, and type `sh int br`.

---

```
a# sh int br
Interface       Status  VRF             Addresses
---------       ------  ---             ---------
a-b             up      default         10.0.1.1/30
                                        fe80::7cb9:e5ff:fe42:593b/64
a-c             down    default         10.0.2.1/30
lo              up      default         10.255.0.1/32

```

> **zebra:** That is `show interface brief`, said short, and `a-c` is `down`. A misspelt word is refused: `show interfaces brief` gets `% Unknown command`. A line that stops too early, such as `s` alone, gets `% Command incomplete`. Now ask about the one interface: `show interface a-c`.

---

```
a# show interface a-c
Interface a-c is down
  Link ups:       0    last: (never)
  Link downs:     1    last: 2026/11/13 20:25:38.73
  vrf: default
  index 3 metric 0 mtu 1500 speed 10000 txqlen 1000
  flags: <BROADCAST,MULTICAST>
  MPLS  Not specified by CLI
  Multicast config is Not specified by CLI
  Shutdown config is Enabled by CLI
  Type: Ethernet
  HWaddr: 52:c0:e9:97:59:ec
  inet 10.0.2.1/30
  Interface Type VETH
  Interface Slave Type None
  protodown: off 
  Parent interface: a-b
```

> **zebra:** Read `Shutdown config is Enabled by CLI`. _CLI_ means the command line, vtysh's language. FRR's configuration for `a-c` says `shutdown`, so each time FRR starts, I switch that interface off. Ignore `Parent interface: a-b`: a known quirk of these virtual cables, wrong here.

## Build it

> **zebra:** `a#` is for looking. A change is made in a _mode_, and the prompt tells you which one you are in. Type `configure terminal`.

---

```
a# configure terminal
a(config)# 
```

> **zebra:** `a(config)#` is configure mode, for the router as a whole. One interface's settings are changed inside that interface: type `interface a-c`.

---

```
a(config)# interface a-c
a(config-if)# 
```

> **zebra:** `a(config-if)#` is interface mode, for `a-c` alone. Type `?`, then Continue.

---

```
a(config-if)# 
  babel        Babel interface commands
  bandwidth    Set bandwidth informational parameter
  clear        Clear the terminal
  debug        Debugging functions
  delay        Specify interface throughput delay
  description  Interface specific description
  eigrp        EIGRP information
  end          End current mode and change to enable mode
  evpn         EVPN
  exit         Exit current mode and down to previous mode
  find         Find CLI command matching a regular expression
  ip           IP information
  ipv6         IPv6 information
  isis         IS-IS routing protocol
  link-detect  Enable link detection on interface
  link-params  Configure interface link parameters
  list         Print command list
  mpls         MPLS information
  multicast    Set multicast flag to interface
  no           Negate a command or set its defaults
  openfabric   OpenFabric routing protocol
  ospf         OSPF interface commands
  output       Direct vtysh output to file
  pbr-policy   Policy to use
  quit         Exit current mode and down to previous mode
  shutdown     Shutdown the selected interface
  tunnel       NHRP/GRE integration
  vrrp         Virtual Router Redundancy Protocol
a(config-if)# 
```

> **zebra:** The words an interface can be given: a `description`, settings for later stages such as `ospf`, and `shutdown`. `no` before a setting undoes it. Type `no shutdown`.

---

```
a(config-if)# no shutdown
a(config-if)# 
```

> **zebra:** Look without leaving: `do show interface brief`. `do` runs a command of `a#` from any mode.

---

```
a(config-if)# do show interface brief
Interface       Status  VRF             Addresses
---------       ------  ---             ---------
a-b             up      default         10.0.1.1/30
                                        fe80::7cb9:e5ff:fe42:593b/64
a-c             up      default         10.0.2.1/30
                                        fe80::50c0:e9ff:fe97:59ec/64
lo              up      default         10.255.0.1/32

```

> **zebra:** `a-c` is `up`. To go back, `exit` steps out one mode at a time, and `end` goes straight to `a#`.

## Watch it

> **zebra:** Type `end`.

---

> **zebra:** Back at `a#`, you type `no shutdown` again. What does vtysh do?
>
> - switches `a-c` on a second time
> - [x] refuses it
> - asks which interface you mean

---

```
a# no shutdown
% Unknown command: no shutdown
```

> **zebra:** Refused: at `a#`, `shutdown` isn't a word at all. Each mode has its own words. Leave vtysh with `exit`.

---

> **zebra:** Back at the shell. Ask Linux: `ip -br link`.

---

```
a:~# ip -br link
lo               UNKNOWN        00:00:00:00:00:00 <LOOPBACK,UP,LOWER_UP> 
a-b@if2          UP             7e:b9:e5:42:59:3b <BROADCAST,MULTICAST,UP,LOWER_UP> 
a-c@if2          UP             52:c0:e9:97:59:ec <BROADCAST,MULTICAST,UP,LOWER_UP> 
```

> **zebra:** `UP` for Linux too. Ping c: `ping -c 3 10.0.2.2`.

---

```
a:~# ping -c 3 10.0.2.2
PING 10.0.2.2 (10.0.2.2) 56(84) bytes of data.
64 bytes from 10.0.2.2: icmp_seq=1 ttl=64 time=1.09 ms
64 bytes from 10.0.2.2: icmp_seq=2 ttl=64 time=0.488 ms
64 bytes from 10.0.2.2: icmp_seq=3 ttl=64 time=0.449 ms

--- 10.0.2.2 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2007ms
rtt min/avg/max/mdev = 0.449/0.677/1.094/0.295 ms
```

> **zebra:** c answers. Now read the file FRR starts from: `cat /etc/frr/a/frr.conf`.

---

```
a:~# cat /etc/frr/a/frr.conf
frr defaults traditional
hostname a
log file /var/log/frr/a.log
log timestamp precision 3
!
interface a-c
 shutdown
!
```

> **zebra:** It still says `shutdown`. You changed what FRR is doing, not the file it starts from. This stage comes back to that.

## Debrief

> **zebra:** vtysh tells you its words when you ask, and a change is made where it belongs: in the interface's own mode. FRR is running with your change now. Where can you read everything it is doing? In What It Does Now.

## Real world

On a router of your own, the interface has its own name, such as `eth0`:

```
sudo vtysh
?                       # every command here, with help
show interface brief    # or: sh int br
configure terminal
interface eth0
no shutdown
end
exit
```
