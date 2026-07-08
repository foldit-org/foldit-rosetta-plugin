#!/usr/bin/env bash
# Plugin-owned Rosetta build recipe, invoked by `cargo xtask setup-plugins
# rosetta`. Consumes the FOLDIT_* env contract xtask exports:
#   FOLDIT_WORKSPACE_ROOT   workspace root (absolute)
#   FOLDIT_MOLEX_DIR        <root>/crates/molex
#   FOLDIT_PROTO_DIR        <root>/crates/foldit-plugin-sdk/proto
#   FOLDIT_ABI_INCLUDE_DIR  <root>/crates/foldit-plugin-sdk/include
#   FOLDIT_TARGET_TRIPLE    host target triple
#   FOLDIT_NATIVE_BINARY_NAME  decorated shared-library filename to install
#   FOLDIT_PLUGIN_DIR       this plugin dir (absolute)
#   FOLDIT_LOCAL_DIR        <plugin_dir>/local (install target, gitignored)
#   FOLDIT_RECIPE_CLEAN     "1" to wipe the cmake build dir first
#
# TODO: a Windows build.ps1 equivalent is not yet ported.
set -euo pipefail

cmake_dir="$FOLDIT_PLUGIN_DIR/deps/rosetta-interactive/source/cmake_4"

# The Rosetta source (several GB to clone) is NOT a submodule -- a committed gitlink is
# pulled by any recursive clone and would force the source on everyone. Clone
# it on demand here, pinned to the commit the vendored binary was built from,
# only for this from-source build. Skipped if it is already present.
rosetta_src_dir="$FOLDIT_PLUGIN_DIR/deps/rosetta-interactive"
rosetta_src_url="https://github.com/RosettaCommons/main"
rosetta_src_branch="interactive/runner"
rosetta_src_ref="eb16693e1f8ae99f4ddfb70eaa7ec9e8c06e8333"
if [ ! -d "$rosetta_src_dir/source" ]; then
    echo "Cloning the Rosetta source on demand (several GB to clone) into $rosetta_src_dir ..."
    git clone --branch "$rosetta_src_branch" "$rosetta_src_url" "$rosetta_src_dir"
    git -C "$rosetta_src_dir" checkout "$rosetta_src_ref"
fi
if [ ! -d "$rosetta_src_dir/source" ]; then
    echo "Rosetta source still not found under deps/rosetta-interactive after clone." >&2
    exit 1
fi

# 1. Build the molex static lib first; the bridge dylib links against it for
#    assembly IO and Assembly walks.
echo "Building molex static library (release, c-api feature)..."
cargo build \
    --manifest-path "$FOLDIT_MOLEX_DIR/Cargo.toml" \
    --release \
    --features c-api

export MOLEX_INCLUDE_DIR="$FOLDIT_MOLEX_DIR/include"
export MOLEX_STATIC_LIB="$FOLDIT_MOLEX_DIR/target/release/libmolex.a"
export FOLDIT_PROTO_DIR
export FOLDIT_ABI_INCLUDE_DIR

# 2. Delegate the cmake configure + build (and the make.py / make_database.py
#    preprocessing) to rosetta-interactive's own build.sh.
cd "$FOLDIT_PLUGIN_DIR/deps/rosetta-interactive"
clean_args=()
if [ "${FOLDIT_RECIPE_CLEAN:-}" = "1" ]; then
    clean_args+=(--clean)
fi
echo "Running build.sh in $(pwd)..."
./build.sh "${clean_args[@]}"

# 3. Install the freshly built bridge dylib into local/ (shadows the vendored
#    prebuilt/ at runtime; gitignored). The runner owns the shared-library name
#    decoration and hands it in via FOLDIT_NATIVE_BINARY_NAME.
lib_name="$FOLDIT_NATIVE_BINARY_NAME"

lib_src="$cmake_dir/release/bin/$lib_name"
if [ ! -f "$lib_src" ]; then
    echo "Built library not found at $lib_src" >&2
    exit 1
fi
mkdir -p "$FOLDIT_LOCAL_DIR"
cp "$lib_src" "$FOLDIT_LOCAL_DIR/$lib_name"
echo "Copied $lib_src -> $FOLDIT_LOCAL_DIR/$lib_name"

# 4. Install the compact database (platform-independent) into assets/database.
db_src="$cmake_dir/cmp-database/database"
if [ -d "$db_src" ]; then
    db_dst="$FOLDIT_PLUGIN_DIR/assets/database"
    rm -rf "$db_dst"
    mkdir -p "$FOLDIT_PLUGIN_DIR/assets"
    cp -r "$db_src" "$db_dst"
    echo "Copied compact database -> $db_dst"
else
    echo "Warning: compact database not found at $db_src" >&2
    echo "  Run 'python3 make_database.py' in $cmake_dir first" >&2
fi

echo "Rosetta build complete."
