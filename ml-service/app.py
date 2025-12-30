from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Model global değişkeni (sonra yüklenecek)
model = None
MODEL_PATH = 'models/waste_classifier.pt'

# Atık türleri ve kutu renkleri
WASTE_CLASSES = {
    0: {'name': 'cam', 'binType': 'Cam Atık', 'binColor': 'green'},
    1: {'name': 'evsel_atik', 'binType': 'Organik Atık', 'binColor': 'brown'},
    2: {'name': 'kagit', 'binType': 'Kağıt Atık', 'binColor': 'blue'},
    3: {'name': 'metal', 'binType': 'Metal Atık', 'binColor': 'gray'},
    4: {'name': 'plastik', 'binType': 'Plastik Atık', 'binColor': 'yellow'}
}

def load_model():
    """YOLO modelini yükle"""
    global model
    try:
        # YOLOv8 modelini yükle (şimdilik pretrained)
        from ultralytics import YOLO
        
        if os.path.exists(MODEL_PATH):
            print(f"✅ Custom model yükleniyor: {MODEL_PATH}")
            model = YOLO(MODEL_PATH)
            print("✅ Model başarıyla yüklendi!")
            return True
        else:
            print(f"❌ Custom model bulunamadı: {MODEL_PATH}")
            return False
    except Exception as e:
        print(f"❌ Model yükleme hatası: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Servis sağlık kontrolü"""
    return jsonify({
        'status': 'ok',
        'message': 'ML Servisi çalışıyor',
        'model_loaded': model is not None,
        'timestamp': time.time()
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Atık sınıflandırma endpoint'i"""
    try:
        start_time = time.time()
        
        # Görsel alımı - Multipart öncelikli
        if 'image' in request.files:
            image_file = request.files['image']
            img = Image.open(io.BytesIO(image_file.read()))
            print(f"✅ Görsel alındı: {image_file.filename}")
            
        elif request.json and 'image_path' in request.json:
            image_path = request.json['image_path']
            if not os.path.exists(image_path):
                return jsonify({
                    'success': False,
                    'error': 'Görsel dosyası bulunamadı'
                }), 400
            img = Image.open(image_path)
            print(f"✅ Görsel path'den alındı: {image_path}")
            
        else:
            return jsonify({
                'success': False,
                'error': 'Görsel verisi bulunamadı (multipart veya image_path gerekli)'
            }), 400
        
        # Model yüklü değilse hata dön
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model yüklenemedi veya hazır değil. Lütfen models/ klasörünü kontrol edin.'
            }), 500
        
        # Model inference
        print("⚡ Model inference başlıyor...")
        results = model(img)
        predictions = []
        
        for result in results:
            boxes = result.boxes
            masks = result.masks
            for i, box in enumerate(boxes):
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                
                if confidence > 0.5:
                    waste_info = WASTE_CLASSES.get(class_id, {
                        'name': 'unknown',
                        'binType': 'Bilinmeyen Atık',
                        'binColor': 'black'
                    })
                    
                    prediction = {
                        'class': waste_info['name'],
                        'confidence': round(confidence, 2),
                        'binColor': waste_info['binColor'],
                        'binType': waste_info['binType'],
                        'bbox': box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                    }
                    
                    # Eğer model segmentation modeliyse mask noktalarını ekle
                    if masks is not None:
                        prediction['segment'] = masks.xy[i].tolist() # [[x1,y1], [x2,y2]...]
                        
                    predictions.append(prediction)
        
        processing_time = time.time() - start_time
        print(f"✅ {len(predictions)} tahmin yapıldı - {processing_time:.2f}s")
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'processing_time': f'{processing_time:.2f}s',
            'total_objects': len(predictions),
            'image_size': {'width': img.width, 'height': img.height}
        })
        
    except Exception as e:
        print(f"❌ Tahmin hatası: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Model yeniden eğitimi (opsiyonel)"""
    try:
        # Dataset path kontrolü
        dataset_path = request.json.get('dataset_path')
        epochs = request.json.get('epochs', 50)
        
        if not dataset_path or not os.path.exists(dataset_path):
            return jsonify({
                'success': False,
                'error': 'Geçerli bir dataset path belirtilmedi'
            }), 400
        
        # Eğitim başlat (asenkron olmalı gerçek kullanımda)
        global model
        from ultralytics import YOLO
        
        model = YOLO('yolov8n.pt')  # Pretrained model
        results = model.train(
            data=f'{dataset_path}/data.yaml',
            epochs=epochs,
            imgsz=640,
            batch=16,
            name='waste_classifier'
        )
        
        return jsonify({
            'success': True,
            'message': 'Model eğitimi başladı',
            'epochs': epochs
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("🤖 ML Servisi başlatılıyor...")
    
    os.makedirs('models', exist_ok=True)
    load_model()
    
    app.run(host='0.0.0.0', port=5001, debug=True)  # 5000 → 5001
