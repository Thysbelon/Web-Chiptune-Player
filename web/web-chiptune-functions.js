async function fetchChiptune(url) {
	const response = await fetch(url);
  const chiptune = await response.arrayBuffer();
	return chiptune;
}

const cModuleIndex={
	WebSPCplayer: WebSPCplayer ? WebSPCplayer : undefined,
	WebVGMplayer: WebVGMplayer ? WebVGMplayer : undefined,
	WebPSFplayer: WebPSFplayer ? WebPSFplayer : undefined,
	WebGSFplayer: WebGSFplayer ? WebGSFplayer : undefined,
	SOXModule: SOXModule ? SOXModule : undefined,
}

// input functions for array.prototype.filter()
function isEvenIndex(element, index, array) {
	return Number.isInteger(index/2);
}
function isOddIndex(element, index, array) {
	return !Number.isInteger(index/2);
}

function seekToLoopStart(e){ // an event handler that will be added to the 'timeupdate' event of <audio>s generated with makeChiptuneAudioElement. end event is too slow to fire. NOTE: This feature does not work how I intended. The looping is supposed to be seamless, but there is always a delay when seeking an <audio> element. Help with this would be appreciated.
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
]

//var previousLib; // idea to "make lib files persist" has been scrapped; because the browser should cache lib files.

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

the spc player *could* have a spc metadata reader added
to it to read spc length, but many spcs define length
as the length of two loops, with no intro length nor
fade length defined. trying to cut the length in half
is very likely to result in some spcs getting the song
cut off.
Also, the id6 format (spc metadata) is a mess; it can
be text or binary with no indication of which format is
being used.

psf player attempts to read the length from the
psf file, but the length is often two loops long.
psf does not define intro length, so this makes it
impossible to programmatically determine the length of a
single loop.

gsf player likely has the same problem as the psf player
TODO: add length limiter to gsf player
*/
// settings={renderLength/*milliseconds*/, introLength: 0, loops: 'infinite', fade: 0 /*no effect when loop is infinite*/, speed: 1 /*unaltered speed*/}
// TODO: add "panning" setting. This will allow the user to pan each voice of a mono chip. A common use case is taking the NES, which only outputs audio in mono, and panning Square 1 left and Square 2 right. The "panning" setting will not support stereo systems.
async function playChiptune(input/* can be a fileInput file or a url*/, settings) {
	await internal_playChiptune(input, settings, 'simplePlay');
}
async function downloadChiptune(input, settings) {
	await internal_playChiptune(input, settings, 'wav');
}
async function makeChiptuneAudioElement(input, settings) { // returns the created element as a DOM object.
	return await internal_playChiptune(input, settings, 'audioElem');
}
async function playChiptuneHandler(e){ // use this function as the "play" event handler for a dummy audio element to turn it into a chiptune player when the user hits play.
	// syntax of the data-chiptune attribute of a dummy audio element: data-chiptune="https://my-url/my-song.psf https://my-url/driver.psflib"
	// a dummy audio element should only contain urls as input. I don't think there's a use case for somehow allowing Files.
	// This will only run once for each dummy audio element
	console.log('running playChiptuneHandler');
	e.target.inert='inert';
	const input=e.target.dataset.chiptune.includes(' ') ? e.target.dataset.chiptune.split(' ') : e.target.dataset.chiptune
	console.log('input: '+input);
	const settings={};
	for (let setting of settingsList) {
		settings[setting]=e.target.dataset[setting.toLowerCase()] ? (parseInt(e.target.dataset[setting.toLowerCase()]) ? parseInt(e.target.dataset[setting.toLowerCase()]) : e.target.dataset[setting.toLowerCase()]) : undefined;
		console.log(e.target.dataset[setting.toLowerCase()])
		console.log('settings.'+setting+': '+typeof settings[setting]+' '+settings[setting])
	}
	const newAudioElem=await makeChiptuneAudioElement(input, settings)
	e.target.replaceWith(newAudioElem);
	console.log('dummy audio element replaced');
	newAudioElem.play()
}
async function internal_playChiptune(input/* can be a fileInput file, a url, or an array of either of these*/, settings, mode='simplePlay') {
	if (typeof input[0] == 'object' || Array.isArray(input)) {
		console.log('input is an array')
		var arrayBool=true;
		const tempArray=Array.from(input);
		console.log(tempArray);
		var chiptuneFiles=[];
		for (let i=0, l=tempArray.length; i<l; i++) {
			const fileBool=tempArray[i]?.name ? true : false;
			chiptuneFiles[i]={}
			chiptuneFiles[i].filename=fileBool ? tempArray[i].name : decodeURI(tempArray[i].replace(/.*\//, ''));
			chiptuneFiles[i].fileData=fileBool ? await tempArray[i].arrayBuffer() : await fetchChiptune(tempArray[i]);
		}
		var filename=chiptuneFiles.find(element => (!element.filename.match(/\....lib$/) )).filename;
	} else {
		console.log('input is not an array')
		const fileBool=input?.name ? true : false;
		var filename=fileBool ? input.name : decodeURI(input.replace(/.*\//, ''));
		var fileData=fileBool ? await input.arrayBuffer() : await fetchChiptune(input);
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
			cPlayerOutput=await playSPC(fileData, settings);
			break;
		case '.vgm':
		case '.vgz':
			console.error('vgm not yet implemented.'); throw new TypeError(); return;
			if (arrayBool){var fileData=chiptuneFiles[0].fileData}
			cPlayerOutput=await playVGM(fileData, settings);
			break;
		case '.psf':
			//console.log(chiptuneFiles);
			//console.log(arrayBool);
			cPlayerOutput=await playPSF(arrayBool ? chiptuneFiles : fileData, settings);
			break;
		case '.gsf':
			console.error('gsf not yet implemented.'); throw new TypeError(); return;
			cPlayerOutput=await playGSF(arrayBool ? chiptuneFiles : fileData, settings);
			break;
		case '.usf':
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
			console.error('kss (MSX) not supported. it might be supported in the future.'); throw new TypeError(); return;
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
		case '.nsf':
		case '.nsfe':
		case '.ay':
		case '.sap':
		case '.hes':
			console.error('This file type is not supported due to game_music_emu not being implemented yet.'); throw new TypeError(); return;
			break;
		default:
			console.error('unknown file type.'); throw new TypeError(); return;
	}
	switch (mode) { // do something with cPlayerOutput.
		case 'simplePlay':
			if (settings?.panning) {panningPlayMusic(cPlayerOutput, settings)} else {simplePlayMusic(cPlayerOutput, settings)} // uses the web audio api to play a single pcm file (with looping)
			break;
		case 'wav':
			if (settings?.panning) {panningDownloadMusic(cPlayerOutput, settings)} else {simpleDownloadMusic(filename, cPlayerOutput, settings)} // uses SOX to add a WAVE header to the PCM data. if the data is already WAVE (and program default lengths are being used) the file will be downloaded unaltered?
			break;
		case 'audioElem':
			return await cOutputToAudioElem(cPlayerOutput, settings);
	}
}

async function playSPC(fileData, settings){
	console.log('playing SPC file.');
	var renderLength=0, speed=100;
	if (settings?.renderLength) {
		renderLength=settings.renderLength;
	} else {
		console.warn('renderLength is not defined. SPC player cannot read length from file. Defaulting to 1 minute.');
		renderLength=60000;
	}
	if (settings?.speed) {speed=Math.round(settings.speed*100)} // convert float percentage to uint8 percentage
	var tempPCMdata=await runCModule([renderLength.toString(), speed.toString()], [{filename: 'input.spc', fileData: fileData}], [{filename: 'pcmOut.raw', encoding: 'binary'}], 'WebSPCplayer')
	tempPCMdata=tempPCMdata[0];
	tempPCMdata=new Int16Array(tempPCMdata.fileData.buffer)
	const spcOutput={pcmdata: tempPCMdata, sampleRate: 32000, stereo: true, renderLength: renderLength} // object contains pcmdata, info for web audio, etc, depending on the player.
	return spcOutput;
}
async function playVGM(fileData, settings){ // this should support panning. https://github.com/ValleyBell/libvgm/issues/80#issuecomment-976217329
// for players with panning support: if panning is on, pcmdata will be an array of pcm files.

}
async function playPSF(chiptuneFiles, settings){
	console.log('playing PSF file.');
	// TODO: edit main.c file to write the psf file's length and fade to a txt file. clean up main.c.
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
	const rawOutput=await runCModule(args, inputFiles, [{filename: 'psfPcmOut.raw', encoding: 'binary'}, {filename: 'info.txt', encoding:'utf8'}], 'WebPSFplayer');
	const psfOutput={sampleRate: 44100, stereo: true, renderLength: parseInt(rawOutput[1].fileData.split(', ')[0]), fade: parseInt(rawOutput[1].fileData.split(', ')[1])}
	var tempPCMdata=rawOutput[0];
	tempPCMdata=new Int16Array(tempPCMdata.fileData.buffer)
	psfOutput.pcmdata=tempPCMdata;
	return psfOutput;
}
async function playGSF(fileData, settings){

}
function runCModule(/*array*/ args, /*array*/ inputFiles, /*array*/ outputFiles, /*string*/moduleName){ // outputFiles example: [{filename: 'pcmOut.raw', encoding: 'binary'}]. inputFiles example: [{filename: 'input.spc', filedata: anArrayBuffer}, {filename: 'otherFile.txt', fileData: 'text content'}]
	const startTime=performance.now();
	return new Promise(function(resolve, reject) {
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
				console.log(moduleName+' performance: '+(performance.now() - startTime))
				resolve(toResolve);
			}
		}
		cModuleIndex[moduleName](module)
	})
}

async function simplePlayMusic(cPlayerOutput, settings, returnBuffer=false) { // this must be able to handle the output of every player.
	console.log('running simplePlayMusic.');
	const channelCount=cPlayerOutput.stereo ? 2 : 1;
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
	actx=returnBuffer ? new OfflineAudioContext({sampleRate: cPlayerOutput.sampleRate, numberOfChannels: channelCount, length: (0.1 + introLength + (renderLength-introLength) * loops + fade)*cPlayerOutput.sampleRate}) : new AudioContext({sampleRate: cPlayerOutput.sampleRate});

	var newPCMdata=Int16toFloat32(cPlayerOutput.pcmdata);
	if (cPlayerOutput.stereo) {newPCMdata=[newPCMdata.filter(isEvenIndex), newPCMdata.filter(isOddIndex)]};
	const audioBuffer= createAudioBufferAndFill(channelCount, renderLength*actx.sampleRate, newPCMdata, actx);
	const sourceNode= new AudioBufferSourceNode(actx, {loop: loops ? true : false, loopEnd: renderLength, loopStart: introLength, channelCount: channelCount})
	sourceNode.buffer=audioBuffer
	if (fade) {
		console.log('creating GainNode for fade... ('+fade+')');
		const fadeOut= new GainNode(actx, {channelCount: channelCount})
		sourceNode.connect(fadeOut)
		fadeOut.connect(actx.destination)
		fadeOut.gain.setValueCurveAtTime([1,0], actx.currentTime+0.1 + introLength + (renderLength-introLength) * loops, fade)
	} else {
		sourceNode.connect(actx.destination)
	}
	sourceNode.start(actx.currentTime+0.1)
	if (loops && loops != 'infinite') {console.log('setting end for sourceNode'); sourceNode.stop(actx.currentTime+0.1 + introLength + (renderLength-introLength) * loops + fade)}
	if (returnBuffer) {return await actx.startRendering()}
}

function createAudioBufferAndFill(numChannels, bufferLength, pcmdata, audioCtx) {
	const pcmdataBuffer=audioCtx.createBuffer(
		numChannels,
		bufferLength,
		audioCtx.sampleRate
	);
	if (numChannels===2) {
		for (let channel=0; channel<numChannels; channel++) {
			fillAudioBufferWithPCMData(pcmdataBuffer, pcmdata[channel], bufferLength, channel)
		}
	} else {
		fillAudioBufferWithPCMData(pcmdataBuffer, pcmdata, bufferLength, 0)
	}
	return pcmdataBuffer
}

function fillAudioBufferWithPCMData(pcmdataBuffer, pcmdata, bufferLength, channel) {
	const nowBuffering=pcmdataBuffer.getChannelData(channel)
	for (let i = 0; i < bufferLength; i++) {
		nowBuffering[i]=pcmdata[i]
	}
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