# Web-Chiptune-Player
A library to allow frontend web programmers to embed chiptune into their websites.

You can:
- play back a song with infinite looping
- play back a song with 2 loops and a fade
- generate an `<audio>` element for playback controls
- render a chiptune then download it as a wav file.
- Take a mono system, and pan its voices left or right (currently only for the gme module)

It is currently a work in progress. It can play:

- SPC (Super Famicom/SNES) via [snes_spc](https://github.com/blarggs-audio-libraries/snes_spc)
- PSF (PlayStation 1 Sequenced Music) via [upse123](https://packages.ubuntu.com/en/mantic/upse123)
- VGM (many consoles) via [libvgm](https://github.com/ValleyBell/libvgm)
- These file types via the [game_music_emu library](https://github.com/libgme/game-music-emu):
	- NSF & NSFE (Famicom/NES)
	- GBS (Game Boy)
	- AY (ZX Spectrum, Amstrad CPC)
	- SAP (Atari)
	- HES (PC Engine/TurboGrafx-16)

This repository will be a combination of all my other web chiptune repositories.

## Folders
### web
This folder contains only the files you need to put on your website to use the library.

### test-music
This folder contains various chiptune files that I use to test the library

### sources
This folder contains the c source code of the Emscripten modules used in the library.

## Credits
This library borrows code from many different open source libraries. If a library I used is not mentioned here, its source should be listed in a text file in the repository.

- [game_music_emu](https://github.com/libgme/game-music-emu)
- [libvgm](https://github.com/ValleyBell/libvgm)
- [upse123](https://packages.ubuntu.com/en/mantic/upse123)
- [snes_spc](https://github.com/blarggs-audio-libraries/snes_spc)
- [sox-emscripten](https://github.com/rameshvarun/sox-emscripten)
- [gsf2wav](https://github.com/jprjr/gsf2wav)