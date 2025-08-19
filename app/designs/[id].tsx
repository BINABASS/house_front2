import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { designService, toMediaUrl } from '../../services/api';
import { Colors } from '../../constants/Colors';

export default function DesignDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [design, setDesign] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await designService.getDesign(Number(id));
        setDesign(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.light.primary} /></View>;
  }
  if (!design) {
    return <View style={styles.center}><Text>Design not found.</Text></View>;
  }

  const primary = design.images?.find((i: any) => i.is_primary) || design.images?.[0];

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      {primary?.image && (
        <Image source={{ uri: toMediaUrl(primary.image) || undefined }} style={styles.hero} />
      )}
      <Text style={styles.title}>{design.title}</Text>
      <Text style={styles.price}>Tsh {Number(design.price).toLocaleString()}</Text>
      <Text style={styles.desc}>{design.description}</Text>

      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => router.push({ pathname: '/booking', params: { designs: JSON.stringify([{ id: design.id, name: design.title, price: design.price }]), total: Number(design.price) } })}
      >
        <Text style={styles.bookText}>Book this Design</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { width: '100%', height: 240, borderRadius: 12, marginBottom: 16, backgroundColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.light.text, marginBottom: 8 },
  price: { fontSize: 18, color: Colors.light.primary, marginBottom: 12, fontWeight: '600' },
  desc: { color: Colors.light.text, lineHeight: 20, marginBottom: 24 },
  bookBtn: { backgroundColor: Colors.light.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  bookText: { color: '#fff', fontWeight: 'bold' },
});


