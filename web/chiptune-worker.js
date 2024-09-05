console.log('worker alive.')
ROOT_URL="https://cdn.jsdelivr.net/gh/Thysbelon/Web-Chiptune-Player@latest/web/";
//ROOT_URL="http://localhost:8000/web/";

isWorker=true;
const moduleAndFilenameTable={
	WebSPCplayer: 'Web-SPC-Player/Web-SPC-Player.js',
	WebVGMplayer: 'Web-VGM-Player/Web-VGM-Player.js',
	WebPSFplayer: 'Web-PSF-Player/Web-PSF-Player.js',
	WebGSFplayer: 'Web-GSF-Player/gsf2wav.js',
	WebKSSplayer: 'Web-KSS-Player/kss2wav.js',
	SOXModule: 'sox/sox.js',
}
importScripts(ROOT_URL+"web-chiptune-functions.js");

onmessage = async function(e) {
	console.log('message received from main.')
	if (e.data[0]=='runCModule') {
		// currently, the worker is terminated after every run.
		let moduleName = e.data[1][3];
		console.time("worker_importing_c_module");
		try {importScripts(ROOT_URL+moduleAndFilenameTable[moduleName]);} catch (error) {console.error('no '+moduleName+', '+error); return}
		console.timeEnd("worker_importing_c_module");
		const rawOutput=await runCModule(...e.data[1], false, true);
		console.log('posting message to main.')
		postMessage(rawOutput);
	}
}
