const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Carica le variabili d'ambiente dal file .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Abilita CORS per tutte le origini
app.use(cors());

// Middleware per il parsing del body JSON
app.use(express.json());

// Middleware per il logging delle richieste
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const MODEL_VERSION = "stability-ai/stable-video-diffusion:3d94c345dce0-svd-ddpm-xt";

// Rotte per il proxy delle API di Replicate
app.post('/api/generate-video', async (req, res) => {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY;
    const API_URL = 'https://api.replicate.com/v1/predictions';

    // Rimuovi le virgolette se presenti nell'API key
    const cleanApiKey = API_KEY.replace(/["']/g, '');

    // Test della connessione con Replicate
    try {
      console.log('Testing connection to Replicate API...');
      const testResponse = await axios.get('https://api.replicate.com/v1/models', {
        headers: {
          'Authorization': `Token ${cleanApiKey}`,
        }
      });
      console.log('Successfully connected to Replicate API');
    } catch (error) {
      console.error('Failed to connect to Replicate API:', error.message);
      if (error.response?.status === 401) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      return res.status(500).json({ error: 'Failed to connect to Replicate API' });
    }

    // Validazione dei dati in ingresso
    const { width, height, duration, description } = req.body;
    
    console.log('Received request with data:', {
      width,
      height,
      duration,
      description
    });

    if (!width || !height || !duration || !description) {
      console.error('Missing required fields:', { width, height, duration, description });
      return res.status(422).json({ error: 'Missing required fields' });
    }

    const requestBody = {
      version: MODEL_VERSION,
      input: {
        prompt: description,
        negative_prompt: "blurry, low quality, distorted, deformed",
        num_frames: 14,
        width: parseInt(width),
        height: parseInt(height),
        fps: 7,
        num_inference_steps: 25,
        min_guidance_scale: 1,
        max_guidance_scale: 7.5,
        motion_bucket_id: 127,
        seed: Math.floor(Math.random() * 1000000)
      }
    };

    console.log('Sending request to Replicate API with body:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(
      API_URL,
      requestBody,
      {
        headers: {
          'Authorization': `Token ${cleanApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000 // 30 secondi di timeout
      }
    );

    console.log('Response received:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Error generating video:', error);
    
    if (error.response) {
      // Il server ha risposto con un codice di stato non 2xx
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers, null, 2));
      res.status(error.response.status).json({ 
        error: `API error: ${error.response.data?.error || error.message}` 
      });
    } else if (error.request) {
      // La richiesta è stata fatta ma non è stata ricevuta una risposta
      console.error('No response received:', error.request);
      res.status(500).json({ 
        error: 'Network error: No response from server. Please check your internet connection and API key.' 
      });
    } else {
      // Si è verificato un errore durante l'impostazione della richiesta
      console.error('Request setup error:', error.message);
      res.status(500).json({ 
        error: `Request error: ${error.message}` 
      });
    }
  }
});

// Rotte per il controllo dello stato del video
app.get('/api/check-status/:id', async (req, res) => {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY;
    const id = req.params.id;

    if (!API_KEY) {
      console.error('API key is missing');
      return res.status(500).json({ error: 'API key is missing' });
    }

    console.log(`Checking status for prediction ID: ${id}`);
    
    const response = await axios.get(
      `https://api.replicate.com/v1/predictions/${id}`,
      {
        headers: {
          'Authorization': `Token ${API_KEY}`,
        }
      }
    );

    console.log(`Status for ${id}:`, JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error(`Error checking status for ${req.params.id}:`, error);
    
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
      res.status(error.response.status).json({ 
        error: `API error: ${error.response.data?.error || error.message}` 
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
      res.status(500).json({ 
        error: 'Network error: No response from server.' 
      });
    } else {
      console.error('Request setup error:', error.message);
      res.status(500).json({ 
        error: `Request error: ${error.message}` 
      });
    }
  }
});

// Servi i file statici dalla cartella out (dopo il build)
app.use(express.static(path.join(__dirname, 'out')));

// Avvia il server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`API Key present: ${!!process.env.NEXT_PUBLIC_AI_API_KEY}`);
}); 