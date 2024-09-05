ROOT_URL="https://cdn.jsdelivr.net/gh/Thysbelon/Web-Chiptune-Player@latest/web/";
//ROOT_URL="http://localhost:8000/web/";
if (typeof isWorker == 'undefined') {isWorker=false};

// for CDNs.
if (isWorker==false) {
	var storedWorkers={chiptuneWorker:undefined, gmeWorker:undefined};
}

try {
	function addPlayEventsToAudioElems(){
		document.querySelectorAll("audio[data-chiptune]").forEach(element => element.addEventListener('play', playChiptuneHandler))
	}
	if (document.readyState === "loading") { // add events to all chiptune audio elements the moment this script is loaded in the main thread
		// Loading hasn't finished yet
		document.addEventListener("DOMContentLoaded", addPlayEventsToAudioElems);
	} else {
		// `DOMContentLoaded` has already fired
		addPlayEventsToAudioElems();
	}
} catch (error) {
	console.warn('could not add event listeners to audio elems, '+error);
}

async function fetchFile(url) {
	const response = await fetch(url);
  const myFile = await response.arrayBuffer();
	return myFile;
}

async function fetchChiptune(url) {
	return await fetchFile(url);
}

async function fetchWorker(url) {
	const response = await fetch(url);
  const myFile = await response.text();
	const myBase64 = btoa(myFile);
	return myBase64
}

const cModuleIndex={}
// TODO: turn these repetitive statements into an array of strings and a loop.
//try {cModuleIndex.WebSPCplayer = WebSPCplayer} catch (error) {console.warn('no WebSPCplayer, '+error); cModuleIndex.WebSPCplayer=undefined}
//try {cModuleIndex.WebVGMplayer = WebVGMplayer} catch (error) {console.warn('no WebVGMplayer, '+error); cModuleIndex.WebVGMplayer=undefined}
//try {cModuleIndex.WebPSFplayer = WebPSFplayer} catch (error) {console.warn('no WebPSFplayer, '+error); cModuleIndex.WebPSFplayer=undefined}
//try {cModuleIndex.WebGSFplayer = WebGSFplayer} catch (error) {console.warn('no WebGSFplayer, '+error); cModuleIndex.WebGSFplayer=undefined}
//try {cModuleIndex.SOXModule = SOXModule} catch (error) {console.warn('no SOXModule, '+error); cModuleIndex.SOXModule=undefined}

// input functions for array.prototype.filter()
function isEvenIndex(element, index, array) {
	return Number.isInteger(index/2);
}
function isOddIndex(element, index, array) {
	return !Number.isInteger(index/2);
}

function separateInterleavedInt16Array(inputArray) {
	const l=inputArray.length;
	const outputLeftArray=new Int16Array(l/2);
	const outputRightArray=new Int16Array(l/2);
	for (let i=0; i<l; i+=2) {
		outputLeftArray[i/2]=inputArray[i];
		outputRightArray[i/2]=inputArray[i+1];
	}
	return [outputLeftArray, outputRightArray]
}

function seekToLoopStart(e){ // an event handler that will be added to the 'timeupdate' event of infinitely looping <audio>s generated with makeChiptuneAudioElement, in order to loop the song. end event is too slow to fire. NOTE: This feature does not work how I intended. The looping is supposed to be seamless, but there is always a delay when seeking an <audio> element. Help with this would be appreciated.
// One idea I have to fix this is to play the infinitely looping chiptune using a web audio buffer, with the audio element just acting as controls for the audio buffer via many event handlers. Web audio buffers always loop their audio seamlessly.
	//console.log('timeupdate fired');
	if (e.target.currentTime<=e.target.duration && e.target.currentTime>=e.target.duration-0.3) {
		//console.log('seeking to loopStart...')
		//e.target.currentTime=parseInt(e.target.dataset.introLength)/1000 // currentTime takes seconds as input.
		e.target.fastSeek(parseInt(e.target.dataset.introLength)/1000) // fastSeek takes seconds as input.
		//e.target.play()
	}
}

function Int16toFloat32(/*Int16Array*/tempPCMdata){
	const newPCMdata=new Float32Array(tempPCMdata.length);
	for (let i=0, l=tempPCMdata.length; i<l; i++) {
		newPCMdata[i]=tempPCMdata[i]/0xFFFF
	}
	return newPCMdata;
}
function Float32toInt16(/*Float32Array*/tempPCMdata){
	const newPCMdata=new Int16Array(tempPCMdata.length);
	for (let i=0, l=tempPCMdata.length; i<l; i++) {
		newPCMdata[i]=tempPCMdata[i]*0xFFFF
	}
	return newPCMdata;
}
function interleaveLRsampleArrays(leftArray, rightArray){ // TODO: verify that this works correctly
	switch (leftArray.BYTES_PER_ELEMENT) {
		case 2:
			var newArray=new Int16Array(leftArray.length*2);
			break;
		case 4:
			var newArray=new Float32Array(leftArray.length*2);
	}
	for (let i=0, l=newArray.length; i<l; i+=2){
		newArray[i]=leftArray[i/2]
		newArray[i+1]=rightArray[i/2]
	}
	return newArray;
}

const settingsList=[
	'renderLength',
	'introLength',
	'loops',
	'fade',
	'speed',
	'vgmFCuseMAME'
]

/*const*/ var GMEdata={
	prevChiptuneFileName: null,
	prevFileBool: null,
	gmeWorker: null,
}

var currentlyPlayingWebAudioMusic=null; // TODO: make sure this variable doesn't get deleted.

//var previousLib; // idea to "make lib files persist" has been scrapped; because the browser should cache lib files.
function getFileBool(input, arrayBool){
	return (arrayBool ? input[0] : input)?.name ? true : false;
}
function getInputName(input, arrayBool, fileBool){
	if (arrayBool) {
		const tempArray=Array.from(input); // make sure FileList becomes an array, and gains all the methods of the Array object.
		return fileBool ? ( tempArray.find(element => (!element.name.match(/\....lib$/) )).name ) : ( decodeURI(tempArray.find(element => (!element.match(/\....lib$/) )).replace(/.*\//, '')) );
	} else {
		return fileBool ? input.name : decodeURI(input.replace(/.*\//, ''));
	}
}
async function prepareInput(input, arrayBool, fileBool){
	if (arrayBool) {
		const tempArray=Array.from(input); // make sure FileList becomes an array, and gains all the methods of the Array object.
		//console.log(tempArray);
		var chiptuneFiles=[];
		for (let i=0, l=tempArray.length; i<l; i++) {
			chiptuneFiles[i]={}
			chiptuneFiles[i].filename=fileBool ? tempArray[i].name : decodeURI(tempArray[i].replace(/.*\//, ''));
			chiptuneFiles[i].fileData=fileBool ? await tempArray[i].arrayBuffer() : await fetchChiptune(tempArray[i]);
		}
		return chiptuneFiles;
	} else {
		return fileBool ? await input.arrayBuffer() : await fetchChiptune(input);
	}
}
function isGMEchiptune(fileExt){
	switch (fileExt) {
		case '.gbs':
		case '.nsf':
		case '.nsfe':
		case '.ay':
		case '.sap':
		case '.hes':
			return true
			break;
		default:
			return false
	}
}

/*
parameter list (for c modules)
chiptune file: all players require this
speed: This will change both speed and pitch.
some players have a built-in "speed" option to change speed
*without* changing pitch. Because I do not know the
use case of this, I have omitted it for now.

spc: requires: renderLength (or else it will default to a minute). optional: speed
vgm: optional: speed, debugShortLength (vgm files always have the correct length and intro length specified in the file. There should be no need to allow the user of Web-Chiptune-Player to enter their own lengths)
psf: optional: renderLength
TODO: add length limiter to gsf player
*/
// settings={track: 0 /* some single chiptune files contain multiple tracks */, renderLength/*milliseconds*/, introLength: 0, loops: 'infinite', fade: 0 /*no effect when loop is infinite*/, speed: 1 /*unaltered speed*/}
// TODO: make sure none of the c files have a totalFrames calculation bug; use type casting to uint64.
async function playChiptune(input/* can be a fileInput file or a url*/, settings) {
	await stopCurrentlyPlayingMusic();
	await internal_playChiptune(input, settings, 'simplePlay');
}
async function downloadChiptune(input, settings) {
	await internal_playChiptune(input, settings, 'wav');
}
async function makeChiptuneAudioElement(input, settings) { // returns the created element as a DOM object.
	return await internal_playChiptune(input, settings, 'audioElem');
}
async function playChiptuneHandler(e){ // use this function as the "play" event handler for a dummy audio element to turn it into a chiptune player when the user hits play.
	// a dummy audio element should only contain urls as input. I don't think there's a use case for somehow allowing Files.
	// This will only run once for each dummy audio element
	console.log('running playChiptuneHandler');
	e.target.inert='inert';
	// Make sure the event listener is removed to avoid leaking memory.
	e.target.removeEventListener('play', playChiptuneHandler);
	e.target.removeEventListener('play', playChiptuneHandler, true);
	e.target.onplay=undefined;
	//const input=e.target.dataset.chiptune.includes(' ') ? e.target.dataset.chiptune.split(' ') : e.target.dataset.chiptune // assuming that every url input with a space is two urls is too dangerous.
	// to specify multiple URLs for .lib files, type an array into the data-chiptune field in JSON notation.
	let inputParsedAsJSON;
	try {
		inputParsedAsJSON=JSON.parse(e.target.dataset.chiptune);
	} catch (error) {
		console.info('input could not be parsed as JSON: '+error+'\nThis is likely because the input is not JSON');
	}
	const input=Array.isArray(inputParsedAsJSON) ? inputParsedAsJSON : e.target.dataset.chiptune
	console.log('input: '+input);
	const settings={};
	for (let setting of settingsList) {
		const tempSetting=e.target.dataset[setting.toLowerCase()] ? e.target.dataset[setting.toLowerCase()] : e.target.dataset[setting] // accept both data-introlength and data-intro-length
		if (tempSetting) {
			settings[setting]=parseInt(tempSetting) ? parseInt(tempSetting) : tempSetting
		}
		//settings[setting]=e.target.dataset[setting.toLowerCase()] ? (parseInt(e.target.dataset[setting.toLowerCase()]) ? parseInt(e.target.dataset[setting.toLowerCase()]) : e.target.dataset[setting.toLowerCase()]) : undefined;
		console.log(tempSetting)
		console.log('settings.'+setting+': '+typeof settings[setting]+' '+settings[setting])
	}
	settings.panning=e.target.dataset.panning ? JSON.parse(e.target.dataset.panning) : undefined;
	console.log(settings.panning);
	const newAudioElem=await makeChiptuneAudioElement(input, settings)
	// add some original attributes to the newAudioElem here
	newAudioElem.style=e.target.style.cssText;
	newAudioElem.controlsList=e.target.controlsList;
	newAudioElem.crossOrigin=e.target.crossOrigin;
	newAudioElem.disableRemotePlayback=e.target.disableRemotePlayback;
	e.target.replaceWith(newAudioElem);
	console.log('dummy audio element replaced');
	newAudioElem.play()
}
async function internal_playChiptune(input/* can be a fileInput file, a url, or an array of either of these*/, settings, mode='simplePlay') {
	var arrayBool=(typeof input[0] == 'object'/* a FileList is technically not an Array */ || Array.isArray(input));
	var fileBool=getFileBool(input, arrayBool);
	if (settings?.worker==false) {var workerBool=false} else {var workerBool=true} // workers will be used by default
	var filename=getInputName(input, arrayBool, fileBool);
	var fileExt=filename.match(/\.[^\.]+?$/)[0].toLowerCase();
	var diffEmu=true // gme only. diffEmu should be true *unless* the current song matches prevChiptuneFileName.
	var getFileDataBool=true;
	if (isGMEchiptune(fileExt) && GMEdata.prevChiptuneFileName != null) {
		console.log('There is a gmeModule in memory.');
		if (filename != GMEdata.prevChiptuneFileName || fileBool != GMEdata.prevFileBool) {
			console.log('The input is not the same as the one in memory.');
			// terminate worker
			GMEdata.gmeWorker.terminate();
			for (const property in GMEdata) {
				//console.log(`${property}: ${object[property]}`);
				GMEdata[property]=null;
			}
		} else {
			diffEmu=false
			getFileDataBool=false;
		}
	}
	if (getFileDataBool==true) {
		console.log('fetching / getting file data as an Array Buffer');
		if (arrayBool) {
			console.log('input is an array')
			var chiptuneFiles=await prepareInput(input, arrayBool, fileBool);
		} else {
			console.log('input is not an array')
			var fileData=await prepareInput(input, arrayBool, fileBool);
		}
	} else {
		console.log("no need to get file data; it's already in gmeModule's memory.");
		var arrayBool=false;
		var fileData=null;
	}
	var cPlayerOutput; // contains both pcmdata and the info returned by the player.
	switch (filename.match(/\.[^\.]+?$/)[0].toLowerCase()) {
		case '.snsf':
			console.error('snsf not supported. I would like to support it if there is a good library I can use.');
			break;
		case '.rsn':
			console.error('rsn not yet supported. I believe I just have to find an unrar library.');
			break;
		case '.spc':
			if (arrayBool){var fileData=chiptuneFiles[0].fileData}
			cPlayerOutput=await playSPC(fileData, settings, workerBool);
			break;
		case '.vgm':
		case '.vgz':
			if (settings?.renderLength || settings?.introLength) {
				console.warn('VGM files always contain an accurate renderLength and introLength in their metadata. User defined lengths will be discarded');
				settings.renderLength=undefined;
				settings.introLength=undefined;
				//console.info(settings.introLength+', '+settings.renderLength);
			}
			if (arrayBool){var fileData=chiptuneFiles[0].fileData}
			cPlayerOutput=await playVGM(fileData, settings, workerBool);
			break;
		case '.psf':
		case '.minipsf':
			//console.log(chiptuneFiles);
			//console.log(arrayBool);
			cPlayerOutput=await playPSF(arrayBool ? chiptuneFiles : fileData, settings, workerBool);
			break;
		case '.gsf':
		case '.minigsf':
			//console.error('gsf not yet implemented.'); throw new TypeError(); return;
			cPlayerOutput=await playGSF(arrayBool ? chiptuneFiles : fileData, settings, workerBool);
			break;
		case '.usf':
		case '.miniusf':
			console.error('usf (N64) file type not supported due to a stack overflow error I encountered with lazyusf2'); throw new TypeError(); return;
			break;
		case '.2sf':
			console.error('2sf (DS) not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.dsf':
			console.error('dsf (dreamcast) not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.ssf':
			console.error('ssf (saturn) not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.ssf':
			console.error('ssf not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.wsr':
			console.error('wsr (wonderswan) not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.sid':
			console.error('sid (Commodore 64) not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.kss':
			//console.error('kss (MSX) not supported. it might be supported in the future.'); throw new TypeError(); return;
			cPlayerOutput=await playKSS(fileData, settings, workerBool);
			break;
		case '.mdx':
			console.error('mdx (Sharp X68000) not supported. it might be supported in the future.'); throw new TypeError(); return;
			break;
		case '.fur':
			console.error('fur (Furnace Tracker module) not supported due to the difficulty of compiling a multi-threaded program for the web. You can see my attempt at https://github.com/Thysbelon/Web-Fur-Player'); throw new TypeError(); return;
			break;
		case '.xm':
		case '.it':
		case '.s3m':
		case '.mod':
			console.error('module file not supported due to libxmp not yet being implemented.'); throw new TypeError(); return;
			break;
		case '.chi':
		case '.dmm':
		case '.dst':
		case '.et1':
		case '.pdt':
		case '.sqd':
		case '.str':
			console.error('ZX Spectrum module file not supported due to ZXtune not being implemented.'); throw new TypeError(); return;
			break;
		case '.gbs':
		case '.hes':
			if (settings?.panning) {console.warn('panning is only for mono consoles. Removing user panning settings...'); /*throw new TypeError(); return*/ settings.panning=undefined}
		case '.nsf':
		case '.nsfe':
		case '.ay':
		case '.sap':
			/* all of these file formats also happen to be multitrack */
			if (settings?.worker===false) {console.error('The GME player can only be run as a worker.')}
			if (arrayBool){var fileData=chiptuneFiles[0].fileData}
			cPlayerOutput=await playGME(filename, fileBool, fileData, settings, diffEmu);
			break;
		default:
			console.error('unknown file type.'); throw new TypeError(); return;
	}
	switch (mode) { // do something with cPlayerOutput.
		case 'simplePlay':
			simplePlayMusic(cPlayerOutput, settings) // uses the web audio api to play a single pcm file (with looping)
			break;
		case 'wav':
			simpleDownloadMusic(filename, cPlayerOutput, settings) // uses SOX to add a WAVE header to the PCM data. if the data is already WAVE (and program default lengths are being used) the file will be downloaded unaltered?
			break;
		case 'audioElem':
			return await cOutputToAudioElem(cPlayerOutput, settings);
	}
}

async function playSPC(fileData, settings, workerBool){
	console.log('playing SPC file.');
	if (settings?.panning) {console.error('panning is only for mono consoles.')}
	var renderLength=0, speed=100;
	if (settings?.renderLength) {
		renderLength=settings.renderLength;
	} else {
		console.warn('renderLength is not defined. SPC player cannot read length from file. Defaulting to 1 minute.');
		renderLength=60000;
	}
	if (settings?.speed) {speed=Math.round(settings.speed*100)} // convert float percentage to uint8 percentage
	var tempPCMdata=await runCModule([renderLength.toString(), speed.toString()], [{filename: 'input.spc', fileData: fileData}], [{filename: 'pcmOut.raw', encoding: 'binary'}], 'WebSPCplayer', workerBool)
	tempPCMdata=tempPCMdata[0];
	tempPCMdata=new Int16Array(tempPCMdata.fileData.buffer)
	const spcOutput={pcmdata: tempPCMdata, sampleRate: 32000, stereo: true, renderLength: renderLength} // object contains pcmdata, info for web audio, etc, depending on the player.
	return spcOutput;
}
async function playKSS(fileData, settings, workerBool){
	if (settings?.panning) {console.error('Panning has not yet been implemented for KSS.')}
	const numChannels=1;
	// TODO: add option to choose high quality. Currently only using low quality
	var psgQuality=0, sccQuality=0, opllQuality=0;
	var renderLength=0;
	if (settings?.renderLength) {
		renderLength=settings.renderLength;
	} else {
		console.warn('renderLength is not defined. KSS player cannot read length from file. Defaulting to 2 minutes.');
		renderLength=120000;
	}
	// kss2wav only supports seconds. TODO?: rewrite kss2wav to support ms?
	const rawOutput=await runCModule(["-n"+numChannels, `-q${psgQuality}${sccQuality}${opllQuality}`, '-s'+(settings?.track ? settings.track : 0), "-p"+Math.ceil(renderLength/1000), "input.kss"], [{filename: 'input.kss', fileData: fileData}], [{filename: 'kssPcmOut.raw', encoding: 'binary'}], 'WebKSSplayer', workerBool);
	const pcmData=new Int16Array(rawOutput[0].fileData.buffer);
	const kssOutput={pcmdata: pcmData, sampleRate: 44100, stereo: false, renderLength: renderLength};
	return kssOutput;
}
async function playVGM(fileData, settings, workerBool){ // this should support panning. https://github.com/ValleyBell/libvgm/issues/80#issuecomment-976217329
	// TODO: add panning support. libvgm has built-in panning support. mmontag's fork of libvgm might be used as a guide.
	if (settings?.panning) {console.error('WebVGMplayer does not yet support panning. It is on the to-do list.')}
	const rawOutput=await runCModule(settings?.vgmFCuseMAME ? ['0','0','0','1'] : null, [{filename: 'input', fileData: fileData}], [{filename: 'vgmPcmOut.raw', encoding: 'binary'}, {filename: 'info.txt', encoding:'utf8'}], 'WebVGMplayer', workerBool);
	console.info('info.txt: '+rawOutput[1].fileData);
	const vgmInfo=rawOutput[1].fileData.split(', ').map(elem => parseInt(elem));
	//const pcmData=vgmInfo[0] ? new Int16Array(rawOutput[0].fileData.buffer) : (new Int16Array(rawOutput[0].fileData.buffer)).filter(isEvenIndex);
	const pcmData=new Int16Array(rawOutput[0].fileData.buffer);
	const vgmOutput={pcmdata: pcmData, sampleRate: 44100, stereo: vgmInfo[0] ? true : false, renderLength: vgmInfo[1], introLength: vgmInfo[2]}
	console.info('renderLength: '+vgmOutput.renderLength+' (raw: '+vgmInfo[1]+'), introLength: '+vgmOutput.introLength+' (raw: '+vgmInfo[2]+')');
	return vgmOutput;
}
async function playPSF(chiptuneFiles, settings, workerBool){
	if (settings?.panning) {console.error('panning is only for mono consoles.')}
	console.log('playing PSF file.');
	if (settings?.speed) {console.warn('"speed" is set, but the PSF player does not support the speed setting.')}
	const args=['input.psf'];
	if (settings?.renderLength) {
		args.push(settings.renderLength.toString());
	}
	var inputFiles=[];
	if (Array.isArray(chiptuneFiles)) {
		inputFiles=chiptuneFiles;
		const psfIndex=inputFiles.findIndex(element => (element.filename.match(/\.psf$/) || element.filename.match(/\.minipsf$/) ));
		inputFiles[psfIndex].filename='input.psf'; // TODO: make sure this doesn't cause issues with .minipsf files.
	} else {
		inputFiles=[{filename: 'input.psf', fileData: chiptuneFiles}]
	}
	console.log(inputFiles);
	const rawOutput=await runCModule(args, inputFiles, [{filename: 'psfPcmOut.raw', encoding: 'binary'}, {filename: 'info.txt', encoding:'utf8'}], 'WebPSFplayer', workerBool);
	const psfOutput={sampleRate: 44100, stereo: true, renderLength: parseInt(rawOutput[1].fileData.split(', ')[0]), fade: parseInt(rawOutput[1].fileData.split(', ')[1])}
	var tempPCMdata=rawOutput[0];
	tempPCMdata=new Int16Array(tempPCMdata.fileData.buffer)
	psfOutput.pcmdata=tempPCMdata;
	return psfOutput;
}
async function playGSF(chiptuneFiles, settings, workerBool){
	if (settings?.panning) {console.error('panning is only for mono consoles.')}
	console.info('playing GSF file.');
	if (settings?.speed) {console.warn('"speed" is set, but the GSF player does not support the speed setting.')}
	const args=['input.gsf'];
	if (settings?.renderLength) {
		args.push(settings.renderLength.toString());
	}
	var inputFiles=[];
	if (Array.isArray(chiptuneFiles)) {
		inputFiles=chiptuneFiles;
		const psfIndex=inputFiles.findIndex(element => (element.filename.match(/\.gsf$/) || element.filename.match(/\.minigsf$/) ));
		inputFiles[psfIndex].filename='input.gsf';
	} else {
		inputFiles=[{filename: 'input.gsf', fileData: chiptuneFiles}]
	}
	console.log(inputFiles);
	console.log(args)
	const rawOutput=await runCModule(args, inputFiles, [{filename: 'gsfPcmOut.raw', encoding: 'binary'}, {filename: 'info.txt', encoding:'utf8'}], 'WebGSFplayer', workerBool);
	const gsfOutput={sampleRate: 44100, stereo: true, renderLength: parseInt(rawOutput[1].fileData.split(', ')[0]), fade: parseInt(rawOutput[1].fileData.split(', ')[1])}
	var tempPCMdata=rawOutput[0];
	tempPCMdata=new Int16Array(tempPCMdata.fileData.buffer)
	gsfOutput.pcmdata=tempPCMdata;
	return gsfOutput;
}
async function playGME(filename, fileBool, fileData, settings, diffEmu){ // TO DO: onceInPage support?
	console.log('playing GME file.');
	if (GMEdata.prevChiptuneFileName==null) {
		console.log('GMEdata is null. writing...');
		GMEdata.prevChiptuneFileName=filename;
		GMEdata.prevFileBool=fileBool;
		if (storedWorkers.gmeWorker==undefined) {console.time("fetchGMEWorker"); storedWorkers.gmeWorker = await fetchWorker(ROOT_URL+"Web-GME-Player/gme-worker.js"); console.timeEnd("fetchGMEWorker");}
		GMEdata.gmeWorker=new Worker(`data:text/javascript;base64,${storedWorkers.gmeWorker}`);
	}
	console.log(GMEdata.prevChiptuneFileName);
	
	const gmeOutput=await runGMEworker(filename, fileBool, fileData, settings, diffEmu);
	
	if (settings?.panning) {
		const renderLength=( settings?.renderLength ? settings.renderLength : gmeOutput.renderLength ) / 1000;
		const actx=new OfflineAudioContext({sampleRate: gmeOutput.sampleRate, numberOfChannels: 2, length: renderLength*gmeOutput.sampleRate});
		const sourceNodeArray={};
		const pannerNodeArray={};
		for (voice in settings.panning) {
			const audioBuffer=new AudioBuffer({length: renderLength*actx.sampleRate, numberOfChannels: 1, sampleRate:actx.sampleRate});
			audioBuffer.copyToChannel(Int16toFloat32(gmeOutput.pcmdata[voice]), 0);
			sourceNodeArray[voice]=new AudioBufferSourceNode(actx, {loop: false, loopEnd: renderLength, channelCount: 1, buffer: audioBuffer});
			pannerNodeArray[voice]=new StereoPannerNode(actx, {pan:settings.panning[voice]});
			sourceNodeArray[voice].connect(pannerNodeArray[voice]);
			pannerNodeArray[voice].connect(actx.destination);
			sourceNodeArray[voice].start(0); // time shouldn't pass until I start rendering.
		}
		const audioBufferTheRest=new AudioBuffer({length: renderLength*actx.sampleRate, numberOfChannels: 1, sampleRate:actx.sampleRate});
		audioBufferTheRest.copyToChannel(Int16toFloat32( gmeOutput.pcmdata.theRest ), 0);
		sourceNodeTheRest=new AudioBufferSourceNode(actx, {loop: false, loopEnd: renderLength, channelCount: 1, buffer: audioBufferTheRest});
		sourceNodeTheRest.connect(actx.destination);
		sourceNodeTheRest.start(0); // time shouldn't pass until I start rendering.
		var newPCMdata = await actx.startRendering();
		gmeOutput.pcmdata=Float32toInt16(interleaveLRsampleArrays(newPCMdata.getChannelData(0), newPCMdata.getChannelData(1))) // whatever
	}
	//console.log('gmeOutput.stereo '+gmeOutput.stereo)

	return gmeOutput;
	
	function runGMEworker(filename, fileBool, fileData, settings, diffEmu) {
		return new Promise(function(resolve, reject) {
			GMEdata.gmeWorker.addEventListener('message', function(e){
				console.info("Message received from gmeWorker");
				//GMEdata.gmeWorker.terminate();
				resolve(e.data);
			}, {once:true});
			GMEdata.gmeWorker.postMessage([filename, fileBool, fileData, settings, diffEmu]);
		})
	}
}
function runCModule(/*array*/ args, /*array*/ inputFiles, /*array*/ outputFiles, /*string*/moduleName, /*boolean*/useWorker, /*boolean*/workerFileLoc){ // outputFiles example: [{filename: 'pcmOut.raw', encoding: 'binary'}]. inputFiles example: [{filename: 'input.spc', filedata: anArrayBuffer}, {filename: 'otherFile.txt', fileData: 'text content'}]
	if (useWorker) { // creates a worker from the main thread, then that worker runs runCModule.
		return new Promise(async/*appears to work fine*/ function(resolve, reject) {
			if (storedWorkers.chiptuneWorker==undefined) {console.time("fetchWorker"); storedWorkers.chiptuneWorker = await fetchWorker(ROOT_URL+"chiptune-worker.js"); console.timeEnd("fetchWorker");}
			const cModuleWorker=new Worker(`data:text/javascript;base64,${storedWorkers.chiptuneWorker}`);
			cModuleWorker.addEventListener('message', function(e){
				console.info("Message received from cModuleWorker");
				cModuleWorker.terminate();
				resolve(e.data);
			}, {once:true});
			cModuleWorker.postMessage(['runCModule', [args, inputFiles, outputFiles, moduleName]])
			
		})
	} else { // the code to run a c module. When this was first written, it functioned on both the main thread and a worker. Now, it may only function in a worker.
		console.time("runCModule");
		return new Promise(function(resolve, reject) {
			if (cModuleIndex?.[moduleName]==undefined) {
				if (self?.[moduleName]) {
					cModuleIndex[moduleName] = self[moduleName]
				} else {
					//console.warn('no '+moduleName);
					reject(new Error("Can't run a c module that can't be accessed ("+moduleName+")"));
				}
			}
			const module = {
				arguments: args,
				preRun: () => {
					for (let i of inputFiles) {
						module.FS.writeFile(i.filename, typeof i.fileData == 'string' ? i.fileData : new Uint8Array(i.fileData));
					}
				},
				postRun: () => {
					const toResolve=[];
					for (let i=0, l=outputFiles.length; i<l; i++) {
						toResolve[i]={filename: outputFiles[i].filename, fileData: module.FS.readFile(outputFiles[i].filename, {encoding: outputFiles[i].encoding})}; // encoding can be 'binary' or 'utf8'
					}
					console.timeEnd("runCModule");
					resolve(toResolve);
				}
			}
			if (workerFileLoc) {
				const WASM_ROOT_URL="https://cdn.jsdelivr.net/gh/Thysbelon/Web-Chiptune-Player@main/web/";
				// attempting to load wasm from localhost *always* results in a NetworkError. I don't know why. My workaround will be to test C Modules and JavaScript separately.
				// This NetworkError doesn't seem to affect Sox. It's likely because sox is being run on the main thread.
				module.locateFile=function(path, prefix){
					if (path.includes('gsf2wav')) {
						var wasmLoc = WASM_ROOT_URL + 'Web-GSF-Player/' + path;
					} else {
						var wasmLoc = WASM_ROOT_URL + path.replace('.wasm', '') + '/' + path;
					}
					console.log("wasmLoc: "+wasmLoc)
					return wasmLoc;
				}
			}
			console.timeLog("runCModule", "module ready to run.");
			cModuleIndex[moduleName](module)
		})
	}
}

async function stopCurrentlyPlayingMusic(){
	if (currentlyPlayingWebAudioMusic!=null) {await currentlyPlayingWebAudioMusic.close(); currentlyPlayingWebAudioMusic=null; console.log('stopped Web Audio music')}
}
async function simplePlayMusic(cPlayerOutput, settings, returnBuffer=false, inputAudioBuffer) { // this must be able to handle the output of every player.
	//if (returnBuffer==false) {stopCurrentlyPlayingMusic()};
	console.log('running simplePlayMusic.');
	console.log('sampleRate: '+cPlayerOutput.sampleRate);
	const channelCount=inputAudioBuffer ? inputAudioBuffer.numberOfChannels : (cPlayerOutput.stereo ? 2 : 1);
	const renderLength=( settings?.renderLength ? settings.renderLength : cPlayerOutput.renderLength ) / 1000; // cPlayerOutput.renderLength is usually the length read from the chiptune file.
	var introLength=0;
	var fade=0;
	var loops=settings?.loops;
	if (returnBuffer && loops=='infinite') {loops=2}
	if (loops && loops != 'infinite') {
		console.log('music has finite loops');
		if (settings?.fade) {
			fade=settings.fade/1000; // the time values in settings are in milliseconds. The Web Audio API takes time values in seconds.
		} else if (cPlayerOutput?.fade) {
			fade=cPlayerOutput.fade/1000;
		}
	}
	if (settings?.introLength) {
		introLength=settings.introLength / 1000;
	} else if (cPlayerOutput?.introLength) {
		introLength=cPlayerOutput.introLength / 1000; // I believe all the players return length in ms
	}
	const actx=returnBuffer ? new OfflineAudioContext({sampleRate: cPlayerOutput.sampleRate, numberOfChannels: channelCount, length: (0.1 + introLength + (renderLength-introLength) * loops + fade)*cPlayerOutput.sampleRate}) : new AudioContext({sampleRate: cPlayerOutput.sampleRate});
	if (returnBuffer==false) {currentlyPlayingWebAudioMusic=actx};
	if (inputAudioBuffer) {
		var audioBuffer=inputAudioBuffer;
	} else {
		console.time("copy_pcmdata_to_audio_buffer");
		var audioBuffer=actx.createBuffer(channelCount, renderLength*actx.sampleRate, actx.sampleRate);
		console.timeLog("copy_pcmdata_to_audio_buffer", "buffer created");
		if (cPlayerOutput.stereo) {
			// converting the samples to Float 32 takes unusually long (12 sec) when playing back a stereo song for 150000ms (2 min 30 sec)
			//var newPCMdata1=Int16toFloat32(cPlayerOutput.pcmdata.filter(isEvenIndex));
			//var newPCMdata2=Int16toFloat32(cPlayerOutput.pcmdata.filter(isOddIndex));
			var [newPCMdata1, newPCMdata2] = separateInterleavedInt16Array(cPlayerOutput.pcmdata);
			console.timeLog("copy_pcmdata_to_audio_buffer", "interleaved pcmdata separated");
			newPCMdata1=Int16toFloat32(newPCMdata1);
			console.timeLog("copy_pcmdata_to_audio_buffer", "left Int16toFloat32 finished");
			newPCMdata2=Int16toFloat32(newPCMdata2);
			console.timeLog("copy_pcmdata_to_audio_buffer", "right Int16toFloat32 finished");
			audioBuffer.copyToChannel(newPCMdata1, 0);
			console.timeLog("copy_pcmdata_to_audio_buffer", "left channel filled");
			audioBuffer.copyToChannel(newPCMdata2, 1);
			console.timeLog("copy_pcmdata_to_audio_buffer", "right channel filled");
		} else {
			var newPCMdata=Int16toFloat32(cPlayerOutput.pcmdata);
			audioBuffer.copyToChannel(newPCMdata, 0);
		}
		console.timeEnd("copy_pcmdata_to_audio_buffer");
	}
	const sourceNode= new AudioBufferSourceNode(actx, {loop: loops ? true : false, loopEnd: renderLength, loopStart: introLength, channelCount: channelCount})
	sourceNode.buffer=audioBuffer
	if (fade) {
		console.log('creating GainNode for fade... ('+fade+')');
		console.time("createFade");
		const fadeOut= new GainNode(actx, {channelCount: channelCount})
		sourceNode.connect(fadeOut)
		fadeOut.connect(actx.destination)
		fadeOut.gain.setValueCurveAtTime([1,0], actx.currentTime+0.1 + introLength + (renderLength-introLength) * loops, fade)
		console.timeEnd("createFade");
	} else {
		sourceNode.connect(actx.destination)
	}
	sourceNode.start(actx.currentTime+0.1)
	if (loops && loops != 'infinite') {console.log('setting end for sourceNode'); sourceNode.stop(actx.currentTime+0.1 + introLength + (renderLength-introLength) * loops + fade)}
	if (returnBuffer) {console.time("actx_render_buffer"); const bufferToReturn=await actx.startRendering(); console.timeEnd("actx_render_buffer"); return bufferToReturn}
}
async function simpleDownloadMusic(filename, cPlayerOutput, settings){
	if ((settings?.loops || settings?.fade) && settings?.loops!='infinite') {
		console.log('finite loops or a fade is set. rendering audio buffer...');
		var renderedAudioBuffer=await simplePlayMusic(cPlayerOutput, settings, true);
	} else {console.log('no finite loops or a fade was set: '+settings?.loops+', '+settings?.fade)}
	const wavFileDataURL=await createWavDataURL(renderedAudioBuffer ? interleaveLRsampleArrays(renderedAudioBuffer.getChannelData(0), renderedAudioBuffer.getChannelData(1)) : cPlayerOutput.pcmdata, cPlayerOutput, settings);

	const link = document.createElement('a')
	const url = wavFileDataURL

	link.href = url
	link.download = filename // the browser should automatically change the file extension to the correct one (wav).
	document.body.appendChild(link)
	link.click()

	document.body.removeChild(link)
	window.URL.revokeObjectURL(url)
}

async function cOutputToAudioElem(cPlayerOutput, settings){
	console.log('running cOutputToAudioElem');
	if ((settings?.loops || settings?.fade) && settings?.loops!='infinite') {
		console.log('finite loops or a fade is set. rendering audio buffer...');
		var renderedAudioBuffer=await simplePlayMusic(cPlayerOutput, settings, true);
	} else {console.log('no finite loops or a fade was set: '+settings?.loops+', '+settings?.fade)}
	const wavFileDataURL=await createWavDataURL(renderedAudioBuffer ? interleaveLRsampleArrays(renderedAudioBuffer.getChannelData(0), renderedAudioBuffer.getChannelData(1)) : cPlayerOutput.pcmdata, cPlayerOutput, settings);
	console.log('creating audio element...');
	var audioElem=document.createElement('audio');
	audioElem.controls='controls';
	audioElem.src=wavFileDataURL;
	if (settings?.loops=='infinite') {
		console.log('loops is infinite');
		if (settings?.introLength) {
			var introLength=settings.introLength;
		} else if (cPlayerOutput?.introLength) {
			var introLength=cPlayerOutput.introLength;
		}
		if (introLength) {
			console.log('setting introLength attribute and seekToLoopStart event handler...');
			audioElem.dataset.introLength=introLength;
			audioElem.addEventListener('timeupdate', seekToLoopStart);
		} else {
			console.log('setting loop attribute...');
			audioElem.loop='loop';
		}
	}
	console.log('returning audio element...');
	return audioElem;
}

// to use a web audio buffer as input:
// createWavDataURL(interleaveLRsampleArrays(myAudioBuffer.getChannelData(0), myAudioBuffer.getChannelData(1)))
async function createWavDataURL(pcmdata, cPlayerOutput, settings){
	console.log('running createWavDataURL. \ncPlayerOutput.sampleRate: '+typeof cPlayerOutput.sampleRate+' '+cPlayerOutput.sampleRate);
	var inputRawArgs;
	switch (pcmdata.BYTES_PER_ELEMENT) {
		case 2:
			inputRawArgs=['-t', 'raw', '-L', '-r', cPlayerOutput.sampleRate.toString(), '-e', 'signed-integer', '-b', '16', '-c', cPlayerOutput.stereo ? '2' : '1', 'input.raw', 'output.wav']
			break;
		case 4:
			inputRawArgs=['-t', 'raw', '-L', '-r', cPlayerOutput.sampleRate.toString(), '-e', 'floating-point', '-b', '32', '-c', cPlayerOutput.stereo ? '2' : '1', 'input.raw', 'output.wav']
	}
	const wavFile=await runCModule(inputRawArgs, [{filename: 'input.raw', fileData: pcmdata.buffer}], [{filename: 'output.wav', encoding:'binary'}], 'SOXModule')
	const wavFileDataURL=URL.createObjectURL( new Blob([wavFile[0].fileData.buffer], {type: 'audio/wav'}) );
	return wavFileDataURL
}
