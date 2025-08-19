import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import AppLoading from 'expo-app-loading';
import { Colors } from '../../constants/Colors';
import { bookingService } from '../../services/api';

interface Booking {
  id: number;
  client: { id: number; email: string; first_name?: string; last_name?: string };
  design: { id: number; title: string };
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'failed' | 'refunded';
  amount: number;
  start_date: string;
}

export default function Bookings() {
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

  let [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });
  if (!fontsLoaded) {
    return <AppLoading />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f6fa', padding: 16 }}>
      <Text style={styles.title}>Bookings</Text>
      {bookings.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#888', fontSize: 18, marginTop: 40 }}>No bookings yet</Text>
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.light.primary} />}>
          {bookings.map((booking) => (
            <View key={booking.id} style={styles.card}>
              <Text style={styles.bold}>{booking.client.first_name || booking.client.email}</Text>
              <Text style={styles.text}>Design: {booking.design.title}</Text>
              <Text style={styles.text}>Status: {booking.status}</Text>
              <Text style={styles.text}>Payment: {booking.payment_status}</Text>
              <Text style={styles.text}>Amount: Tsh {booking.amount}</Text>
              <Text style={styles.text}>Start: {new Date(booking.start_date).toLocaleDateString()}</Text>
              {booking.status === 'pending' && (
                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Text onPress={async () => { await bookingService.confirm(booking.id); load(); }} style={{ color: Colors.light.primary, marginRight: 16 }}>Confirm</Text>
                  <Text onPress={async () => { await bookingService.cancel(booking.id); load(); }} style={{ color: Colors.light.error }}>Cancel</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontFamily: 'Montserrat_700Bold',
    color: Colors.light.primary,
    marginBottom: 22,
    textAlign: 'center',
    marginTop: 18,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  bold: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 17,
    marginBottom: 4,
    color: Colors.light.text,
  },
  text: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 2,
  },
});