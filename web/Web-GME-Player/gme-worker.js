ROOT_URL="https://cdn.jsdelivr.net/gh/Thysbelon/Web-Chiptune-Player@main/web/";
isWorker=true;
importScripts(ROOT_URL+"Web-GME-Player/Web-GME-Player.js");
importScripts(ROOT_URL+"web-chiptune-functions.js");

/*const*/ GMEdata={
	prevChiptuneFileName: null,
	prevFileBool: null,
	gmeModule: null,
	c_generatePCMfileAndReturnInfo: null,
}
// The GME Module is the only c module that persists after it calls main. This is because many of the file types that gme supports have multiple subtunes, and gme can play a different subtune while reusing its allocated memory.
// program order (with regards to gme):
// playChiptune is called
// is the file format one that gme supports? & is the file format one that supports subtunes?
// if yes: the values in GMEdata will be filled, the song will be played. GMEdata will persist
// (if no: gme will be run without filling GMEdata. any workers will be terminated. Emscripten modules will be ended.)
// The user calls playChiptune again
// is the file the same as last time? (the subtune can be different)
// if yes: reuse the values in GMEdata
// if no: delete the values in GMEdata to free memory

console.log('worker alive');
onmessage = async function(e) {
	console.log("Message received from main script");
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
	const [filename, fileBool, fileData, settings, diffEmu] = e.data;
	console.log(fileData);
	if (GMEdata.gmeModule==null) {
		GMEdata.gmeModule=await createGMEmodule();
		//GMEdata.gmeModule.FS.writeFile('/home/web_user/input', e.data[2]);
		GMEdata.gmeModule.FS.writeFile('/home/web_user/input', new Uint8Array(fileData));
		GMEdata.c_generatePCMfileAndReturnInfo=GMEdata.gmeModule.cwrap('generatePCMfileAndReturnInfo', 'string', ['number', 'number', 'boolean', 'boolean', 'boolean']);
		GMEdata.prevChiptuneFileName=filename;
		GMEdata.prevFileBool=fileBool;
	}
	// this worker will be terminated and recreated whenever a different file is being used.
	if (settings?.panning) {
		GMEdata.gmeModule.FS.writeFile('voices.txt', Object.keys(settings.panning).join('\n'));
	}
	var speed=settings?.speed ? settings.speed : 1;
	speed=Math.round(speed*100);
	console.time("GME_C_Timer");
	console.timeLog("GME_C_Timer", "Rendering PCM…");
	var info=GMEdata.c_generatePCMfileAndReturnInfo(settings?.track ? settings.track : 0, speed, diffEmu, settings?.panning ? true : false, false/*onceInPage*/);
	console.timeEnd("GME_C_Timer");
	info=info.split(', ');
	const gmeOutput={sampleRate: 44100}
	gmeOutput.renderLength=parseInt(info.shift());
	console.log('file renderLength: '+gmeOutput.renderLength);
	gmeOutput.introLength=parseInt(info.shift());
	
	if (settings?.panning) {
		gmeOutput.stereo=true;
		gmeOutput.pcmdata={};
		for (voice in settings.panning) {
			gmeOutput.pcmdata[voice]=(new Int16Array(GMEdata.gmeModule.FS.readFile(`/${voice}.raw`).buffer)).filter(isEvenIndex);
		}
		gmeOutput.pcmdata.theRest=(new Int16Array(GMEdata.gmeModule.FS.readFile(`/theRest.raw`).buffer)).filter(isEvenIndex);
	} else {
		gmeOutput.stereo=parseInt(info.shift()) ? true : false;
		var pcmUint8Array=GMEdata.gmeModule.FS.readFile('/pcmOut.raw')
		var pcmInt16Array=new Int16Array(pcmUint8Array.buffer)
		gmeOutput.pcmdata=gmeOutput.stereo ? pcmInt16Array : pcmInt16Array.filter(isEvenIndex)/* gme always renders 2 channel pcm, even when the system is mono. */
	}
	
	postMessage(gmeOutput);
};