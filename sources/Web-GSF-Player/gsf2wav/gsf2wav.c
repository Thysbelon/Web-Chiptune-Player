#include <lazygsf.h>
#include <psflib.h>

#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

/* demo program that renders a GSF file into a raw file */

#define SAMPLE_RATE 44100
#define FRAMES_IN_BUFFER 1024

int16_t buffer[FRAMES_IN_BUFFER * 2/*channels*/];

static unsigned int length = 0;
static unsigned int fade = 0;

/* global variable for the current pcm frame */
uint64_t frame_no = 0;

/* global variable - total pcm frames */
uint64_t frame_total = 0;

static void
pack_frames(void);

static void
pack_int16le(uint8_t *d, int16_t n);

static void
pack_uint16le(uint8_t *d, uint16_t n);

static void
pack_uint32le(uint8_t *d, uint32_t n);

static void *
gsf2wav_fopen(void *userdata, const char *filename) {
    (void)userdata;
    return fopen(filename,"rb");
}

static size_t
gsf2wav_fread(void *buffer, size_t size, size_t count, void *handle) {
    return fread(buffer,size,count,(FILE *)handle);
}

static int
gsf2wav_fseek(void *handle, int64_t offset, int whence) {
    return fseek((FILE *)handle,offset,whence);
}

static int
gsf2wav_fclose(void *handle) {
    return fclose((FILE *)handle);
}

static long
gsf2wav_ftell(void *handle) {
    return ftell((FILE *)handle);
}

/**
 * parses H:M:S into milliseconds
 */
static unsigned int
gsf2wav_parse_time(const char *ts)
{
	unsigned int i = 0;
	unsigned int t = 0;
	unsigned int c = 0;
	unsigned int m = 1000;
	for(i=0;i<strlen(ts);i++)
	{
		if(ts[i] == ':')
		{
			t *= 60;
			t += c*60;
			c = 0;
		}
		else if(ts[i] == '.') {
			m = 1;
			t += c;
			c = 0;
		}
		else
		{
			if(ts[i] < 48 || ts[i] > 57)
			{
				return 0;
			}
			c *= 10;
			c += (ts[i] - 48) * m;
		}
	}
	return c + t;
}

static int
gsf2wav_tag_handler(void *ctx, const char *name, const char *value) {
    printf("%s=%s\n",name,value);

    if(strcmp(name,"length") == 0) {
        length = gsf2wav_parse_time(value);
    } else if(strcmp(name,"fade") == 0) {
        fade = gsf2wav_parse_time(value);
    }

    return 0;
}


static const psf_file_callbacks gsf2wav_psf_stdio = {
    "\\/:|",
    NULL,
    gsf2wav_fopen,
    gsf2wav_fread,
    gsf2wav_fseek,
    gsf2wav_fclose,
    gsf2wav_ftell,
};

static int gsf2wav_load(void *context, const uint8_t *exe, size_t exe_size, const uint8_t *reserved, size_t reserved_size) {
    (void)reserved;
    (void)reserved_size;
    return gsf_upload_section((gsf_state_t *)context,exe,exe_size);
}

void status_callback(void *context, char *message) {
    fprintf(stderr, "%s", message);
}

int main(int argc, const char *argv[]) {
    gsf_state_t *gsf = NULL;
    FILE *out = NULL;

    //if(argc < 3) {
        //printf("Usage: %s /path/to/minigsf /path/to/output.wav\n",
        //argv[0]);
        //return 1;
    //}

    gsf_init();

    gsf = malloc(gsf_get_state_size());
    if(gsf == NULL) abort();
    gsf_clear(gsf);

    if(psf_load(argv[1] /* the webapp will always change the name of the input file to "input.gsf", but having the input read from argv makes it easier to test (by testing a linux build) */,
        &gsf2wav_psf_stdio,0x22,gsf2wav_load,gsf,
        gsf2wav_tag_handler,NULL,0,
        status_callback,NULL) <= 0) {
        free(gsf);
        return 1;
    }
    gsf_set_sample_rate(gsf,SAMPLE_RATE);

	FILE* infoFile;
	infoFile = fopen("info.txt","w");
	fprintf(infoFile, "%u, %u", length, fade); // length and fade are in milliseconds.
	fclose(infoFile);

    out = fopen("gsfPcmOut.raw","wb");
    if(out == NULL) {
        gsf_shutdown(gsf);
        free(gsf);
        return 1;
    }
	
	if (argc == 3) {
		frame_total = atoi(argv[2]); // This is input length. It should be in milliseconds.
	} else {
		frame_total = length;
	}
	frame_total *= SAMPLE_RATE;
	frame_total /= 1000;

    for(frame_no=0;frame_no<frame_total; frame_no += FRAMES_IN_BUFFER) {
        gsf_render(gsf,buffer,FRAMES_IN_BUFFER);
        fwrite(buffer,2, frame_total - frame_no > FRAMES_IN_BUFFER ? FRAMES_IN_BUFFER * 2/*channels*/ : (frame_total - frame_no) * 2/*channels*/, out);
    }
	// output is singed 16 int little endian, 2 channels (stereo), and SAMPLE_RATE sample rate.
    gsf_shutdown(gsf);
    free(gsf);
    fclose(out);
    return 0;
}
