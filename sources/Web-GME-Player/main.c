// development on hold until gme 0.6.4, which should make multichannel better
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#include <gme.h>
#include <emscripten/emscripten.h>

//#include <math.h> //for sin

void handle_error( const char* str );
/*draft*/
// javascript ccall program flow:
// generatePCMfileAndReturnInfo (use multi channel if panning?)
// if onceInPage: emscripten_force_exit

static const uint16_t SAMPLE_RATE=44100;

static bool stereo;
static bool multitrack=false;
static Music_Emu* emu;

void createNewEmu(const unsigned int newSampleRate) {
	gme_type_t file_type;
	gme_identify_file( "/home/web_user/input", &file_type );
	if (file_type == gme_ay_type || file_type == gme_nsf_type || file_type == gme_nsfe_type || file_type == gme_sap_type ) {
		stereo=false;
	} else {
		stereo=true;
	}
	// idea:
	//switch(*file_type) {
	//	case *gme_ay_type:
	//	case *gme_nsf_type:
	//	case *gme_nsfe_type:
	//	case *gme_sap_type:
	//		stereo=false; break;
	//	default: stereo=true;
	//}
	emu = gme_new_emu( file_type, newSampleRate );
	handle_error( gme_load_file( emu, "/home/web_user/input" ) );
	multitrack=gme_type_multitrack( file_type );
}

EMSCRIPTEN_KEEPALIVE
void endEmscripten() {
	emscripten_force_exit(0);
}

void fillFileWithSamples(FILE* pcmOut, Music_Emu* emu, const uint16_t framesPerBuffer, const unsigned int totalFrames, const uint16_t bufferSize){
	printf("starting emulation...\n");
	for (int i=0; i*framesPerBuffer<totalFrames; ++i) {
		short buf[bufferSize]; // array of int 16
		gme_play(emu, bufferSize, buf);
		unsigned int totalFramesLeft= totalFrames - i * bufferSize;
		unsigned int numOfFramesToWrite = (bufferSize > totalFramesLeft) ? totalFramesLeft : bufferSize;
		fwrite(buf, 2, numOfFramesToWrite, pcmOut);
	}
	fclose(pcmOut);
	printf("emulation done.\n");
}

uint8_t voiceNameToNum(char* voiceName, int8_t totalVoices){
	for (uint8_t i=0; i<totalVoices; ++i) {
		//char tempString[11];
		//snprintf(tempString, 11, "%s\n", gme_voice_name(emu, i));
		printf("Comparing strings: %s and %s\n", gme_voice_name(emu, i), voiceName);
		if ( /*strcmp( gme_voice_name(emu, i), voiceName ) == 0*/ strstr(voiceName, gme_voice_name(emu, i))!=NULL ) {printf("Strings are the same\n"); return i;}
	}
}

EMSCRIPTEN_KEEPALIVE
char* generatePCMfileAndReturnInfo(int track, uint8_t speed /*not sure if there is a use case for making this a float*/, bool diffEmu /*determines whether previous emu will be discarded, should be true when a different file is being used */, bool multichannel, bool onceInPage) {
	// speed: 50 is half speed (slow). 200 is twice the speed (fast). 100 is no change in speed.
	// to do: add a length input? (to only render a few seconds, useful for testing); discard half of buffer if stereo is false and no multichannel
	const unsigned int newSampleRate=((float)SAMPLE_RATE/speed)*100;
	if ( multitrack ) { // if an emulator exists (multitrack is false by default, if its 'true' that means an emulator has already been made)
		printf("An emulator already exists.\n");
		if (diffEmu) {
			printf("diffEmu is true. Deleting previous emulator...\n");
			gme_delete( emu );
			createNewEmu(newSampleRate);
		}
	} else {
		printf("An emulator does not already exist.\n");
		createNewEmu(newSampleRate);
	}

	gme_info_t* info;
	gme_track_info( emu, &info, track );
	int length=info->length;
	if (length == -1) {
		printf("file length is undefined, try adding intro_length and loop_length\n");
		length = info->intro_length + info->loop_length;
		printf("new length: %d\n", length);
		if (length == -2) {
			printf("intro length and loop length were both undefined. setting to 150000\n");
			length = 150000;
			printf("new length: %d\n", length);
		}
	}
	int loopStart=info->intro_length;
	printf("current emulator is %s\n", info->system);
	gme_free_info(info);

	int8_t totalVoices=gme_voice_count( emu );
	printf("totalVoices: %d\n", totalVoices );
	const uint16_t framesPerBuffer=1024; // maybe framesPerBuffer and bufferSize should stay between runs of a multitrack file
	printf("framesPerBuffer: %d\n", framesPerBuffer );
	const uint16_t bufferSize=(framesPerBuffer * 2 /*channels*/); // a frame is a group of one sample for each instrument; it is a single moment in time.
	printf("bufferSize: %d\n", bufferSize );
	const unsigned int totalFrames=(uint64_t)((uint64_t)length * (uint64_t)newSampleRate) / 1000;
	printf("(length %d * newSampleRate %i) / 1000: totalFrames %i\n", length, newSampleRate, totalFrames);
	if (multichannel == true) {
		printf("multichannel is true\n");
		//FILE* pcmOut[totalVoices] // no need to make an array, because we're not using these values again
		// only voices that are being panned should be recorded to their own file. everything else should be in one file
		// list of the voices being panned should be put in a text file? text file should list the number of each voice on a newline
		// WIP
		gme_ignore_silence( emu, 1 ); // very important for recording separate tracks. 1 is true
		printf("silence ignored\n");
		// start track and write samples to file here.
		handle_error( gme_start_track( emu, track ) );
		printf("track started\n");
		FILE* voicesFile;
		voicesFile=fopen("voices.txt", "r");
		if (voicesFile==NULL) {
			printf("ERROR: voicesFile failed to open.\n");
		} else {printf("voicesFile opened.\n");}
		// max voices: 13
		uint8_t voicesToSeparate[13];
		char lineReader[10];
		uint8_t voicesFileIndex=0;
		while(fgets(lineReader, 10, voicesFile)){ // read file line by line
			//voicesToSeparate[voicesFileIndex]=atoi(lineReader); // text on each line is no longer the index number of the voice; it is now the name of the voice.
			voicesToSeparate[voicesFileIndex]=voiceNameToNum(lineReader, totalVoices);
			printf("voicesToSeparate[%i]: %i\n", voicesFileIndex, voicesToSeparate[voicesFileIndex]);
			printf("lineReader: %s\n", lineReader);
			++voicesFileIndex;
		}
		fclose(voicesFile);
		uint8_t totalVoicesToSeparate=voicesFileIndex;
		printf("totalVoicesToSeparate: %i\n", totalVoicesToSeparate);

		//voicesFileIndex = NULL; // ?
		for (int8_t i=0; i<totalVoicesToSeparate; ++i) {
			if (gme_tell(emu)>0) {gme_seek( emu, 0 );}
			//"pcmOut01.raw"
			char filename[15];
			snprintf(filename, 15, "%s.raw", gme_voice_name(emu, voicesToSeparate[i])); // name the files after the voice name; "Square 1.raw"
			gme_mute_voices( emu, -1 ); // mute all voices
			gme_mute_voice( emu, voicesToSeparate[i], 0 ); // unmute
			//pcmOut[i]=fopen(filename, "wb")
			FILE* pcmOut;
			pcmOut=fopen(filename, "wb");
			fillFileWithSamples(pcmOut, emu, framesPerBuffer, totalFrames, bufferSize);
		}
		/*
		for (int8_t i=0; i<totalVoices; ++i) {
			//"pcmOut01.raw"
			char filename[13];
			snprintf(filename, 13, "pcmOut%d.raw", i);
			//pcmOut[i]=fopen(filename, "wb")
			FILE* pcmOut;
			pcmOut=fopen(filename, "wb");
			fillFileWithSamples(pcmOut, emu, framesPerBuffer, totalFrames, bufferSize);
		}
		*/
		// record the rest of the voices
		if (gme_tell(emu)>0) {gme_seek( emu, 0 );}
		gme_mute_voices( emu, 0 ); // unmute all voices
		for (int8_t i=0; i<totalVoicesToSeparate; ++i) {
			gme_mute_voice( emu, voicesToSeparate[i], 1 ); // mute
		}
		FILE* pcmOut;
		pcmOut=fopen("theRest.raw", "wb"); // contains all unpanned voices.
		fillFileWithSamples(pcmOut, emu, framesPerBuffer, totalFrames, bufferSize);
	} else {
		printf("multichannel is false\n");
		// start track and write samples to file here.
		handle_error( gme_start_track( emu, track ) );
		gme_mute_voices( emu, 0 ); // unmute all voices
		FILE* pcmOut;
		pcmOut=fopen("pcmOut.raw", "wb");
		fillFileWithSamples(pcmOut, emu, framesPerBuffer, totalFrames, bufferSize);
	}
	/*
	for (int i=0; i*framesPerBuffer<totalFrames; ++i) {
		short buf[bufferSize]; // array of int 16
		gme_play(emu, bufferSize, buf);
		unsigned int totalFramesLeft= totalFrames - i * bufferSize;
		unsigned int numOfFramesToWrite = (bufferSize > totalFramesLeft) ? totalFramesLeft : bufferSize;
		fwrite(buf, 2, numOfFramesToWrite, pcmOut);
	}
	fclose(pcmOut);
	*/

	length=((float)length/speed)*100; // speed adjusted length for javascript audiobuffers and nodes
	// max length string (could be reduced slightly with hex): "2147483647, 2147483647, 0, 13, Square 1, Square 2, Triangle, Noise, DMC, Wave 1, Wave 2, Wave 3, Wave 4, Wave 5, Wave 6, Wave 7, Wave 8"
	//const uint8_t trackInfoSize=/*26*/30; // the null terminator is a character.
	const uint8_t trackInfoSize=26;
	char trackInfo[trackInfoSize]; // information that js will need to gen audiobuffers and nodes
	snprintf( trackInfo, trackInfoSize, "%d, %d, %d", length, loopStart, stereo );
	printf("length, loopStart, and stereo stored.\n");
	/*
	if (multichannel) {
		char tempTotalVoices[5]; // the null terminator is a character.
		printf("tempTotalVoices created.\n");
		snprintf( tempTotalVoices, 5, ", %i", totalVoices );
		printf("totalVoices saved to tempTotalVoices.\n");
		strcat( trackInfo, tempTotalVoices );
		printf("tempTotalVoices concatenated with trackInfo.\n");
		for (int i=0;i<totalVoices;++i) {
			strcat( trackInfo, ", " );
			strcat( trackInfo, gme_voice_name( emu, i ) );
		}
	}
	*/

	if (!multitrack) {gme_delete( emu );}

	//if (onceInPage) {emscripten_force_exit(0);} // I believe trackInfo should still be returned to JS. If not, we can write trackInfo to another file.
	// WARNING: the pcm file will probably deleted after emscripten_force_exit is called.

	return trackInfo; // Wreturn-stack-address shouldn't be an issue because this is going straight to JavaScript.
}

void handle_error( const char* str )
{
	if ( str )
	{
		printf( "Error: %s\n", str ); //getchar();
		//exit( EXIT_FAILURE );
	}
}