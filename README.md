# 🗑️ Atık Sınıflandırma Sistemi

YOLOv11m-seg modeli ile gerçek zamanlı atık türü tanıma mobil uygulaması.

## 🎯 Özellikler

- ✅ **Gerçek Zamanlı Sınıflandırma:** YOLOv11m-seg ile %96.5 doğruluk
- ✅ **5 Atık Türü:** Cam, Plastik, Kağıt, Metal, Organik
- ✅ **Mobil Uygulama:** React Native (Expo)
- ✅ **REST API:** Express.js backend
- ✅ **ML Servisi:** Flask + PyTorch
- ✅ **Offline Çalışma:** Model cihazda çalışabilir

## 📊 Model Detayları

| Özellik | Değer |
|---------|-------|
| **Model** | YOLOv11m-seg (Segmentation) |
| **Eğitim Süresi** | 150 epoch |
| **Dataset** | 6,007 görsel (augmented) |
| **mAP50** | %96.5 |
| **mAP50-95** | %78.2 |
| **Inference Hızı** | ~200-300ms (CPU) |

### Sınıflar
- `cam` - Cam Atık (Yeşil kutu)
- `evsel_atik` - Organik Atık (Kahverengi kutu)
- `kagit` - Kağıt Atık (Mavi kutu)
- `metal` - Metal Atık (Gri kutu)
- `plastik` - Plastik Atık (Sarı kutu)

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- Python 3.10+
- npm/yarn
- Android/iOS cihaz (test için)

### 1️⃣ Backend Servisi
```bash
cd backend
npm install
npm start
```

**Port:** 3000  
**Endpoints:**
- `POST /api/classify` - Görsel yükle ve sınıflandır
- `GET /api/waste-types` - Atık türleri bilgisi
- `GET /health` - Servis durumu

### 2️⃣ ML Servisi
```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate

# Paketleri kur
pip install flask flask-cors pillow opencv-python-headless pyyaml requests
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install ultralytics

# Servisi başlat
python app.py
```

**Port:** 5001  
**Endpoints:**
- `POST /predict` - Model inference
- `GET /health` - Model durumu

### 3️⃣ Mobil Uygulama
```bash
cd mobile-app
npm install

# Geliştirme modu
npx expo start

# Telefonda Expo Go ile QR kod tarayın
```

**APK Oluşturma:**
```bash
npx expo run:android --variant release
```

## ⚙️ Konfigürasyon

### Backend (.env)
```env
PORT=3000
ML_SERVICE_URL=http://localhost:5001
```

### Mobil App (src/services/api.js)
```javascript
// Laptop IP'nizi buraya yazın
const API_BASE_URL = 'http://192.168.1.XXX:3000';
```

**IP öğrenme:**
```bash
hostname -I
```

## 📱 Kullanım

1. **Backend ve ML servisini başlatın** (2 terminal)
2. **Laptop ve telefon aynı WiFi'ye bağlı olmalı**
3. **Mobil uygulamayı açın** (Expo Go ile)
4. **Fotoğraf çekin** veya galeriden seçin
5. **"Atık Türünü Belirle"** butonuna basın
6. **Sonuç:** Atık türü, güven skoru, kutu rengi

## 🏗️ Mimari
```
┌─────────────────┐
│  Mobil Uygulama │
│  (React Native) │
└────────┬────────┘
         │ HTTP (Multipart)
         ↓
┌─────────────────┐
│     Backend     │
│   (Express.js)  │
│    Port: 3000   │
└────────┬────────┘
         │ HTTP (FormData)
         ↓
┌─────────────────┐
│   ML Servisi    │
│     (Flask)     │
│    Port: 5001   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  YOLOv11m-seg   │
│  PyTorch Model  │
└─────────────────┘
```

## 📂 Proje Yapısı
```
waste-classification-project/
├── backend/                 # Express.js API servisi
│   ├── server.js           # Ana server
│   ├── package.json
│   └── uploads/            # Yüklenen görseller
├── ml-service/             # Flask ML servisi
│   ├── app.py              # ML API
│   ├── requirements.txt
│   └── models/             # YOLO modelleri
│       └── waste_classifier.pt
├── mobile-app/             # React Native uygulama
│   ├── src/
│   │   ├── screens/        # Ekranlar
│   │   ├── services/       # API servisleri
│   │   └── constants/      # Sabitler
│   ├── App.js
│   └── package.json
└── README.md
```

## 🔧 Sorun Giderme

### Backend'e bağlanamıyor
- ✅ Backend çalışıyor mu? (`npm start`)
- ✅ ML servisi çalışıyor mu? (`python app.py`)
- ✅ Aynı WiFi ağında mısınız?
- ✅ IP adresi doğru mu? (`api.js`)
- ✅ Firewall kapalı mı?

### Model yüklenmiyor
- ✅ `ml-service/models/waste_classifier.pt` var mı?
- ✅ PyTorch kurulu mu?
- ✅ Yeterli RAM var mı? (en az 4GB)

### Mobil uygulama çalışmıyor
- ✅ Expo Go güncel mi?
- ✅ Metro bundler çalışıyor mu?
- ✅ Cache temizleyin: `npx expo start --clear`

## 🎓 Eğitim Detayları

Model [Google Colab](https://colab.research.google.com) üzerinde NVIDIA A100 GPU ile eğitildi.

**Hyperparameters:**
- Epochs: 150
- Batch Size: 32
- Image Size: 640x640
- Optimizer: AdamW
- Learning Rate: 0.01 → 0.001
- Augmentation: Mosaic, Copy-Paste, HSV

**Dataset:**
- Train: 5,259 görsel
- Validation: 503 görsel
- Test: 245 görsel
- Toplam: 6,007 görsel

## 📈 Performans

| Metrik | Değer |
|--------|-------|
| Precision | %94.2 |
| Recall | %91.8 |
| mAP50 | %96.5 |
| mAP50-95 | %78.2 |
| Inference (CPU) | ~250ms |
| Inference (GPU) | ~50ms |

## 🛠️ Geliştirme Planı

- [ ] Bounding box görselleştirme
- [ ] Segmentasyon mask'leri gösterme
- [ ] Geçmiş tahminler sayfası
- [ ] İstatistik ve grafikler
- [ ] Offline TFLite model entegrasyonu
- [ ] Çoklu dil desteği

## 👨‍💻 Geliştiriciler

**Görkem Lale**  
Computer Engineering Student  
Istanbul Sabahattin Zaim University

**Fatih Yeni**  
Computer Engineering Student  
Istanbul Sabahattin Zaim University

**Muhammed Enes Bal**  
Computer Engineering Student  
Istanbul Sabahattin Zaim University

**Muhammed Zakir Demirel**  
Computer Engineering Student  
Istanbul Sabahattin Zaim University

## 📄 Lisans

MIT License

## 🙏 Teşekkürler

- [Ultralytics YOLOv11](https://github.com/ultralytics/ultralytics)
- [Roboflow](https://roboflow.com) - Dataset hosting
- [Expo](https://expo.dev) - React Native framework
