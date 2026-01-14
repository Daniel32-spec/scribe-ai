const worker = new Worker('./worker.js', { type: 'module' });
let wavesurfer;

// Initialize Wavesurfer
wavesurfer = WaveSurfer.create({
    container: '#waveform-display',
    waveColor: '#4e4e4e',
    progressColor: '#2563eb',
    height: 80,
    responsive: true
});

// File Upload & Decode
document.getElementById('audio-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    updateStatus("Reading File...", "orange");
    wavesurfer.load(URL.createObjectURL(file));

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const buffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(buffer);
    
    worker.postMessage({ audio: decoded.getChannelData(0) });
};

// Listen for AI Progress
worker.onmessage = (e) => {
    const { type, data, progress } = e.data;

    if (type === 'progress') {
        document.getElementById('progress-bar').style.width = progress + '%';
        updateStatus(`Transcribing... ${Math.round(progress)}%`, "orange");
    }

    if (type === 'complete') {
        updateStatus("Complete", "green");
        generateDialogueHTML(data.chunks);
    }
};

function generateDialogueHTML(chunks) {
    const container = document.getElementById('dialogue-container');
    container.innerHTML = ""; // Clear hints

    chunks.forEach((chunk, index) => {
        // Logic to alternate speakers or allow manual tagging
        let speaker = (index % 2 === 0) ? "Interviewer" : "Respondent";
        
        const segment = document.createElement('div');
        segment.className = "transcript-row";
        segment.innerHTML = `
            <div class="speaker-tag" contenteditable="false">${speaker}:</div>
            <div class="text-block" data-start="${chunk.timestamp[0]}">${chunk.text}</div>
        `;
        container.appendChild(segment);
    });
}

// WORD EXPORT (.DOCX) - Professional Format
document.getElementById('export-docx').onclick = () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

    const fileCode = document.getElementById('meta-code').value;
    const project = document.getElementById('meta-project').value;
    const content = document.getElementById('dialogue-container').innerText;

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: fileCode, heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ text: `Project: ${project}`, heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }),
                new Paragraph({ text: "__________________________________________________", spacing: { after: 300 } }),
                new Paragraph({
                    children: [new TextRun(content)],
                }),
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => saveAs(blob, `${fileCode}.docx`));
};

function updateStatus(msg, color) {
    document.getElementById('status-msg').innerText = msg;
    document.getElementById('status-bulb').style.backgroundColor = color;
}

document.getElementById('btn-play').onclick = () => wavesurfer.playPause();
