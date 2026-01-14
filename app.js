const worker = new Worker('./worker.js', { type: 'module' });
let wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#dcdcdc',
    progressColor: '#4285f4',
    height: 60,
    barWidth: 2
});

const audioInput = document.getElementById('audio-input');
const editorBox = document.getElementById('editor-box');

// Step 1: Handle Upload
document.getElementById('drop-zone').onclick = () => audioInput.click();
audioInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('file-name').innerText = file.name;
    wavesurfer.load(URL.createObjectURL(file));
};

// Step 2: Tap the Google Translate Icon
document.getElementById('translate-trigger').onclick = async () => {
    if (!audioInput.files[0]) {
        alert("Please upload an audio file first!");
        return;
    }

    document.getElementById('ai-status').innerText = "Transcribing...";
    editorBox.innerHTML = "<em>AI is thinking and translating Mende/Krio to English...</em>";

    // Prepare audio data
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await audioInput.files[0].arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    
    worker.postMessage({ audio: decoded.getChannelData(0) });
};

worker.onmessage = (e) => {
    const { type, data, status, progress } = e.data;
    if (status) document.getElementById('ai-status').innerText = status;
    if (progress) document.getElementById('progress-fill').style.width = progress + '%';
    
    if (type === 'complete') {
        document.getElementById('ai-status').innerText = "Done";
        // Convert the text chunks into dialogue
        editorBox.innerHTML = data.chunks.map((c, i) => `
            <p><strong>Speaker ${i%2==0?'A':'B'}:</strong> ${c.text}</p>
        `).join('');
    }
};

document.getElementById('play-pause').onclick = () => wavesurfer.playPause();

// Word Export
document.getElementById('export-docx').onclick = () => {
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const text = editorBox.innerText;
    const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(text)] })] }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, "Transcript.docx"));
};
