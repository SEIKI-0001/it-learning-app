// Gemini 3.8: transcript and delivery directions must be separate.
export function buildSpeechRequest(text, { voice, style }) {
  return {
    contents: [{ role: 'user', parts: [{ text, speech_metadata: { style } }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice } } },
  };
}

export function decodeSpeechAudio(response) {
  const audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
  if (!audio?.data) throw new Error('No audio in Gemini response');
  const data = Buffer.from(audio.data, 'base64');
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WAVE') return data;
  if (!/^audio\/L16\b/i.test(audio.mimeType ?? '')) throw new Error(`Unsupported audio format: ${audio.mimeType}`);
  const rate = Number(audio.mimeType.match(/rate=(\d+)/)?.[1]);
  if (!rate || data.length % 2) throw new Error('Invalid PCM audio');
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
