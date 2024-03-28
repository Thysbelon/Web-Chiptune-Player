async function internal_spcplay(file, loopStart, loopEnd, speed=null) {
	console.log("internal_spcplay loopEnd: "+loopEnd)
	const fileArrBuf=await file.arrayBuffer()
	// getting length, intro length, and loop length from metadata is too unreliable. Most SPCs do not have intro nor loop length. The base id666 can be in either text or binary format, and there is no reliable way to programmatically determine which one it is.
	// To do: RSN support with pako
	if (speed==null) {speed=100}
	const module = {
		arguments: [loopEnd.toString(), speed.toString()], // arguments *must* be strings
		preRun: () => {
			module.FS.writeFile("input.spc", new Uint8Array(fileArrBuf));
		},
		postRun: () => {
			let output = module.FS.readFile("pcmOut.raw", {
				encoding: "binary",
			});
			download(new File([output], file.name+"-s16le-32000Hz-2ch-pcmOut.raw"))
		},
	};
	const start = performance.now()
	await WebSPCplayer(module);
	const end=performance.now()
	console.log("performance: "+(end-start))
}

function download(file) {
	const link = document.createElement('a')
	const url = URL.createObjectURL(file)
	
	link.href = url
	link.download = file.name
	document.body.appendChild(link)
	link.click()
	
	document.body.removeChild(link)
	window.URL.revokeObjectURL(url)
}