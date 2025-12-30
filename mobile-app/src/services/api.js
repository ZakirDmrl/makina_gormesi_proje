import axios from 'axios';

// Backend API URL - Kendi IP adresinle değiştir
const API_BASE_URL = 'http://172.23.26.168:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const classifyWaste = async (imageUri) => {
  try {
    const formData = new FormData();
    
    // Görsel dosyasını hazırla
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    });

    const response = await api.post('/api/classify', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('API Hatası:', error);
    throw error;
  }
};

export const getWasteTypes = async () => {
  try {
    const response = await api.get('/api/waste-types');
    return response.data;
  } catch (error) {
    console.error('API Hatası:', error);
    throw error;
  }
};

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API Hatası:', error);
    throw error;
  }
};

export default api;
