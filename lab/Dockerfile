# The lab's Linux host: the same Alpine release and the same packages as the game's VM image
# (packages/machine/scripts/vm-image/vm-image.lock.json), on the kernel of whatever runs Docker.
# The tag is pinned by the digest of its multi-platform index.
FROM alpine:3.24@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf

# Alpine keeps one version of a package per release branch: when one of these is replaced upstream
# the build fails here, and the lock and these pins are updated together. `node lab/lab.ts up`
# compares every installed package with the lock.
RUN apk add --no-cache \
    frr=10.6.1-r0 \
    bash=5.3.9-r1 \
    iproute2=7.0.0-r0 \
    iproute2-tc=7.0.0-r0 \
    iputils-ping=20250605-r2

COPY --chmod=755 lab-init.sh /usr/local/bin/lab-init

ENTRYPOINT ["/usr/local/bin/lab-init"]
