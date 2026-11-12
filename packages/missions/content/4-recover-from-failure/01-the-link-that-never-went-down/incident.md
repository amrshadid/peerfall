# Incident: traffic to c stopped for half a minute

**What users saw.** Traffic from router a to router c stopped for about 35 seconds, then came back by itself.

**What the network looked like.** Three routers, a, b and c, each connected to the other two. a normally sends traffic to c over their direct link.

**What is strange.** The direct link between a and c never went down. Both interfaces stayed up the whole time. Nothing was unplugged and no alarm fired. The link was up, and it was passing nothing.

**Your job.** Find out why the network took so long to notice, and make it recover in under two seconds the next time the same thing happens.

You can break the link yourself, as often as you like, and watch what each router does.
