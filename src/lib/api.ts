import axios from 'axios';

// URL del nostro server proxy locale
const PROXY_URL = 'http://localhost:3001/api';

export interface VideoGenerationRequest {
  width: number;
  height: number;
  duration: number;
  description: string;
}

export interface VideoGenerationResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
  output: string | null;
  error: string | null;
}

export async function generateVideo(data: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    console.log('Sending request to local proxy server...');
    const response = await axios.post(
      `${PROXY_URL}/generate-video`,
      data
    );

    console.log('Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error generating video:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Il server ha risposto con un codice di stato non 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        throw new Error(`API error: ${error.response.data?.error || error.message}`);
      } else if (error.request) {
        // La richiesta è stata fatta ma non è stata ricevuta una risposta
        console.error('No response received:', error.request);
        throw new Error('Network error: No response from server. Please check your internet connection.');
      } else {
        // Si è verificato un errore durante l'impostazione della richiesta
        console.error('Request setup error:', error.message);
        throw new Error(`Request error: ${error.message}`);
      }
    } else {
      throw error;
    }
  }
} 