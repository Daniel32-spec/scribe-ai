const worker = new Worker('./worker.js', { type: 'module' });
let wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#d1d5db',
    progressColor: '#3b82f6',
    height: 80,
    barWidth: 2
});

// File Upload Handler
document.getElementById('audio-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('project-id').value = file.name.replace(/\.[^/.]+$/, "");
    wavesurfer.load(URL.createObjectURL(file));

    // Prepare audio for AI (Standard 16khz Mono)
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const buffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(buffer);
    
    worker.postMessage({ audio: decoded.getChannelData(0) });
};

// Handle Messages from AI
worker.onmessage = (e) => {
    const { type, message, data } = e.data;

    if (type === 'status') document.getElementById('ai-status').innerText = message;
    if (type === 'progress') document.getElementById('ai-progress').style.width = data + '%';
    
    if (type === 'complete') {
        document.getElementById('ai-status').innerText = "Translation Complete";
        renderTranscript(data.chunks);
    }
};

function renderTranscript(chunks) {
    const container = document.getElementById('transcript-output');
    const s1 = document.getElementById('s1-label').value;
    const s2 = document.getElementById('s2-label').value;
    container.innerHTML = ""; // Clear placeholder

    chunks.forEach((chunk, i) => {
        const row = document.createElement('div');
        row.className = "transcript-row";
        const speaker = (i % 2 === 0) ? s1 : s2;
        
        row.innerHTML = `
            <div class="speaker-tag">${speaker}</div>
            <div class="text-content" data-start="${chunk.timestamp[0]}">${chunk.text}</div>
        `;
        container.appendChild(row);
    });
}

// Professional Word (.docx) Export
document.getElementById('export-word').onclick = () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;
    const pid = document.getElementById('project-id').value;
    const client = document.getElementById('client-name').value;
    const rows = document.querySelectorAll('.transcript-row');

    const children = [
        new Paragraph({ text: `TRANSCRIPTION: ${pid}`, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `CLIENT: ${client}`, spacing: { after: 400 } }),
    ];

    rows.forEach(row => {
        children.push(new Paragraph({
            children: [
                new TextRun({ text: row.querySelector('.speaker-tag').innerText + ": ", bold: true }),
                new TextRun(row.querySelector('.text-content').innerText)
            ],
            spacing: { after: 200 }
        }));
    });

    const doc = new Document({ sections: [{ children }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, `${pid}_Transcript.docx`));
};

document.getElementById('play-pause').onclick = () => wavesurfer.playPause();
