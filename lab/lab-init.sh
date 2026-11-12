#!/bin/sh
# What the VM's boot script (/etc/pf-rc) prepares for FRR, then nothing: the network is built by
# the same lines the game runs, sent with `docker compose exec`. veth and sch_netem come from the
# host's kernel, which loads them on first use.
set -e
mkdir -p /run/frr /var/log/frr /var/lib/frr
chown frr:frr /run/frr /var/log/frr /var/lib/frr /etc/frr
exec tail -f /dev/null
