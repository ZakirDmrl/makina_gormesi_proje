const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Upload klasörünü oluştur
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Sadece .jpeg, .jpg ve .png formatları desteklenmektedir!'));
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Atık Türü Tanıma API çalışıyor',
    timestamp: new Date().toISOString()
  });
});

// Atık sınıflandırma endpoint'i
app.post('/api/classify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Lütfen bir görsel yükleyin' 
      });
    }

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    // ML servisine istek gönder
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

    try {
      console.log('📤 ML servisine istek gönderiliyor:', ML_SERVICE_URL);
      
      // FormData oluştur
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('image', fs.createReadStream(req.file.path), {
        filename: req.file.filename,
        contentType: req.file.mimetype
      });

      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log('✅ ML servisinden yanıt alındı');

      res.json({
        success: true,
        data: {
          imageUrl: imageUrl,
          predictions: mlResponse.data.predictions,
          processingTime: mlResponse.data.processing_time
        }
      });
    } catch (mlError) {
      // ML servisi çalışmıyorsa mock data dön
      console.warn('ML servisi yanıt vermiyor, mock data kullanılıyor:', mlError.message);
      
      res.json({
        success: true,
        data: {
          imageUrl: imageUrl,
          predictions: [
            {
              class: 'plastic',
              confidence: 0.92,
              binColor: 'yellow',
              binType: 'Plastik Atık'
            }
          ],
          processingTime: '0.15s',
          note: 'ML servisi bekleniyor - mock data'
        }
      });
    }

  } catch (error) {
    console.error('Beklenmedik hata:', error.message);
    res.status(500).json({
      success: false,
      error: 'Sunucu tarafında bir hata oluştu'
    });
  }
});

// Atık türleri hakkında bilgi
app.get('/api/waste-types', (req, res) => {
  res.json({
    success: true,
    data: [
      { type: 'kagit', name: 'Kağıt', color: 'blue', binColor: 'Mavi' },
      { type: 'cam', name: 'Cam', color: 'green', binColor: 'Yeşil' },
      { type: 'metal', name: 'Metal', color: 'gray', binColor: 'Gri' },
      { type: 'evsel_atik', name: 'Organik', color: 'brown', binColor: 'Kahverengi' },
      { type: 'plastik', name: 'Plastik', color: 'yellow', binColor: 'Sarı' }
    ]
  });
});

// İstatistikler (opsiyonel)
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalClassifications: 0,
      accuracy: 0.85,
      modelVersion: '1.0.0'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Sunucu hatası' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend servisi http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📁 Dosya yükleme: POST /api/classify`);
  console.log(`📊 Atık türleri: GET /api/waste-types`);
  console.log(`💚 Health check: GET /health`);
});
