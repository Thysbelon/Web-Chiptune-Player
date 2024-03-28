# Web-Chiptune-Player
A library to allow frontend web programmers to embed chiptune into their websites.

You can play back a song with infinite looping, 2 loops and a fade. You can generate an `<audio>` element for playback controls. You can render a chiptune then download it as a wav file.

It is currently a work in progress. It can play:

- SPC
- PSF
- NSF
- NSFE
- GBS
- AY
- SAP
- HES

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
- [upse123](https://packages.ubuntu.com/en/mantic/upse123)
- [snes_spc](https://github.com/blarggs-audio-libraries/snes_spc)
- [gsf2wav](https://github.com/jprjr/gsf2wav)
- [libvgm](https://github.com/ValleyBell/libvgm)
- [sox-emscripten](https://github.com/rameshvarun/sox-emscripten)
