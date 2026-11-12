# Incident: router a answers nothing

**What was reported.** Router a was set up this morning. FRR, the routing software, is installed on it and has its configuration file. But nobody can open its console: `vtysh` gives up at once.

**What the network looks like.** One router, a, with no links yet. It is a Linux machine, and FRR is a set of programs on it.

**What is strange.** Nothing is broken. Every file is in place. FRR has simply never been started.

**Your job.** Find out what FRR is made of, start it the way FRR is started on a real router, and open its console.

When you think it runs, have your work checked. Nothing is timed, and you can start over as often as you like.
