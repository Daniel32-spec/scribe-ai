import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

env.allowLocalModels = false;
let transcriber = null;

self.onmessage = async (e) => {
    const { audio } = e.data;

    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
            progress_callback: (p) => {
                if (p.status === 'progress') self.postMessage({ type: 'progress', progress: p.progress });
            }
        });
    }

    const output = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        language: 'english', // Use 'english' for Sierra Leonean official transcripts
        task: 'transcribe'
    });

    self.postMessage({ type: 'complete', data: output });
};
