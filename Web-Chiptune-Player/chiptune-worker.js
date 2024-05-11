try {importScripts("Web-PSF-Player/Web-PSF-Player.js");} catch (error) {console.warn('no WebPSFplayer, '+error);}
try {importScripts("Web-SPC-Player/Web-SPC-Player.js");} catch (error) {console.warn('no WebSPCplayer, '+error);}
try {importScripts("Web-VGM-Player/Web-VGM-Player.js");} catch (error) {console.warn('no WebVGMplayer, '+error);}
try {importScripts("sox/sox.js");} catch (error) {console.warn('no SOXModule, '+error);}
importScripts("web-chiptune-functions.js");

onmessage = async function(e) {
	console.log('message received from main.')
	if (e.data[0]=='runCModule') {
		const rawOutput=await runCModule(...e.data[1], false, true);
		console.log('posting message to main.')
		postMessage(rawOutput);
	}
}