# Web-GSF-Player
Work in progress. Will play GSF files in the browser.

The `demo` folder contains a [demo page](https://thysbelon.github.io/Web-GSF-Player). It is not needed for compiling.

@jprjr created lazygsf and gsf2wav.

The mgba CMakeLists.txt threads modification was copied from [@jprjr's fork](https://github.com/mgba-emu/mgba/pull/2065),    
and the Emscripten modifications were copied from [mgba's feature/wasm branch](https://github.com/endrift/mgba/blob/feature/wasm/CMakeLists.txt).   
The modifications to mgba's CMakeLists.txt allow libmgba.a to be compiled with Emscripten, threads disabled and MINIMAL_CORE set to 2.

The lazygsf CMakeLists.txt modifications call mgba's CMakeLists.txt instead of manually including sources; the goal of this modification was to make it easier to update mgba to the latest version.

Right now, the mgba 0.10.3 release build is being used.

## How to Build
1. Run `get-gsf2wav.bash`. This will download gsf2wav, its submodules, and replace its `CMakeLists.txt` files with my modified copies.
2. build gsf2wav with Emscripten's `emcmake`