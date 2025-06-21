import React, { useState, FormEvent } from 'react';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [quality, setQuality] = useState<number>(720);
  const [startTime, setStartTime] = useState<string>('00:00:00');
  const [duration, setDuration] = useState<number>(10);
  const [mode, setMode] = useState<'copy' | 'reencode'>('copy');
  const [crf, setCrf] = useState<number>(0);
  const [preset, setPreset] = useState<string>('veryslow');
  const [loading, setLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url) { setError('Please enter a valid URL'); return; }
    setLoading(true);
    setError(null);
    setVideoUrl(null);
    try {
      const payload = { url, quality, startTime, duration, reencode: mode === 'reencode', crf: mode === 'reencode' ? crf : undefined, preset: mode === 'reencode' ? preset : undefined };
      const res = await fetch('http://localhost:3000/api/clip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const text = await res.text();
        let msg;
        try { msg = JSON.parse(text).error; } catch { msg = text || res.statusText; }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `clip-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setVideoUrl(downloadUrl);
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          🚀 YouTube Clipper Pro
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">Video URL</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtu.be/..."
              required
              className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="quality" className="block text-sm font-medium text-gray-700">Quality (p)</label>
              <input
                id="quality"
                type="number"
                value={quality}
                onChange={e => setQuality(+e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                id="startTime"
                type="text"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                placeholder="HH:MM:SS"
                className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration (s)</label>
              <input
                id="duration"
                type="number"
                value={duration}
                onChange={e => setDuration(+e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-base font-medium text-gray-700">Mode Selection</legend>
            <div className="flex items-center gap-6">
              {['copy', 'reencode'].map(m => (
                <label key={m} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m as any}
                    onChange={() => setMode(m as any)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{m === 'copy' ? 'Copy (Lossless)' : 'Re-encode'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === 'reencode' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="crf" className="block text-sm font-medium text-gray-700">CRF (0=lossless)</label>
                <input
                  id="crf"
                  type="number"
                  min={0}
                  max={51}
                  value={crf}
                  onChange={e => setCrf(+e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="preset" className="block text-sm font-medium text-gray-700">Preset</label>
                <select
                  id="preset"
                  value={preset}
                  onChange={e => setPreset(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower','veryslow'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 text-lg font-semibold rounded-lg text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors duration-200`}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              'Create My Clip'
            )}
          </button>
        </form>

        {videoUrl && (
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Your Clip is Ready!</h2>
            <video src={videoUrl} controls className="mx-auto rounded-lg shadow-lg max-w-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
