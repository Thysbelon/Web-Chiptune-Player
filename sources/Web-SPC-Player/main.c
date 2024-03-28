// one-shot program, like sox-emscripten
// copy of snes_spc/demo/play_spc.c

/*
Usage: play_spc loopEnd speed
*/

#include "snes_spc/spc.h"
#include "demo/demo_util.h" /* error(), load_file() */
#include <stdint.h>

const uint16_t BUF_SIZE=2048; // frames
//const uint16_t BUF_SIZE=1024; // frames

int main( int argc, const char *argv[] )
{
	printf("argv[0]: %s\n", argv[0]);
	unsigned int loopEnd = atoi(argv[1]); // milliseconds
	printf("argv[1]: %s\n", argv[1]);
	printf("loopEnd: %u\n", loopEnd);
	uint8_t speed=atoi(argv[2]); // 100 is normal speed, 50 is slow, 200 is fast, etc.
	printf("speed: %u\n", speed);
	
	/* Create emulator and filter */
	SNES_SPC* snes_spc = spc_new();
	SPC_Filter* filter = spc_filter_new();
	if ( !snes_spc || !filter ) error( "Out of memory" );
	
	/* Load SPC */
	{
		/* Load file into memory */
		long spc_size;
		void* spc = load_file( "input.spc", &spc_size );
		
		/* Load SPC data into emulator */
		error( spc_load_spc( snes_spc, spc, spc_size ) );
		free( spc ); /* emulator makes copy of data */
		
		/* Most SPC files have garbage data in the echo buffer, so clear that */
		spc_clear_echo( snes_spc );
		
		/* Clear filter before playing */
		spc_filter_clear( filter );
	}
	
	/* Record */
	// to do: speed stuff and total frames here; like in Web-GME-Player.
	const unsigned int totalFrames=((long long)loopEnd * (long long)32000/*SAMPLE RATE!!!!!*/) / 1000;
	printf("totalFrames: %u\n", totalFrames);
	
	printf("starting emulation...\n");
	FILE* pcmOut;
	pcmOut=fopen("pcmOut.raw", "wb");
	for (int i=0; (i * BUF_SIZE) < totalFrames; ++i)
	{
		/* Play into buffer */
		/* default to [number of frames in buffer] frames unless we have under [buffer frames] remaining */
		unsigned int totalFramesLeft= totalFrames - i * BUF_SIZE;
		unsigned int numOfFramesToRender = ( BUF_SIZE > totalFramesLeft ) ? totalFramesLeft : BUF_SIZE;
		numOfFramesToRender = numOfFramesToRender * 2/*channels*/;
		short buf [numOfFramesToRender];
		error( spc_play( snes_spc, numOfFramesToRender, buf ) );
		
		/* Filter samples */
		spc_filter_run( filter, buf, numOfFramesToRender );
		
		fwrite(buf, 2, numOfFramesToRender, pcmOut);
	}
	fclose(pcmOut);
	printf("emulation done.\n");
	
	/* Cleanup */
	spc_filter_delete( filter );
	spc_delete( snes_spc );
	
	return 0;
}
