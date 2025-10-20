import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import SharedHeader from '../components/SharedHeader';
import { Ionicons } from '@expo/vector-icons';

const StarRow = ({ value }) => (
  <View style={{ flexDirection: 'row' }}>
    {[1,2,3,4,5].map(i => (
      <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={16} color="#F59E0B" />
    ))}
  </View>
);

const MyRatings = () => {
  const [received, setReceived] = useState([]);
  const [given, setGiven] = useState([]);
  const [avg, setAvg] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const recQ = query(collection(db, 'ratings'), where('ratedUserId', '==', uid));
    const unsubRec = onSnapshot(recQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReceived(list);
    });

    const givenQ = query(collection(db, 'ratings'), where('raterId', '==', uid));
    const unsubGiven = onSnapshot(givenQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGiven(list);
    });

    // fetch aggregate
    (async () => {
      const u = await getDoc(doc(db, 'users', uid));
      const r = u.exists() ? u.data().ratings : null;
      if (r?.count && r?.sum) setAvg((r.sum / r.count).toFixed(2));
      else setAvg(null);
    })();

    return () => { unsubRec(); unsubGiven(); };
  }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <StarRow value={item.rating} />
        <Text style={styles.date}>{item.createdAt?.toDate?.().toLocaleDateString?.() || ''}</Text>
      </View>
      {item.review ? <Text style={styles.review}>{item.review}</Text> : null}
      <Text style={styles.meta}>Job: {item.jobId}</Text>
      <Text style={styles.meta}>By: {item.raterRole}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <SharedHeader title="My Ratings" showBackButton />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Average</Text>
        {avg ? (
          <View style={styles.avgRow}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.avgText}>{avg}</Text>
          </View>
        ) : (
          <Text style={styles.avgText}>No ratings yet</Text>
        )}
      </View>

      <Text style={styles.section}>Received</Text>
      <FlatList
        data={received}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={received.length === 0 && { paddingHorizontal: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No received ratings yet.</Text>}
      />

      <Text style={styles.section}>Given</Text>
      <FlatList
        data={given}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={given.length === 0 && { paddingHorizontal: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No given ratings yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  summary: { backgroundColor: '#FFFFFF', padding: 16, margin: 16, borderRadius: 12 },
  summaryLabel: { color: '#6B7280', marginBottom: 4 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgText: { fontSize: 18, fontWeight: '700', color: '#111827', marginLeft: 6 },
  section: { marginTop: 8, marginHorizontal: 16, marginBottom: 8, color: '#6B7280', fontWeight: '600' },
  card: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  date: { color: '#9CA3AF', fontSize: 12 },
  review: { color: '#374151', marginBottom: 6 },
  meta: { color: '#6B7280', fontSize: 12 },
  empty: { color: '#9CA3AF', marginHorizontal: 16, marginBottom: 16 },
});

export default MyRatings;


