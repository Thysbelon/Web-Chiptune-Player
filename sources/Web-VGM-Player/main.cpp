// copies a lot from libvgm vgm2wav.c demo
// wav functionality removed because it seems the least risky to put as much code as possible into JavaScript. And sox-emscripten seems more flexible anyway
// to do: CHANGE THIS TO JUST A SINGLE ONESHOT MAIN FUNCTION; It should be called from JavaScript like sox-emscripten
/* need to link with:
 * vgm-player
 * vgm-emu
 * vgm-util
 * iconv (depending on system)
 * z
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <stdbool.h>
//#include <emscripten/emscripten.h>

#include "player/playerbase.hpp"
#include "player/vgmplayer.hpp"
#include "player/s98player.hpp"
#include "player/droplayer.hpp"
//#include "player/gymplayer.hpp"
#include "player/playera.hpp"
#include "utils/DataLoader.h"
#include "utils/FileLoader.h"
#include "emu/SoundDevs.h"
#include "emu/EmuCores.h"
#include "emu/SoundEmu.h"

// only used for reading command line arguments
//#define str_equals(s1,s2) (strcmp(s1,s2) == 0)
//#define str_istarts(s1,s2) (strncasecmp(s1,s2,strlen(s2)) == 0)

//#define BUFFER_LEN 2048
const uint16_t BUFFER_LEN=2048; // number of frames in each buffer

const uint16_t SAMPLE_RATE=44100;

const uint8_t FADE_LEN = 0; // fade will be done in JS

const uint8_t LOOPS = 1; // do not generate more than one loop in c code ever, we don't need to emulate music that's already been emulated.

const uint8_t BIT_DEPTH = 16;

/* vgm-specific functions */
//static void
//FCC2STR(char *str, UINT32 fcc); // used in dump_info

static void
set_core(PlayerBase *player, UINT8 devId, UINT32 coreId); // sets emulation core. For example, you could use MAME's code to emulate the Mega Drive chip, or you could use Nuked's code.

//static void
//dump_info(PlayerBase *player);

//const char[] getSystem(PlayerBase *player);

//const bool getStereo(PlayerBase *plrEngine);
const bool getStereo(PlayerBase *plrEngine) {
	const char *const *tags;
	bool stereo;
	tags = plrEngine->GetTags();
	//switch(tags[9] /*system*/) { // strings don't work with switch
	//	case "Nintendo Entertainment System": // to do: put more systems here
	//		stereo=false; break;
	//	default: stereo=true;
	//}
	if (strcmp(tags[9], "Nintendo Entertainment System") == 0) { // to do: put more systems here
		stereo=false;
	} else {
		stereo=true;
	}
	return stereo;
}

// used in write_wav_header
//static void
//pack_uint16le(UINT8 *d, UINT16 n);
//
//static void
//pack_uint32le(UINT8 *d, UINT32 n);
//// end of wav header exclusive functions
//
//// used in frames_to_little_endian
//static inline void repack_int16le(UINT8 *d, const UINT8 *src);
//static inline void repack_int24le(UINT8 *d, const UINT8 *src);
//static inline void repack_int32le(UINT8 *d, const UINT8 *src);
//// end frames_to_little_endian functions
//
//static int
//write_wav_header(FILE *f, unsigned int totalFrames);
//
//static void
//frames_to_little_endian(UINT8 *data, unsigned int frame_count);

//static int
//write_frames(FILE *f, unsigned int frame_count, UINT8 *d);

//static unsigned int
//scan_uint(const char *str); // converts command line arguments to numbers

//static const char *
//fmt_time(double ts); // seems to be used to format seconds into hours minutes and seconds.

//static const char *
//extensible_guid_trailer= "\x00\x00\x00\x00\x10\x00\x80\x00\x00\xAA\x00\x38\x9B\x71";

//EMSCRIPTEN_KEEPALIVE
int main(int argc, const char *argv[]) { // write pcm file & info file
	/*input file will always have the same name in webapp, so there is no input file parameter*/
	uint8_t speed=atoi(argv[1]); /*not sure if there is a use case for making this a float*/
	printf("speed: %i\n", speed);
	const bool debugShortLength = atoi(argv[2]);
	printf("debugShortLength: %d\n", debugShortLength); // 1 is true
	const uint8_t channels = 2; // to do: set this with the getStereo function
	
	PlayerA player;
	PlayerBase* plrEngine;

	//unsigned int totalFrames; // declare this later
	//unsigned int fadeFrames;
	//unsigned int curFrames;
	//FILE *f; // output wav file; we don't need it.
	//FILE* vgmPcmOut; // declare later
	DATA_LOADER *loader;
	
	UINT8 *buffer;
	// buffer format should be the same as gme: [left sample, right sample, left sample, right sample ...]. exactly how many bytes this takes up, and the type of the elements in the buffer array, depends on the bit depth. I'm assuming that the samples are unsigned.
	// the library is built around using a UINT8 array to represent data that could be 16, 24, or 32 bits.
	//UINT8 buffer[(bit_depth / 8) * BUFFER_LEN] // example: if using a bit_depth of 16, this buffer and its size are equal to UINT16 buffer[BUFFER_LEN]
	buffer = (UINT8 *)malloc((BIT_DEPTH / 8)/*bytes per sample; always be two bytes bc bit_depth is always 16*/ * channels * BUFFER_LEN); // typecast is neccessary to prevent an error
	if(buffer == NULL) {
		fprintf(stderr,"out of memory\n");
		return 1;
	}
	
	/* Register all player engines.
	 * libvgm will automatically choose the correct one depending on the file format. */
	player.RegisterPlayerEngine(new VGMPlayer);
	player.RegisterPlayerEngine(new S98Player); // log of the instructions sent to several Yamaha sound chips used in various Japanese home computers
	player.RegisterPlayerEngine(new DROPlayer); // The DOSBox Raw OPL format was created by the DOSBox team to log the raw commands sent to the OPL2, and OPL3 compatible sound devices
	//player.RegisterPlayerEngine(new GYMPlayer); // gym is obsolete
	// descriptions from vgmpf.com
	
	/* setup the player's output parameters and allocate internal buffers */
	if (player.SetOutputSettings(SAMPLE_RATE, channels, BIT_DEPTH, BUFFER_LEN)) { // the function is always run. the "if" statement checks if the function had an error
		fprintf(stderr, "Unsupported sample rate / bps\n");
		return 1;
	}
	/* set playback parameters */
	{
		PlayerA::Config pCfg = player.GetConfiguration();
		pCfg.masterVol = 0x10000;	// == 1.0 == 100%
		pCfg.loopCount = LOOPS;
		pCfg.fadeSmpls = SAMPLE_RATE * FADE_LEN;
		pCfg.endSilenceSmpls = 0;
		pCfg.pbSpeed = 1.0;
		player.SetConfiguration(pCfg);
	}
	
	//vgmPcmOut = fopen("vgmPcmOut.raw","wb");
	//if(vgmPcmOut == NULL) {
	//	fprintf(stderr,"unable to open vgmPcmOut.raw file\n");
	//	return 1;
	//}
	
	/* past all the boilerplate now!
	 * create a FileLoader object - able to read gzip'd
	 * files on-the-fly */

	loader = FileLoader_Init("input"); // load chiptune file
	if(loader == NULL) {
		fprintf(stderr,"failed to create FileLoader\n");
		return 1;
	}

	/* attempt to load 256 bytes, bail if not possible */
	DataLoader_SetPreloadBytes(loader,0x100);
	if(DataLoader_Load(loader)) {
		fprintf(stderr,"failed to load DataLoader\n");
		DataLoader_Deinit(loader);
		return 1;
	}

	/* associate the fileloader to the player -
	 * automatically reads the rest of the file */
	if(player.LoadFile(loader)) {
		fprintf(stderr,"failed to load chiptune file\n");
		return 1;
	}
	plrEngine = player.GetPlayer();
	
	if (plrEngine->GetPlayerType() == FCC_VGM) //?
	{
		VGMPlayer* vgmplay = dynamic_cast<VGMPlayer*>(plrEngine);
		player.SetLoopCount(vgmplay->GetModifiedLoopCount(LOOPS));
	}
	
	//set_core(plrEngine,DEVID_NES_APU,FCC_NSFP);
	set_core(plrEngine,DEVID_NES_APU,FCC_MAME); // this seems to handle "using the DPCM to lower the volume of the triangle" better than the NSFP nes core.

	//write chiptune metadata information that JS might need to a txt file.
	// system (for mono or stereo). tag 9
	// song length
	// loop point
	const bool stereo=getStereo(plrEngine);
	// to do: if possible, set the player's channel settings based on the stereo bool
	
	/* need to call Start before calls like Tick2Sample or
	 * checking any kind of timing info, because
	 * Start updates the sample rate multiplier/divisors */
	player.Start();
	
	unsigned int length; // in audio frames, at 44100 frames per second.
	int loopStart;
	{
		//const char *const *tags;
		//tags = plrEngine->GetTags();
		PLR_SONG_INFO songInfo;
		plrEngine->GetSongInfo(songInfo);
		length=songInfo.songLen;
		loopStart=songInfo.loopTick;
	}
	
	// to do: speed stuff and total frames here; like in Web-GME-Player. For now, we're using length as is.
	const unsigned int totalFrames= debugShortLength ? 220500 /*5 seconds*/ : length;
	
	//size in bytes of each element to be written. (for optimizing the emulation loop)
	const uint8_t ElSize=BIT_DEPTH / 8;
	const uint8_t ElSizeXchannels=ElSize * channels;
	
	FILE* vgmPcmOut;
	vgmPcmOut = fopen("vgmPcmOut.raw","wb");
	if(vgmPcmOut == NULL) {
		fprintf(stderr,"unable to open vgmPcmOut.raw file\n");
		return 1;
	}
	
	// start emulating
	printf("starting emulation...\n");
	for (int i=0; i*BUFFER_LEN<totalFrames; ++i) {
		memset(buffer,0,ElSizeXchannels * BUFFER_LEN); // me: why do we need to overwrite with zeroes; wouldn't this keep getting overwritten by the new buffer?
		
		/* default to BUFFER_LEN PCM frames unless we have under BUFFER_LEN remaining */
		unsigned int totalFramesLeft= totalFrames - i * BUFFER_LEN;
		unsigned int numOfFramesToRender = ( BUFFER_LEN > totalFramesLeft ) ? totalFramesLeft : BUFFER_LEN;

		player.Render(numOfFramesToRender * ElSizeXchannels,buffer);
		// to do: try replacing player.Render with code that just fills buffer with random numbers, and see if the program runs faster.
		
		fwrite(buffer, ElSize, numOfFramesToRender * channels, vgmPcmOut);
	}
	printf("Emulation done.\n");
	fclose(vgmPcmOut);
	
	// end
	player.Stop();
	player.UnloadFile();

	free(buffer);
	player.UnregisterAllPlayers();
	DataLoader_Deinit(loader);
	
	// write info file
	FILE* infoFile;
	infoFile = fopen("info.txt","w");
	fprintf(infoFile, "%d, %u, %d", stereo, length, loopStart);
	fclose(infoFile);

	return 0;
}

//const char[] getSystem(PlayerBase *plrEngine) {
//	const char *const *tags;
//	tags = plrEngine->GetTags();
//	return tags[9]
//}

static void set_core(PlayerBase *player, UINT8 devId, UINT32 coreId) {
	PLR_DEV_OPTS devOpts;
	UINT32 id;

	/* just going to set the first instance */
	id = PLR_DEV_ID(devId,0);
	if(player->GetDeviceOptions(id,devOpts)) return;
	devOpts.emuCore[0] = coreId;
	player->SetDeviceOptions(id,devOpts);
return;
}