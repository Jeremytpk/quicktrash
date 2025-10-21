import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const recQ = query(collection(db, 'ratings'), where('ratedUserId', '==', uid));
    const unsubRec = onSnapshot(recQ, async (snap) => {
      const list = [];
      
      for (const d of snap.docs) {
        const ratingData = d.data();
        
        // Fetch rater's name
        let raterName = 'Unknown User';
        try {
          const raterDoc = await getDoc(doc(db, 'users', ratingData.raterId));
          if (raterDoc.exists()) {
            raterName = raterDoc.data().displayName || 'Unknown User';
          }
        } catch (error) {
          console.error('Error fetching rater name:', error);
        }
        
        list.push({ 
          id: d.id, 
          ...ratingData, 
          raterName 
        });
      }
      
      setReceived(list);
      setLoading(false);
    });

    const givenQ = query(collection(db, 'ratings'), where('raterId', '==', uid));
    const unsubGiven = onSnapshot(givenQ, async (snap) => {
      const list = [];
      
      for (const d of snap.docs) {
        const ratingData = d.data();
        
        // Fetch rated user's name
        let ratedUserName = 'Unknown User';
        try {
          const ratedUserDoc = await getDoc(doc(db, 'users', ratingData.ratedUserId));
          if (ratedUserDoc.exists()) {
            ratedUserName = ratedUserDoc.data().displayName || 'Unknown User';
          }
        } catch (error) {
          console.error('Error fetching rated user name:', error);
        }
        
        list.push({ 
          id: d.id, 
          ...ratingData, 
          ratedUserName 
        });
      }
      
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

  const renderReceivedItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <StarRow value={item.rating} />
        <Text style={styles.date}>{item.createdAt?.toDate?.().toLocaleDateString?.() || ''}</Text>
      </View>
      {item.review ? <Text style={styles.review}>"{item.review}"</Text> : null}
      <Text style={styles.meta}>Rated by: {item.raterName}</Text>
      <Text style={styles.meta}>Role: {item.raterRole}</Text>
    </View>
  );

  const renderGivenItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <StarRow value={item.rating} />
        <Text style={styles.date}>{item.createdAt?.toDate?.().toLocaleDateString?.() || ''}</Text>
      </View>
      {item.review ? <Text style={styles.review}>"{item.review}"</Text> : null}
      <Text style={styles.meta}>You rated: {item.ratedUserName}</Text>
      <Text style={styles.meta}>Role: {item.ratedUserRole}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <SharedHeader title="My Ratings" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#34A853" />
          <Text style={styles.loadingText}>Loading ratings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SharedHeader title="My Ratings" showBackButton />

      <ScrollView>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Your Average Rating</Text>
          {avg ? (
            <View style={styles.avgRow}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={styles.avgText}>{avg}</Text>
              <Text style={styles.avgCount}>({received.length} {received.length === 1 ? 'rating' : 'ratings'})</Text>
            </View>
          ) : (
            <Text style={styles.avgText}>No ratings yet</Text>
          )}
        </View>

        <Text style={styles.section}>Ratings Received ({received.length})</Text>
        {received.length > 0 ? (
          received.map((item) => <View key={item.id}>{renderReceivedItem({ item })}</View>)
        ) : (
          <Text style={styles.empty}>No received ratings yet.</Text>
        )}

        <Text style={styles.section}>Ratings Given ({given.length})</Text>
        {given.length > 0 ? (
          given.map((item) => <View key={item.id}>{renderGivenItem({ item })}</View>)
        ) : (
          <Text style={styles.empty}>No given ratings yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  summary: { 
    backgroundColor: '#FFFFFF', 
    padding: 20, 
    margin: 16, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: { color: '#6B7280', marginBottom: 8, fontSize: 14 },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgText: { fontSize: 28, fontWeight: '700', color: '#111827', marginLeft: 6 },
  avgCount: { fontSize: 14, color: '#9CA3AF', marginLeft: 4 },
  section: { 
    marginTop: 16, 
    marginHorizontal: 16, 
    marginBottom: 12, 
    color: '#1F2937', 
    fontWeight: '700',
    fontSize: 16
  },
  card: { 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 16, 
    marginBottom: 12, 
    borderRadius: 12, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  date: { color: '#9CA3AF', fontSize: 12 },
  review: { 
    color: '#374151', 
    marginBottom: 8,
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 20
  },
  meta: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  empty: { color: '#9CA3AF', marginHorizontal: 16, marginBottom: 24, fontSize: 14, textAlign: 'center' },
});

export default MyRatings;


