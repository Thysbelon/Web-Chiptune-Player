# Web-Chiptune-Player
A library to allow frontend web programmers to embed chiptune into their websites.

You can:
- play back a song with infinite looping
- play back a song with 2 loops and a fade
- generate an `<audio>` element for playback controls
- render a chiptune then download it as a wav file.
- Take a mono system, and pan its voices left or right (currently only for the game_music_emu file types)

It is currently a work in progress. It can play:

- VGM & VGZ (many consoles) via [libvgm](https://github.com/ValleyBell/libvgm)
- SPC (Super Famicom/SNES) via [snes_spc](https://github.com/blarggs-audio-libraries/snes_spc)
- PSF (PlayStation 1 Sequenced Music) via [upse123](https://packages.ubuntu.com/en/mantic/upse123)
- These file types via the [game_music_emu library](https://github.com/libgme/game-music-emu):
	- NSF & NSFE (Famicom/NES)
	- GBS (Game Boy)
	- AY (ZX Spectrum, Amstrad CPC)
	- SAP (Atari)
	- HES (PC Engine/TurboGrafx-16)

Instead of rendering the song while the user is listening to it, which can result in poor audio quality on mobile and other low-end hardware; Web-Chiptune-Player renders one whole loop of the song and *then* plays the music (looping is done after the song has rendered). The trade-off is that you'll have to wait a few seconds before the song starts, but the quality should always be good.  
Many chiptune files (except vgm & vgz) do not have the correct length in their metadata; thus, to use Web-Chiptune-Player to its full potential, please always input the correct renderLength (the length of one loop, including intro) and introLength (the length of just the intro).  
(Note: the above does not apply to non-looping songs)

This repository will be a combination of all my other web chiptune repositories.

To learn more, please view the [demo](https://thysbelon.github.io/Web-Chiptune-Player/demo.html).

## Folders
### web
This folder contains only the files you need to put on your website to use the library.

### docs
This folder contains the demo; the test-music folder contains various chiptune files that I use to test the library.

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