import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { classifyWaste } from '../services/api';
import { WASTE_COLORS, WASTE_TYPES, WASTE_ICONS } from '../constants/wasteTypes';

export default function HomeScreen() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasPermission(cameraStatus === 'granted' && mediaStatus === 'granted');
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
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
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
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
              { borderLeftColor: WASTE_COLORS[pred.class] },
            ]}
          >
            <View style={styles.predictionHeader}>
              <Text style={styles.predictionIcon}>
                {WASTE_ICONS[pred.class]}
              </Text>
              <View style={styles.predictionInfo}>
                <Text style={styles.predictionType}>
                  {pred.binType || WASTE_TYPES[pred.class]}
                </Text>
                <Text style={styles.predictionConfidence}>
                  Güven: {(pred.confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.binColorIndicator,
                { backgroundColor: WASTE_COLORS[pred.class] },
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

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Kamera ve galeri erişim izni gerekli
        </Text>
      </View>
    );
  }

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
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
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
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  classifyButton: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
});
