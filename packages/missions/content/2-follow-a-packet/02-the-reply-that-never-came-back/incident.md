# Incident: a cannot reach c

**What was reported.** Router a cannot reach router c. Each of them reaches router b, which sits between them, without trouble.

**What the network looks like.** Three routers in a line: a, then b, then c. The link between a and b is the network `10.0.1.0/30`. The link between b and c is `10.0.2.0/30`. Every interface is up and has its address.

**What is strange.** Nothing is broken, and no cable is missing. A packet from a to c only has to pass through b.

**Your job.** Make a reach c's address, `10.0.2.2`. Find out what a is missing, fix it, and then find out why that alone is not enough.

You can send a probe from a to c at any time, and have your work checked whenever you like. Nothing is timed.
