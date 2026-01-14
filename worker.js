import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

env.allowLocalModels = false;
let transcriber = null;

self.onmessage = async (e) => {
    const { audio } = e.data;

    try {
        if (!transcriber) {
            self.postMessage({ type: 'status', message: 'Downloading AI Model (approx. 150MB)...' });
            // Using whisper-base for better SL language recognition
            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
                progress_callback: (p) => {
                    if (p.status === 'progress') self.postMessage({ type: 'progress', data: p.progress });
                }
            });
        }

        self.postMessage({ type: 'status', message: 'Translating Audio to English...' });

        const result = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            task: 'translate', // Translates Krio/Mende/Temne to English
            return_timestamps: true,
        });

        self.postMessage({ type: 'complete', data: result });

    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    }
};
