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

$ErrorActionPreference = "Stop"

$cmakeDir = Join-Path $env:FOLDIT_PLUGIN_DIR "deps\rosetta-interactive\source\cmake_4"

# The Rosetta source (several GB to clone) is NOT a submodule -- a committed
# gitlink is pulled by any recursive clone and would force the source on
# everyone. Clone it on demand here, pinned to the commit the vendored binary
# was built from, only for this from-source build. Skipped if already present.
$rosettaSrcDir = Join-Path $env:FOLDIT_PLUGIN_DIR "deps\rosetta-interactive"
$rosettaSrcUrl = "https://github.com/RosettaCommons/main"
$rosettaSrcBranch = "interactive/runner"
$rosettaSrcRef = "eb16693e1f8ae99f4ddfb70eaa7ec9e8c06e8333"

$rosettaSourceDir = Join-Path $rosettaSrcDir "source"
if (-not (Test-Path $rosettaSourceDir)) {
    Write-Host "Cloning the Rosetta source on demand (several GB to clone) into $rosettaSrcDir ..."
    & git clone --branch $rosettaSrcBranch $rosettaSrcUrl $rosettaSrcDir
    if ($LASTEXITCODE -ne 0) { exit 1 }
    & git -C $rosettaSrcDir checkout $rosettaSrcRef
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
if (-not (Test-Path $rosettaSourceDir)) {
    Write-Error "Rosetta source still not found under deps/rosetta-interactive after clone."
    exit 1
}

# 1. Build the molex static lib first; the bridge dylib links against it for
#    assembly IO and Assembly walks.
Write-Host "Building molex static library (release, c-api feature)..."
$molexManifest = Join-Path $env:FOLDIT_MOLEX_DIR "Cargo.toml"
# Build for the GNU target so the static archive is compatible with Zig's
# linker. The default MSVC target produces COFF objects that reference MSVC
# CRT symbols (_fltused, type_info vftable) which Zig does not provide.
$gnuTarget = "x86_64-pc-windows-gnu"
& cargo build --manifest-path $molexManifest --release --features c-api --target $gnuTarget
if ($LASTEXITCODE -ne 0) { exit 1 }

$env:MOLEX_INCLUDE_DIR = Join-Path $env:FOLDIT_MOLEX_DIR "include"
$env:MOLEX_STATIC_LIB = Join-Path $env:FOLDIT_MOLEX_DIR "target\$gnuTarget\release\libmolex.a"
# FOLDIT_PROTO_DIR and FOLDIT_ABI_INCLUDE_DIR are already in the environment
# from the xtask; just ensure they propagate to the child build.ps1.

# 2. Delegate the cmake configure + build (and the make.py / make_database.py
#    preprocessing) to rosetta-interactive's own build.ps1.
$cleanArgs = @()
if ($env:FOLDIT_RECIPE_CLEAN -eq "1") {
    $cleanArgs += "-Clean"
}
Write-Host "Running build.ps1 in $rosettaSrcDir..."
& powershell -ExecutionPolicy Bypass -NoProfile -File (Join-Path $rosettaSrcDir "build.ps1") @cleanArgs
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. Install the freshly built bridge dylib into local/ (shadows the vendored
#    prebuilt/ at runtime; gitignored). The runner owns the shared-library name
#    decoration and hands it in via FOLDIT_NATIVE_BINARY_NAME.
$libName = $env:FOLDIT_NATIVE_BINARY_NAME
$libSrc = Join-Path $cmakeDir "release\bin\$libName"
if (-not (Test-Path $libSrc)) {
    Write-Error "Built library not found at $libSrc"
    exit 1
}
if (-not (Test-Path $env:FOLDIT_LOCAL_DIR)) {
    New-Item -ItemType Directory -Path $env:FOLDIT_LOCAL_DIR | Out-Null
}
Copy-Item $libSrc (Join-Path $env:FOLDIT_LOCAL_DIR $libName)
Write-Host "Copied $libSrc -> $(Join-Path $env:FOLDIT_LOCAL_DIR $libName)"

# 4. Install the compact database (platform-independent) into assets/database.
$dbSrc = Join-Path $cmakeDir "cmp-database\database"
if (Test-Path $dbSrc) {
    $dbDst = Join-Path $env:FOLDIT_PLUGIN_DIR "assets\database"
    if (Test-Path $dbDst) {
        Remove-Item -Path $dbDst -Recurse -Force
    }
    $assetsDir = Join-Path $env:FOLDIT_PLUGIN_DIR "assets"
    if (-not (Test-Path $assetsDir)) {
        New-Item -ItemType Directory -Path $assetsDir | Out-Null
    }
    Copy-Item -Path $dbSrc -Destination $dbDst -Recurse
    Write-Host "Copied compact database -> $dbDst"
} else {
    Write-Warning "Compact database not found at $dbSrc"
    Write-Warning "  Run 'python make_database.py' in $cmakeDir first"
}

Write-Host "Rosetta build complete."
