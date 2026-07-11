# rosetta plugin

The Rosetta backend — Foldit's core molecular-mechanics engine. This is the
plugin behind the everyday folding moves: energy minimization, sidechain
repacking, backbone rebuilding, and the score you are trying to improve.

Unlike the other native plugins (which are Rust), Rosetta is a **C++** plugin. It
wraps the Rosetta macromolecular modeling suite through a bridge that exports the
Foldit plugin vtable.

## Operations

The buttons in `plugin.toml` map to Rosetta actions:

| Button | Op | What it does |
| --- | --- | --- |
| Wiggle | `ActionGlobalMinimize` | Energy-minimize the whole structure (gradient descent on the score) |
| Wiggle Backbone / Sidechains | `ActionGlobalMinimize{Backbone,Sidechains}` | Minimize only those degrees of freedom |
| Shake | `ActionRepack` | Repack sidechain rotamers to lower energy |
| Shake Mutate | `ActionRepackDesign` | Repack with mutations allowed (sequence design) |
| Idealize / Idealize SS | `ActionIdealize{,SS}` | Reset peptide-bond geometry to ideal values |
| Rebuild | `ActionRebuild` | Rebuild backbone segments from the fragment library |

It also contributes UI panels (for example the Ramachandran map under
`ui/dist/rama_map.mjs`) and ships the Rosetta scoring database under
`assets/database/`.

## How it is built

This is the one plugin that is not a simple `cargo build`, so it is worth
understanding the moving parts:

- **The bridge source** is the `rosetta-interactive` tree. It is several GB and
  is **not** a committed submodule — the build recipe clones it on demand into
  `deps/rosetta-interactive` (gitignored), pinned to a fixed commit.
- **It statically links molex.** The build first compiles `libmolex.a` from
  `crates/molex` (with the `c-api` feature) and links it into the bridge, so the
  bridge and the host must agree on molex's binary wire format. A host on a newer
  molex wire version than the bridge was built against will be rejected at
  runtime — rebuild the bridge after a molex bump.
- **Committed prebuilts.** Because the from-source build is expensive, a
  prebuilt bridge binary is committed per platform under
  `prebuilt/<target-triple>/`. At runtime the loader prefers a freshly built
  binary in `local/` (gitignored) and falls back to `prebuilt/`.

Build (or rebuild) it from source with:

```bash
cargo xtask setup-plugins rosetta --clean
```

`--clean` wipes the cached CMake build directory. Use it after a molex or
toolchain change so the bridge actually relinks the new `libmolex.a` instead of
a stale one. The result installs into `local/`; promote it to `prebuilt/` by
copying it there once you have confirmed it works.

## Kind

`kind = "native"`; its `binary` basename `rosetta_interactive` resolves to the
platform library name (`librosetta_interactive.dylib` / `.so` /
`rosetta_interactive.dll`). The shim exports `foldit_plugin_vtable` from that
existing dylib, so there is no separate plugin binary.
