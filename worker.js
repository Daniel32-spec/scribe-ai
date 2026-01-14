import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

env.allowLocalModels = false;
let transcriber = null;

self.onmessage = async (e) => {
    const { audio } = e.data;

    try {
        if (!transcriber) {
            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
                progress_callback: (p) => {
                    if (p.status === 'progress') {
                        self.postMessage({ type: 'progress', progress: p.progress });
                    }
                }
            });
        }

        self.postMessage({ status: 'Translating Audio to English...' });

        const output = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            task: 'translate', // Translates SL dialects to English
            return_timestamps: true,
        });

        self.postMessage({ type: 'complete', data: output });

    } catch (err) {
        self.postMessage({ status: 'Error: ' + err.message });
    }
};
