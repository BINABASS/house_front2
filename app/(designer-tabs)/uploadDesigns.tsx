import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import AppLoading from 'expo-app-loading';
import { Colors } from '../../constants/Colors';
import { Picker } from '@react-native-picker/picker';
import { designService } from '../../services/api';
import { useRouter } from 'expo-router';
import type { AxiosProgressEvent } from 'axios';

type Category = { id: number; name: string };
type Tag = { id: number; name: string };

interface DesignFormData {
  title: string;
  price: string;
  category_id: number | null;
  description: string;
  tag_ids: number[];
  is_premium: boolean;
}

export default function UploadDesigns() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [formData, setFormData] = useState<DesignFormData>({
    title: '',
    price: '',
    category_id: null,
    description: '',
    tag_ids: [],
    is_premium: false,
  });

  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    (async () => {
      try {
        const [cats, tgs] = await Promise.all([designService.listCategories(), designService.listTags()]);
        setCategories(cats);
        setTags(tgs);
      } catch (e) {
        console.warn('Failed to load taxonomies', e);
      }
    })();
  }, []);

  if (!fontsLoaded) return <AppLoading />;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'We need access to your photos to upload design images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('Image Required', 'Please select a design image to upload.');
      return;
    }
    if (!formData.title || !formData.price || !formData.category_id || !formData.description) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1) Create the design (JSON) — uses category_id & tag_ids expected by backend
      const created = await designService.createDesign({
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category_id: formData.category_id!,
        tag_ids: formData.tag_ids,
        is_premium: formData.is_premium,
      });

      // 2) Upload image to /designs/{id}/upload_images/
      const fileExt = image.split('.').pop() || 'jpg';
      const fileInfo = await FileSystem.getInfoAsync(image);
      if (!fileInfo.exists) throw new Error('Image file not found');

      await designService.uploadImages(
        created.id,
        [{ uri: image, name: `design_${Date.now()}.${fileExt}`, type: `image/${fileExt}` }],
        {
          onUploadProgress: (evt: AxiosProgressEvent) => {
            if (evt.total) {
              const progress = Math.round((evt.loaded * 100) / evt.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      Alert.alert('Upload Successful', 'Your design has been uploaded and is pending review.', [
        { text: 'View Design', onPress: () => router.push(`/designs/${created.id}`) },
        {
          text: 'Upload Another',
          style: 'cancel',
          onPress: () => {
            setImage(null);
            setFormData({ title: '', price: '', category_id: null, description: '', tag_ids: [], is_premium: false });
            setUploadProgress(0);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'An error occurred while uploading your design.';
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {uploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Uploading: {uploadProgress}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      <Text style={styles.title}>Upload New Design</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Design Image *</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploading}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="cloud-upload-outline" size={48} color={Colors.light.primary} />
              <Text style={styles.placeholderText}>Select Design Image</Text>
              <Text style={styles.helperText}>JPG, PNG or WEBP (max ~10MB)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Modern Living Room"
          value={formData.title}
          onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Price *</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="e.g., 1200000"
          value={formData.price}
          onChangeText={(v) => setFormData((p) => ({ ...p, price: v }))}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Category *</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={formData.category_id}
            onValueChange={(v) => setFormData((p) => ({ ...p, category_id: v }))}
          >
            <Picker.Item label="Select a category" value={null} />
            {categories.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Tags</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={null}
            onValueChange={(v) =>
              setFormData((p) =>
                p.tag_ids.includes(v) ? p : { ...p, tag_ids: [...p.tag_ids, v] }
              )
            }
          >
            <Picker.Item label="Add a tag..." value={null} />
            {tags.map((t) => (
              <Picker.Item key={t.id} label={t.name} value={t.id} />
            ))}
          </Picker>
        </View>
        {formData.tag_ids.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {formData.tag_ids.map((id) => {
              const label = tags.find((t) => t.id === id)?.name ?? id;
              return (
                <View key={id} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setFormData((p) => ({ ...p, tag_ids: p.tag_ids.filter((x) => x !== id) }))
                    }
                  >
                    <Ionicons name="close" size={14} color="#555" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 12 }]}>Description *</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Tell us about this design..."
          multiline
          value={formData.description}
          onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, uploading && styles.buttonDisabled]}
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Upload Design</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  progressContainer: { marginBottom: 20, width: '100%' },
  progressText: { fontSize: 14, color: Colors.light.text, marginBottom: 4, textAlign: 'center' },
  progressBar: { height: 8, backgroundColor: Colors.light.background, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.light.primary },
  container: { flexGrow: 1, padding: 20, backgroundColor: Colors.light.background, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: 'Montserrat_700Bold', color: Colors.light.primary, marginBottom: 24, textAlign: 'center', letterSpacing: 0.5 },
  section: { marginBottom: 24, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 18, fontFamily: 'Montserrat_600SemiBold', color: Colors.light.text, marginBottom: 16 },
  imagePicker: { width: '100%', height: 200, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#f8f9fa' },
  image: { width: '100%', height: '100%' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: 8, fontSize: 16, fontFamily: 'Montserrat_500Medium', color: Colors.light.text },
  helperText: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: Colors.light.text, marginTop: 4 },
  label: { fontFamily: 'Montserrat_600SemiBold', color: Colors.light.text, marginBottom: 6 },
  input: { backgroundColor: '#f0f2f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontFamily: 'Montserrat_400Regular', fontSize: 16, color: '#333' },
  pickerWrapper: { backgroundColor: '#f0f2f5', borderRadius: 10, overflow: 'hidden' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaecee', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  chipText: { marginRight: 6, fontFamily: 'Montserrat_500Medium', color: '#333' },
  button: { backgroundColor: Colors.light.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Montserrat_600SemiBold' },
});
