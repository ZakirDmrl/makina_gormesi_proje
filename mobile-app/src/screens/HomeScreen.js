import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { classifyWaste } from '../services/api';

export default function HomeScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [imageLayout, setImageLayout] = useState(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setResults(null);
      }
    } catch (error) {
      Alert.alert('Hata', 'Görsel seçilirken bir hata oluştu');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Kamera izni verilmedi');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setResults(null);
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu');
    }
  };

  const handleClassify = async () => {
    if (!image) {
      Alert.alert('Uyarı', 'Lütfen önce bir görsel seçin');
      return;
    }

    setLoading(true);
    try {
      const response = await classifyWaste(image);
      
      if (response.success) {
        setResults(response.data);
      } else {
        Alert.alert('Hata', response.error || 'Sınıflandırma başarısız');
      }
    } catch (error) {
      Alert.alert(
        'Bağlantı Hatası',
        'Sunucuya bağlanılamadı. Lütfen backend servisinin çalıştığından emin olun.\n\n' +
        'Kontrol edin:\n' +
        '1. Backend servisi çalışıyor mu? (npm start)\n' +
        '2. ML servisi çalışıyor mu? (python app.py)\n' +
        '3. API_BASE_URL doğru mu? (src/services/api.js)'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBoundingBoxes = () => {
    if (!results || !results.predictions || !imageLayout || !results.imageSize) return null;

    const { width: layoutWidth, height: layoutHeight } = imageLayout;
    const { width: origWidth, height: origHeight } = results.imageSize;

    const imageAspect = origWidth / origHeight;
    const layoutAspect = layoutWidth / layoutHeight;

    let scale, offsetX = 0, offsetY = 0;

    if (imageAspect > layoutAspect) {
      scale = layoutWidth / origWidth;
      offsetY = (layoutHeight - (origHeight * scale)) / 2;
    } else {
      scale = layoutHeight / origHeight;
      offsetX = (layoutWidth - (origWidth * scale)) / 2;
    }

    return results.predictions.map((pred, index) => {
      const [x1, y1, x2, y2] = pred.bbox;
      const boxWidth = (x2 - x1) * scale;
      const boxHeight = (y2 - y1) * scale;
      const boxLeft = x1 * scale + offsetX;
      const boxTop = y1 * scale + offsetY;

      return (
        <View
          key={index}
          style={[
            styles.boundingBox,
            { left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight, borderColor: pred.binColor || '#10B981' }
          ]}
        >
          <View style={[styles.labelContainer, { backgroundColor: pred.binColor || '#10B981' }]}>
            <Text style={styles.labelText}>{pred.class} %{Math.round(pred.confidence * 100)}</Text>
          </View>
        </View>
      );
    });
  };

  const renderResults = () => {
    if (!results || !results.predictions || results.predictions.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>Atık tespit edilemedi</Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Tespit Edilen Atıklar:</Text>
        {results.predictions.map((pred, index) => (
          <View
            key={index}
            style={[
              styles.predictionCard,
              { borderLeftColor: pred.binColor || '#10B981' },
            ]}
          >
            <View style={styles.predictionHeader}>
              <View style={styles.predictionInfo}>
                <Text style={styles.predictionType}>
                  {pred.binType || pred.class}
                </Text>
                <Text style={styles.predictionConfidence}>
                  Güven: {(pred.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.binColorIndicator,
                { backgroundColor: pred.binColor || '#10B981' },
              ]}
            >
              <Text style={styles.binColorText}>
                {pred.binColor.toUpperCase()} KUTU
              </Text>
            </View>
          </View>
        ))}
        {results.note && (
          <Text style={styles.noteText}>ℹ️ {results.note}</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>♻️ Atık Türü Tanıma</Text>
        <Text style={styles.subtitle}>
          Kampüs içerisinde karşılaştığınız atıkların görsellerini yükleyin
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>📷 Fotoğraf Çek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={pickImage}
          >
            <Text style={styles.buttonText}>🖼️ Galeriden Seç</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <View 
            style={styles.imageContainer}
            onLayout={(event) => setImageLayout(event.nativeEvent.layout)}
          >
            <Image 
              source={{ uri: image }} 
              style={styles.image} 
              resizeMode="contain"
            />
            {renderBoundingBoxes()}
            <TouchableOpacity
              style={styles.classifyButton}
              onPress={handleClassify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.classifyButtonText}>
                  🔍 Atık Türünü Belirle
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {results && renderResults()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 300,
  },
  classifyButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  classifyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1F2937',
  },
  predictionCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  predictionConfidence: {
    fontSize: 14,
    color: '#6B7280',
  },
  binColorIndicator: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  binColorText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  noResultsContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    padding: 20,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  labelContainer: {
    position: 'absolute',
    top: -20,
    left: -2,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  labelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
