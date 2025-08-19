import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import AppLoading from 'expo-app-loading';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { designService } from '../../services/api';

type Design = {
  id: number;
  title: string;
  category?: { id: number; name: string };
  price?: number | string;
  images?: { id: number; image: string; is_primary: boolean }[];
  status?: string;
  likes?: number;
  views?: number;
};

export default function MyDesigns({ navigation }: any) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const loadDesigns = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await designService.listMyDesigns();
      setDesigns(data);
    } catch (e) {
      console.warn('Failed to fetch designs', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDesigns();
  }, [loadDesigns]);

  if (!fontsLoaded) return <AppLoading />;

  const renderItem = ({ item }: { item: Design }) => {
    const primary = item.images?.find((im) => im.is_primary) || item.images?.[0];
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.push('/designs/' + item.id)}>
        <Image source={{ uri: primary?.image }} style={styles.image} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            {!!item.price && <Text style={styles.price}>TZS {String(item.price).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</Text>}
          </View>
          {!!item.category && <Text style={styles.category}>{item.category?.name}</Text>}
          <View style={styles.cardFooter}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}><Ionicons name="eye-outline" size={16} color="#666" /><Text style={styles.statText}>{item.views ?? 0}</Text></View>
              <View style={[styles.statItem, { marginLeft: 12 }]}><Ionicons name="heart-outline" size={16} color="#666" /><Text style={styles.statText}>{item.likes ?? 0}</Text></View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const Empty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color={Colors.light.primary} />
      <Text style={styles.emptyTitle}>No designs yet</Text>
      <Text style={styles.emptyText}>Upload your first design to get started!</Text>
      <TouchableOpacity style={styles.uploadButton} onPress={() => navigation.navigate('UploadDesigns')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.uploadButtonText}>Upload Design</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <FlatList
        data={designs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={Empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDesigns} colors={[Colors.light.primary]} tintColor={Colors.light.primary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, overflow: 'hidden', elevation: 2 },
  image: { width: '100%', height: 200, backgroundColor: '#f5f5f5' },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { flex: 1, fontFamily: 'Montserrat_600SemiBold', fontSize: 16, color: '#333', marginRight: 8 },
  price: { fontFamily: 'Montserrat_700Bold', fontSize: 16, color: Colors.light.primary },
  category: { fontFamily: 'Montserrat_500Medium', fontSize: 14, color: '#666', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  statsContainer: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontFamily: 'Montserrat_500Medium', fontSize: 12, color: '#666', marginLeft: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontFamily: 'Montserrat_600SemiBold', fontSize: 18, color: '#333', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  uploadButton: { flexDirection: 'row', backgroundColor: Colors.light.primary, borderRadius: 25, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { fontFamily: 'Montserrat_600SemiBold', fontSize: 14, color: '#fff', marginLeft: 8 },
});
