#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../src/kssplay.h"

#define MAX_RATE 384000
#define MAX_PATH 256

/*
static void WORD(char *buf, uint32_t data) {
  buf[0] = data & 0xff;
  buf[1] = (data & 0xff00) >> 8;
}
*/

#define HLPMSG                                                                                                         \
  "Usage: kss2wav [Options] FILENAME.KSS \n"                                                                           \
  "Options: \n"                                                                                                        \
  "  -n[1|2]        Number of channels (default:1)\n"                                                                  \
  "  -p<play_time>  Play time in seconds\n"                                                                            \
  "  -q<PSG quality><SCC quality><OPLL quality>    Rendering quality 0:LOW 1:HIGH (default:1)\n"                                                      \
  "  -r<play_rate>  Specify the sample rate (default:44100)\n"                                                           \
  "  -s<song_num>   Song number to play\n"                                                                             \
  "Note: spaces are not accepted between the option character and its parameter.\n"

typedef struct {
  int rate;
  int nch;
  //int bps;
  int song_num;
  int play_time;
  int fade_time;
  int loop_num;
  int psgQuality;
	int sccQuality;
	int opllQuality;
  char input[MAX_PATH + 4];
  //char output[MAX_PATH + 4];
  int help;
  int error;
} Options;

static Options parse_options(int argc, char **argv) {

  Options options;
  int i;

  options.rate = 44100;
  options.nch = 1;
  options.song_num = 0;
  options.play_time = 60;
  options.fade_time = 0;
  options.loop_num = 1;
  options.input[0] = '\0';
  //strcpy(options.output, "kssPcmOut.raw");
  options.help = 0;
  options.error = 0;
	options.psgQuality = 1;
	options.sccQuality = 1;
	options.opllQuality = 1;
	
	// for a string that's three characters long, myString[2] and myString + 2 will both return the same character. (myString[2] is a char, myString + 2 is a string containing a char and a null terminator)
	// note: atoi only takes strings, not chars.
  for (i = 1; i < argc; i++) {
    if (argv[i][0] == '-') {
      switch (argv[i][1]) {
      case 'n':
        options.nch = (2 == atoi(argv[i] + 2)) ? 2 : 1;
        break;
      case 'p':
        options.play_time = atoi(argv[i] + 2);
        break;
      case 's':
        options.song_num = atoi(argv[i] + 2);
        break;
      case 'r':
        options.rate = atoi(argv[i] + 2);
        break;
      case 'q':
				options.psgQuality = argv[i][2] == '0' ? 0 : 1;
				options.sccQuality = argv[i][3] == '0' ? 0 : 1;
				options.opllQuality = argv[i][4] == '0' ? 0 : 1;
        break;
      default:
        options.error = 1;
        break;
      }
    } else {
      strncpy(options.input, argv[i], MAX_PATH);
    }
  }

  if (options.rate > MAX_RATE) {
    options.rate = 44100;
  }

  return options;
}

int main(int argc, char *argv[]) {

  KSSPLAY *kssplay;
  KSS *kss;
  //FILE *fp;

  if (argc < 2) {
    printf(HLPMSG);
    exit(0);
  }

  Options opt = parse_options(argc, argv);

  if (opt.error) {
    fprintf(stderr, HLPMSG);
    exit(1);
  }

  printf("SONG:%02d, PLAYTIME:%d(sec), FADETIME:%d(sec), RATE:%d\n", opt.song_num, opt.play_time, opt.fade_time, opt.rate);
	printf("PSG QUALITY: %d, SCC QUALITY: %d, OPLL QUALITY: %d\n", opt.psgQuality, opt.sccQuality, opt.opllQuality);

  if ((kss = KSS_load_file(opt.input)) == NULL) {
    fprintf(stderr, "FILE READ ERROR!\n");
    exit(1);
  }

  /* Print title strings */
  printf("idstr: [%s]\n", kss->idstr);
  printf("title: %s\n", kss->title);
  if (kss->extra)
    printf("extra: %s\n", kss->extra);

  /* INIT KSSPLAY */
  kssplay = KSSPLAY_new(opt.rate, opt.nch, 16);
  KSSPLAY_set_data(kssplay, kss);
  KSSPLAY_reset(kssplay, opt.song_num, 0);
	
	// allow user to set quality separately for each device DONE
  KSSPLAY_set_device_quality(kssplay, KSS_DEVICE_PSG, opt.psgQuality);
  KSSPLAY_set_device_quality(kssplay, KSS_DEVICE_SCC, opt.sccQuality);
  KSSPLAY_set_device_quality(kssplay, KSS_DEVICE_OPLL, opt.opllQuality);

	// TODO : modify this and the command line args to make it possible to set the pan of each channel on each device separately. The MSX is a mono system, like the famicom. NOTE: use this https://github.com/digital-sound-antiques/libkss/issues/6

  /* Create WAV Data */
	if (opt.nch == 1) {
		
		int t = opt.play_time; // attempt to make sure this int has enough memory
		
		FILE *fp;
		
		/* Open Output file */
		if ((fp = fopen("kssPcmOut.raw", "wb")) == NULL) {
			fprintf(stderr, "Can't open %s\n", "kssPcmOut.raw");
			exit(1);
		}
		
		//int16_t *wavebuf = malloc(opt.rate * opt.nch * sizeof(int16_t));
		int16_t wavebuf[opt.rate];
		
		for (t = 0; t < opt.play_time; t++) {
			if (t % 20 == 0)
				printf("%03d/%03d\n", t, opt.play_time);

			KSSPLAY_calc(kssplay, wavebuf, opt.rate);
			//for (i = 0; i < opt.rate * opt.nch; i++) {
			//	/** The following function ensures that wave data is little-endian. */
			//	WORD((char *)(wavebuf + i), wavebuf[i]);
			//}

			/* Write 1 sec wave block to file */
			fwrite(wavebuf, sizeof(int16_t), opt.rate, fp);

			/* If the play is stopped, break */
			if (KSSPLAY_get_stop_flag(kssplay)) {
				printf("stop flag detected.\n");
				break;
			}

			//printf("\x08\x08\x08\x08\x08\x08\x08"); // ?
		}
		printf("%03d/%03d\n", opt.play_time, opt.play_time); // looks nice
		printf("Loop ended. closing output file...\n");
		if (fclose(fp) == 0) {
			printf("output file closed.\n");
		} else {
			fprintf(stderr, "Error. Output file did not close successfully.\n");
		}
	} else {
		
		//psg[3];
		//scc[5];
		//opll[15];
		//opl[15];
		//sng[4];
		//dac[2];

		/* Open Output file */
		FILE *psg0 = fopen("psg0.raw", "wb");
		FILE *psg1 = fopen("psg1.raw", "wb");
		FILE *psg2 = fopen("psg2.raw", "wb");
		FILE *scc0 = fopen("scc0.raw", "wb");
		FILE *scc1 = fopen("scc1.raw", "wb");
		FILE *scc2 = fopen("scc2.raw", "wb");
		FILE *scc3 = fopen("scc3.raw", "wb");
		FILE *scc4 = fopen("scc4.raw", "wb");
		FILE *opll0 = fopen("opll0.raw", "wb");
		FILE *opll1 = fopen("opll1.raw", "wb");
		FILE *opll2 = fopen("opll2.raw", "wb");
		FILE *opll3 = fopen("opll3.raw", "wb");
		FILE *opll4 = fopen("opll4.raw", "wb");
		FILE *opll5 = fopen("opll5.raw", "wb");
		FILE *opll6 = fopen("opll6.raw", "wb");
		FILE *opll7 = fopen("opll7.raw", "wb");
		FILE *opll8 = fopen("opll8.raw", "wb");
		FILE *opll9 = fopen("opll9.raw", "wb");
		FILE *opll10 = fopen("opll10.raw", "wb");
		FILE *opll11 = fopen("opll11.raw", "wb");
		FILE *opll12 = fopen("opll12.raw", "wb");
		FILE *opll13 = fopen("opll13.raw", "wb");
		FILE *opll14 = fopen("opll14.raw", "wb");
		
		KSSPLAY_PER_CH_OUT ch_out[opt.rate]; // an array of structs. each KSSPLAY_PER_CH_OUT struct contains *one* sample for each channel.
		int16_t wavebuf[opt.rate];
		
		int i, t;
		
		for (t = 0; t < opt.play_time; t++) {
			if (t % 20 == 0)
				printf("%03d/%03d\n", t/* + 1*/, opt.play_time);

			KSSPLAY_calc_per_ch(kssplay, ch_out, opt.rate);
			// wave data might be big endian
			
			// PSG
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].psg[0];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, psg0);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].psg[1];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, psg1);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].psg[2];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, psg2);
			
			// SCC
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].scc[0];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, scc0);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].scc[1];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, scc1);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].scc[2];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, scc2);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].scc[3];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, scc3);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].scc[4];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, scc4);
			
			// OPLL
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[0];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll0);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[1];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll1);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[2];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll2);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[3];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll3);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[4];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll4);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[5];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll5);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[6];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll6);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[7];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll7);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[8];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll8);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[9];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll9);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[10];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll10);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[11];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll11);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[12];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll12);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[13];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll13);
			for (i = 0; i < opt.rate; i++) {
				wavebuf[i]=ch_out[i].opll[14];
			}
			fwrite(wavebuf, sizeof(int16_t), opt.rate, opll14);

			/* If the play is stopped, break */
			if (KSSPLAY_get_stop_flag(kssplay)) {
				printf("stop flag detected.\n");
				break;
			}
		}
		printf("%03d/%03d\n", opt.play_time, opt.play_time); // looks nice
		printf("Loop ended. closing output files...\n");
		fclose(psg0);
		printf("psg0 closed.\n");
		fclose(psg1);
		printf("psg1 closed.\n");
		fclose(psg2);
		printf("psg2 closed.\n");
		fclose(scc0);
		printf("scc0 closed.\n");
		fclose(scc1);
		printf("scc1 closed.\n");
		fclose(scc2);
		printf("scc2 closed.\n");
		fclose(scc3);
		printf("scc3 closed.\n");
		fclose(scc4);
		printf("scc4 closed.\n");
		fclose(opll0); 
		printf("opll0 closed.\n");
		fclose(opll1); 
		printf("opll1 closed.\n");
		fclose(opll2); 
		printf("opll2 closed.\n");
		fclose(opll3); 
		printf("opll3 closed.\n");
		fclose(opll4); 
		printf("opll4 closed.\n");
		fclose(opll5); 
		printf("opll5 closed.\n");
		fclose(opll6); 
		printf("opll6 closed.\n");
		fclose(opll7); 
		printf("opll7 closed.\n");
		fclose(opll8); 
		printf("opll8 closed.\n");
		fclose(opll9); 
		printf("opll9 closed.\n");
		fclose(opll10);
		printf("opll10 closed.\n");
		fclose(opll11);
		printf("opll11 closed.\n");
		fclose(opll12);
		printf("opll12 closed.\n");
		fclose(opll13);
		printf("opll13 closed.\n");
		fclose(opll14);
		printf("opll14 closed.\n");
	}

  //free(wavebuf);

  KSSPLAY_delete(kssplay);
  KSS_delete(kss);
	// signed 16 bit, little endian, 1 channel (mono) (if mono), 44100 sample rate
  return 0;
}
