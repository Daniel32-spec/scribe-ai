import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

// Skip local check to download from HuggingFace
env.allowLocalModels = false;

let transcriber = null;

self.onmessage = async (e) => {
    const { audio } = e.data;

    try {
        if (!transcriber) {
            self.postMessage({ type: 'status', message: 'Loading AI Model...' });
            transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                progress_callback: (p) => {
                    if (p.status === 'progress') {
                        self.postMessage({ type: 'progress', data: p.progress });
                    }
                }
            });
        }

        self.postMessage({ type: 'status', message: 'Transcribing Audio...' });

        const output = await transcriber(audio, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true,
        });

        self.postMessage({ type: 'result', data: output });

    } catch (err) {
        self.postMessage({ type: 'status', message: `Error: ${err.message}` });
    }
};
