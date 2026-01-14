import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

env.allowLocalModels = false;
let transcriber = null;

self.onmessage = async (e) => {
    const { audio } = e.data;

    if (!transcriber) {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
            progress_callback: (p) => {
                if (p.status === 'progress') self.postMessage({ type: 'progress', progress: p.progress });
            }
        });
    }

    self.postMessage({ status: 'Processing...' });
    const output = await transcriber(audio, {
        task: 'translate', 
        chunk_length_s: 30,
        return_timestamps: true
    });

    self.postMessage({ type: 'complete', data: output });
};
