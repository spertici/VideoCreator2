import { useState, FormEvent, useEffect } from 'react';
import { generateVideo, VideoGenerationResponse } from '../lib/api';

// URL del nostro server proxy locale
const PROXY_URL = 'http://localhost:3001/api';

interface VideoFormData {
  width: number;
  height: number;
  duration: number;
  description: string;
}

export default function VideoForm() {
  const [formData, setFormData] = useState<VideoFormData>({
    width: 1920,
    height: 1080,
    duration: 30,
    description: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setStatus('Inizializzazione...');
    setProgress(5);

    try {
      setStatus('Invio richiesta al server...');
      setProgress(10);
      const response = await generateVideo(formData);
      
      if (response.status === 'failed') {
        throw new Error(response.error || 'Failed to generate video');
      }

      setStatus('Video in generazione...');
      setProgress(20);
      
      // Poll for video completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await checkVideoStatus(response.id);
          setStatus(`Stato: ${status.status}`);
          
          // Aggiorna la barra di progresso in base allo stato
          if (status.status === 'starting') {
            setProgress(30);
          } else if (status.status === 'processing') {
            // Incrementa gradualmente il progresso durante l'elaborazione
            setProgress(prev => Math.min(prev + 1, 90));
          }
          
          if (status.status === 'succeeded' && status.output) {
            clearInterval(pollInterval);
            setVideoUrl(status.output);
            setIsLoading(false);
            setStatus('Video generato con successo!');
            setProgress(100);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setError(status.error || 'Failed to generate video');
            setIsLoading(false);
            setStatus('Generazione fallita');
            setProgress(0);
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError(err instanceof Error ? err.message : 'Error checking video status');
          setIsLoading(false);
          setStatus('Errore durante il controllo dello stato');
          setProgress(0);
        }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      setStatus('Errore durante la generazione');
      setProgress(0);
    }
  };

  const checkVideoStatus = async (id: string): Promise<VideoGenerationResponse> => {
    const response = await fetch(`${PROXY_URL}/check-status/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }
    
    return response.json();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Create Soccer Team Video</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Video Width (pixels)</label>
        <input
          type="number"
          value={formData.width}
          onChange={(e) => setFormData({...formData, width: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
          min="480"
          max="3840"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Video Height (pixels)</label>
        <input
          type="number"
          value={formData.height}
          onChange={(e) => setFormData({...formData, height: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
          min="360"
          max="2160"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Duration (seconds)</label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
          className="w-full p-2 border rounded"
          min="5"
          max="300"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Video Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full p-2 border rounded"
          rows={4}
          required
          placeholder="Describe what you want in the video (e.g., team highlights, match footage, celebrations)"
        />
      </div>

      {isLoading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-center text-sm text-blue-600 font-medium">
            {progress}% completato
          </div>
        </div>
      )}

      {status && (
        <div className={`text-sm p-3 rounded ${
          isLoading 
            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
            : error 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <strong>Stato:</strong> {status}
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm p-3 bg-red-50 rounded border border-red-200">
          <strong>Errore:</strong> {error}
        </div>
      )}

      {videoUrl && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Video generato:</h3>
          <video
            src={videoUrl}
            controls
            className="w-full rounded-lg shadow-lg"
          />
          <a 
            href={videoUrl} 
            download="soccer-team-video.mp4" 
            className="mt-2 inline-block bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
          >
            Scarica Video
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded transition-colors ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Generating Video...' : 'Generate Video'}
      </button>
    </form>
  );
} 