# Changelog

All notable changes to Peerfall are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/). 0.1.0 will be one complete, replayable
mission, The Link That Never Went Down.

## [Unreleased]

### Added

- The repository: the workspace, the `core` and `theme` packages, and empty `machine`,
  `game`, `missions` and `web` packages that pass `pnpm verify`.
- `pnpm vm:image` builds the Linux image the game will boot: Alpine for 32-bit x86 with
  FRR 10.6.1, from packages pinned by version and checksum.
