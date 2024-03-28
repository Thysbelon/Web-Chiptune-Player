# Web-GME-Player

[game-music-emu](https://github.com/libgme/game-music-emu) compiled via Emscripten. Unlike the others, this module doesn't have a main function. Use cwrap and ccall to use its functions.

## How to build `main.c`
(Instructions have only been tested on Ubuntu)

Download the source of [game-music-emu](https://github.com/libgme/game-music-emu). Follow their directions for compiling, but use emscripten tools (and you may want to name the build folder "build-emscripten"). Use this command for cmake:
`emcmake cmake ../ -DBUILD_SHARED_LIBS=OFF -DUSE_GME_GYM=OFF -DUSE_GME_KSS=OFF -DUSE_GME_SPC=OFF -DUSE_GME_VGM=OFF`

Then, build the wasm and js with `emcc -O3 -I../game-music-emu/gme ../game-music-emu/build-emscripten/gme/libgme.a main.c -o Web-GME-Player.js -sEXPORTED_RUNTIME_METHODS=ccall,cwrap,FS -sMODULARIZE -s 'EXPORT_NAME="createGMEmodule"' -sUSE_ZLIB`
