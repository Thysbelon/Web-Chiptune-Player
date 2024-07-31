
\[Emscripten\] which is best for performance: compiling a command line program that uses the library, or compiling just the library and using its functions in JavaScript?

which is best for performance: compiling a simple command line program that uses the library and writes the output to a file that the JavaScript code reads, or compiling just the library and using the library functions in JavaScript?

I've seen both approaches used for emscripten-compiled programs, and I'm not sure which is better for performance. The first approach is simpler, so I thought it would perform better, but it might perform worse.

An example of the first approach, "compiling a simple command line program that uses the library and writes the output to a file that the JavaScript code reads", is [sox-emscripten](https://github.com/rameshvarun/sox-emscripten). Sox consists of both the command-line program sox and libsox. In my experience, sox-emscripten has good performance.

An example of the second approach, "compiling just the library and using the library functions in JavaScript", is [msxplay-js](https://github.com/digital-sound-antiques/msxplay-js). This program uses [libkss-js](https://github.com/digital-sound-antiques/libkss-js), which is itself an emscripten compiled version of the C library [libkss](https://github.com/digital-sound-antiques/libkss). msxplay-js has good performance.

I'm working on a web library that allows web developers to embed and play back many different chiptune music file formats in the browser (kss is a chiptune file format). My library accomplishes this by combining many different libraries.  
The C library libkss comes with a simple command line example program "kss2wav" that takes a kss file as input and outputs an audio file.  
I thought that compiling kss2wav with Emscripten would provide good performance while keeping the code simple, but my emscripten compilation of kss2wav has very poor performance.  
This is strange because msxplay-js, which uses the same libkss library, has good performance.  
I'm not sure what I'm doing wrong. I thought that maybe libkss-js was compiled in a different way than how I'm compiling libkss and kss2wav, but the only notable flags I see are -O3, -sFILESYSTEM=0, and -sALLOW_MEMORY_GROWTH=1; I've already tried -O3 and -sALLOW_MEMORY_GROWTH=1, and neither improve performance.  
Because there are no other difference between our programs, I'm wondering if "compiling just the library and using the library functions in JavaScript" is *much* more performant than "compiling a simple command line program that uses the library and writes the output to a file that the JavaScript code reads".