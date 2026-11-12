# Incident: a new cable that carries nothing

**What was reported.** A cable was plugged in between router a and router b this morning. Both ends show the interface up. Nothing gets across: a cannot reach b, and b cannot reach a.

**What the network looks like.** Two routers and one link. On a the interface is called `a-b`, on b it is `b-a`.

**What is strange.** The link is fine. Neither interface has an IPv4 address yet, so neither router has anywhere to send a packet.

**Your job.** Give each end its address, in FRR: `10.0.1.1/30` on a and `10.0.1.2/30` on b. Then watch what each router's routing table gains, in FRR and in Linux, and reach b from a.

Have your work checked whenever you like. Nothing is timed.
