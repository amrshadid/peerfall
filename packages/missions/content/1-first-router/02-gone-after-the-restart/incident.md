# Incident: the label that was gone in the morning

**What was reported.** Last week someone gave router a's loopback interface, `lo`, a description, so that the next person would know what it is for. It showed in the configuration all week. Last night the router restarted. This morning the description is gone.

**What the network looks like.** One router, a. FRR is running on it.

**What is strange.** Nobody removed the description. The command was accepted, and it worked until the restart.

**Your job.** Put a description on `lo` again, with any words you like, and make sure it is still there after FRR restarts.

When you have your work checked, FRR on a is restarted first. What is judged is what the restart leaves.
