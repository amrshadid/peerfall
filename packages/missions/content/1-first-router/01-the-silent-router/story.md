# The Silent Router

**Question:** Why does router a answer nothing?

## Scene

**What was reported.** Router a was set up this morning. FRR, the routing software, is installed on it and has its configuration file. But nobody can open its console: `vtysh` gives up at once.

**What the network looks like.** One router, a, with no links yet. It is a Linux machine, and FRR is a set of programs on it.

**What is strange.** Nothing is broken. Every file is in place. FRR has simply never been started.

## Build it

**Your job.** Find out what FRR is made of, start it the way FRR is started on a real router, and open its console.

When you think it runs, have your work checked. Nothing is timed, and you can start over as often as you like.

## Debrief

**Why vtysh had nothing to say.** `vtysh` is not FRR. It is a console: it connects to each FRR program that is running and passes your commands on. With none running it has nobody to talk to:

```
Exiting: failed to connect to any daemons.
```

**What FRR is made of.** FRR is several programs, called **daemons**, each with one job: **zebra** talks to the Linux kernel: it knows the interfaces and puts routes into the kernel's routing table. **mgmtd** takes the configuration and hands it to the daemons it manages. **staticd** holds the routes you write by hand. One more for each routing protocol the router speaks: `ospfd`, `bgpd`, `bfdd` and others.

The file `daemons` says which of the protocol daemons to start. On router a all of them are off:

```
# Which FRR daemons this router runs. zebra, mgmtd and staticd always start.
ospfd=no
ospf6d=no
isisd=no
bgpd=no
bfdd=no
```

**What keeps them running.** You did not start zebra, mgmtd and staticd yourself. FRR's script started one program, **watchfrr**, and gave it their names:

```
Starting watchfrr with command: '  /usr/lib/frr/watchfrr -N a -d   mgmtd zebra staticd'
```

watchfrr started the three, had the configuration file `frr.conf` loaded into them, and went on watching. That is why `show daemons` lists four names:

```
 mgmtd zebra staticd watchfrr
```

If a daemon dies, watchfrr starts it again. On the Machine, with staticd killed, `show daemons` answered ` mgmtd zebra watchfrr`, and about fifteen seconds later the list was whole again, with nobody typing anything.

A daemon you start by hand, with `/usr/lib/frr/zebra -d -N a`, runs and answers vtysh. But it is one daemon, and nothing watches it.

**Why the script needs the router's name.** In this game every router lives in the same Linux machine, so FRR keeps each router's files in a folder of its name (`/etc/frr/a`), and the script and the daemons are told that name (`start a`, `-N a`). On a router that is a machine of its own you leave the name out, and the files are in `/etc/frr`.

## Real world

On a Linux router that uses systemd, `systemctl start frr` runs the same script for you:

```
cat /etc/frr/daemons
sudo systemctl start frr
sudo /usr/lib/frr/frrinit.sh status
sudo vtysh
show daemons
show watchfrr
show running-config
```
