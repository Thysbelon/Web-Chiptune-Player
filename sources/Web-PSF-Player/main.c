/*
 * UPSE: the unix playstation sound emulator.
 *
 * Filename: upse123_main.c
 * Purpose: libupse: UPSE123 (console player) main loop
 *
 * Copyright (c) 2007 William Pitcock <nenolod@sacredspiral.co.uk>
 *
 * UPSE is free software, released under the GNU General Public License,
 * version 2.
 *
 * A copy of the GNU General Public License, version 2, is included in
 * the UPSE source kit as COPYING.
 *
 * UPSE is offered without any warranty of any kind, explicit or implicit.
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdarg.h>
#include <sys/mman.h> // https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_mman.h.html
#include <errno.h>
#include <string.h>
#include <time.h> // what is this used for?
#include <fcntl.h>
#include <upse.h>

#include "config.h"

static void *
upse123_open_impl(char *path, char *mode)
{
    return fopen(path, mode);
}

static size_t
upse123_read_impl(void *ptr, size_t sz, size_t nmemb, void *file)
{
    FILE *f = (FILE *) ptr;

    return fread(f, sz, nmemb, file);
}

static int
upse123_seek_impl(void *ptr, long offset, int whence) // I'm not putting seeking in the c code, but it seems this function is necessary for other functions.
{
    FILE *f = (FILE *) ptr;

    return fseek(f, offset, whence);
}

static int
upse123_close_impl(void *ptr)
{
    FILE *f = (FILE *) ptr;

    return fclose(f);
}

static upse_iofuncs_t upse123_iofuncs = {
    upse123_open_impl,
    upse123_read_impl,
    upse123_seek_impl,
    upse123_close_impl
};

static int decode_position = 0;
static upse_psf_t *psf;
static FILE* psfPcmOut;
static unsigned long renderLength = 0;

void 
upse123_write_audio(unsigned char* data, long bytes, void *unused) // writes input psf audio to output. gets attached to libupse in order to render psf. libupse does not have a play() or render() function. HOWEVER: THE LATEST LIBUPSE HAS A upse_get_buffer FUNCTION IN upse-internal.h. Though, it seems the intended way to use the library is always to define a callback function instead of calling render manually.
{
    //int remaining;

	fwrite(data, 1, bytes, psfPcmOut); // write may be faster, but it may break things.

	decode_position += ((bytes / 4 * 1000) / 44100); // likely give a value in milliseconds
    //remaining = psf->length - decode_position; // likely give a value in milliseconds

    //printf("\033[00;36mTime:\033[0m %02d:%02d.%02d%s",
    //     (int)(decode_position / 1000.0) / 60,
    //     (int)(decode_position / 1000.0) % 60,
    //     (int)(decode_position / 10.0) % 100,
	// psf->length == -1 ? "\r" : "");
	//
    //if (psf->length != -1)
    //{
    //    printf(" [-%02d:%02d.%02d]",
    //         (int)(remaining / 1000.0) / 60,
    //         (int)(remaining / 1000.0) % 60,
    //         (int)(remaining / 10.0) % 100);
	//
    //    printf(" of %02d:%02d.%02d\r",
    //         (int)(psf->length / 1000.0) / 60,
    //         (int)(psf->length / 1000.0) % 60,
    //         (int)(psf->length / 10.0) % 100);
    //}

    //fflush(stdout); // don't want to overload the browser console with prints
	// to do: rewrite the above "time remaining" code to only send a message every 10% of the song rendered.
	
	if (renderLength != 0) {
		if (decode_position >= renderLength) {
			upse_set_audio_callback(NULL, NULL);
		}
	}
}

void
upse123_init_audio(void) // sets up the output audio device (not psf), but the upse_set_audio_callback() function is important
{
	psfPcmOut = fopen("psfPcmOut.raw", "wb");
    upse_set_audio_callback(upse123_write_audio, NULL); // upse_set_audio_callback DOESN'T EXIST IN LATEST libupse ????
}

void
upse123_close_audio(void) // closes output audio device (not psf), and nulls upse audio callback
{
    upse_set_audio_callback(NULL, NULL);
	fclose(psfPcmOut);
}

void
upse123_print_field(char *field, char *data)
{
    if (data == NULL)
        return;

    printf("\033[00;36m%-20s\033[01;36m|\033[0m %s\n", field, data);
}

/*
void
usage(const char *progname)
{
    printf("\nUsage: %s [options] files - plays PSF files\n\n", progname);
    printf("  -R        Disables reverb.\n");
    printf("  -q        Enables non-resampled reverb. [experimental]\n");
    printf("  -B        Sets a custom BIOS to use.\n");
}
*/

int
main(int argc, char *argv[])
{
    //int i;
    //char r;
    //int sleep_value_ = 0;

//    while ((r = getopt(argc, argv, "hvo:d:s:RqB:")) >= 0)
//    {
//        switch(r) {
//            case 'R':
//                upse_set_reverb_mode(0);
//                break;
//            case 'q':
//                upse_set_reverb_no_downsample(1);
//                break;
//            case 'B':
//                upse_set_custom_bios(optarg);
//                break;
//            default:
//                break;
//        }
//    }

    printf("\033[K\033[01;36mUPSE123\033[00;36m: High quality PSF player.\033[0m\n");
    printf("\033[K\033[00;36mCopyright (C) 2007 William Pitcock <nenolod@sacredspiral.co.uk>\033[0m\n");
    printf("\n\033[01mUPSE123 is free software; licensed under the GNU GPL version 2.\nAs such, NO WARRANTY IS PROVIDED. USE AT YOUR OWN RISK!\033[0m\n");

    upse123_init_audio(); // should open pcm output file stream

        if ((psf = upse_load(argv[1], &upse123_iofuncs)) == NULL)
        {
            printf("%s: failed to load `%s'\n", argv[0], argv[1]);
            //continue;
						exit(1);
        }

        printf("\nInformation about \033[01m%s\033[00;0m:\n\n", argv[1]);

        upse123_print_field("Game", psf->game);
        upse123_print_field("Title", psf->title);
        upse123_print_field("Artist", psf->artist);
        upse123_print_field("Year", psf->year);
        upse123_print_field("Genre", psf->genre);
        upse123_print_field("Ripper", psf->psfby);
        upse123_print_field("Copyright", psf->copyright);
		printf("Length: %u\n", psf->length);
		printf("Fade: %u\n", psf->fade);

		FILE* infoFile;
		infoFile = fopen("info.txt","w");
		fprintf(infoFile, "%u, %u", psf->length, psf->fade);
		fclose(infoFile);

		if (!argv[2]) {
			if (psf->fade != 0) {renderLength = psf->length - psf->fade;} else {renderLength = psf->length;}
		} else {
			renderLength=atoi(argv[2]);
		}
		printf("renderLength: %lu\n", renderLength);

	printf("\n");

        upse_execute(); // doesn't exist in latest libupse!!!!! // starts audio callback (presumably)
        upse_free_psf_metadata(psf);

    upse123_close_audio(); // close pcm output file stream here

    return 0;
}
