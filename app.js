const worker = new Worker('./worker.js', { type: 'module' });
let wavesurfer;

wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#94a3b8',
    progressColor: '#6366f1',
    height: 50,
    barWidth: 3,
    barRadius: 3,
    cursorColor: '#6366f1',
});

document.getElementById('audio-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('project-name').value = file.name.replace(/\.[^/.]+$/, "");
    document.getElementById('file-size').innerText = (file.size / (1024*1024)).toFixed(1) + " MB";
    wavesurfer.load(URL.createObjectURL(file));
    
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const buffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(buffer);
    
    document.getElementById('engine-status').innerText = "Analyzing...";
    worker.postMessage({ audio: decoded.getChannelData(0) });
};

worker.onmessage = (e) => {
    const { type, data, progress, status } = e.data;
    
    if (status) document.getElementById('status-detail').innerText = status;
    if (type === 'progress') {
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('engine-status').innerText = "Transcribing...";
    }
    
    if (type === 'complete') {
        document.getElementById('engine-status').innerText = "Done";
        renderTranscript(data.chunks);
    }
};

function renderTranscript(chunks) {
    const editor = document.getElementById('transcript-editor');
    editor.innerHTML = ""; 
    
    chunks.forEach((chunk, i) => {
        const speaker = (i % 2 === 0) ? "Interviewer" : "Respondent";
        const div = document.createElement('div');
        div.className = "transcript-row";
        div.innerHTML = `
            <div class="speaker-name">${speaker}</div>
            <div class="chunk-text" data-start="${chunk.timestamp[0]}">${chunk.text}</div>
        `;
        editor.appendChild(div);
    });

    document.querySelectorAll('.chunk-text').forEach(el => {
        el.onclick = () => wavesurfer.setTime(parseFloat(el.dataset.start));
    });
}

document.getElementById('play-btn').onclick = () => wavesurfer.playPause();

document.getElementById('export-btn').onclick = () => {
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const blocks = document.querySelectorAll('.transcript-row');
    
    const docChildren = Array.from(blocks).map(b => {
        return new Paragraph({
            children: [
                new TextRun({ text: b.querySelector('.speaker-name').innerText + ": ", bold: true }),
                new TextRun(b.querySelector('.chunk-text').innerText),
            ],
            spacing: { after: 200 }
        });
    });

    const doc = new Document({ sections: [{ children: docChildren }] });
    Packer.toBlob(doc).then(blob => {
        saveAs(blob, document.getElementById('project-name').value + ".docx");
    });
};
