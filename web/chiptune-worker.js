ROOT_URL="https://cdn.jsdelivr.net/gh/Thysbelon/Web-Chiptune-Player@main/web/";
//ROOT_URL="http://localhost:8000/web/";

// TODO: only load emscripten js files as they are needed.
isWorker=true;
try {importScripts(ROOT_URL+"Web-PSF-Player/Web-PSF-Player.js");} catch (error) {console.warn('no WebPSFplayer, '+error);}
try {importScripts(ROOT_URL+"Web-SPC-Player/Web-SPC-Player.js");} catch (error) {console.warn('no WebSPCplayer, '+error);}
try {importScripts(ROOT_URL+"Web-VGM-Player/Web-VGM-Player.js");} catch (error) {console.warn('no WebVGMplayer, '+error);}
try {importScripts(ROOT_URL+"sox/sox.js");} catch (error) {console.warn('no SOXModule, '+error);}
importScripts(ROOT_URL+"web-chiptune-functions.js");

onmessage = async function(e) {
	console.log('message received from main.')
	if (e.data[0]=='runCModule') {
		const rawOutput=await runCModule(...e.data[1], false, true);
		console.log('posting message to main.')
		postMessage(rawOutput);
	}
}