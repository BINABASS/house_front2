import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { bookingService } from '../../services/api';
import { Colors } from '../../constants/Colors';

type Booking = {
  id: number;
  design: { id: number; title: string };
  amount: number;
  status: string;
  payment_status: string;
  start_date: string;
};

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const data = await bookingService.listMine();
      setBookings(data);
    } catch (e) {
      console.warn('Failed to load bookings', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <FlatList
        data={bookings}
        keyExtractor={(b) => String(b.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.light.primary} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: Colors.light.textSecondary, marginTop: 40 }}>No bookings yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.design.title}</Text>
            <Text style={styles.row}>Amount: Tsh {Number(item.amount).toLocaleString()}</Text>
            <Text style={styles.row}>Status: {item.status}</Text>
            <Text style={styles.row}>Payment: {item.payment_status}</Text>
            <Text style={styles.row}>Start: {new Date(item.start_date).toLocaleDateString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  title: { fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  row: { color: Colors.light.text, marginBottom: 2 },
});


