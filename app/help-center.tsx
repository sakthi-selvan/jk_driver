import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../src/constants/theme';

const FAQS: Array<{ q: string; a: string; icon: keyof typeof Ionicons.glyphMap }> = [
  {
    q: 'How do I go online?',
    a: 'Open Home, share GPS, then toggle Online. You must be verified with approved documents. New ride offers appear as cards you can accept or decline.',
    icon: 'radio-outline',
  },
  {
    q: 'What is the passenger Ride OTP?',
    a: 'Each passenger has a static Ride OTP on their Profile. Ask for it at pickup and enter it in the app to start the trip.',
    icon: 'key-outline',
  },
  {
    q: 'How do earnings work?',
    a: 'Completed trips credit your wallet after the fare is settled. Check Wallet for trips, incentives, and payout history.',
    icon: 'wallet-outline',
  },
  {
    q: 'Can I cancel an accepted ride?',
    a: 'Only when necessary. Frequent cancellations may affect your acceptance score. Prefer contacting the passenger first if they are delayed.',
    icon: 'close-circle-outline',
  },
  {
    q: 'Passenger left something behind?',
    a: 'Open the completed trip in My Rides and use Contact Support with the trip ID. Ops will help reconnect you with the passenger.',
    icon: 'bag-handle-outline',
  },
  {
    q: 'Women-only trip requests',
    a: 'Set Gender to Female on Edit Profile to receive women-preference requests when passengers enable that option.',
    icon: 'shield-checkmark-outline',
  },
];

export default function HelpCenterScreen() {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(0);

  const filtered = FAQS.filter(
    (f) =>
      !query.trim() ||
      f.q.toLowerCase().includes(query.trim().toLowerCase()) ||
      f.a.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Help Center" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs…"
            placeholderTextColor="#999"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <View style={styles.quickRow}>
          {[
            { label: 'Going online', icon: 'radio-outline' as const },
            { label: 'Wallet', icon: 'wallet-outline' as const },
            { label: 'Safety', icon: 'shield-outline' as const },
          ].map((chip) => (
            <View key={chip.label} style={styles.chip}>
              <Ionicons name={chip.icon} size={16} color={Colors.primary} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Frequently asked</Text>
        <View style={styles.card}>
          {filtered.map((faq, idx) => {
            const open = openId === idx;
            return (
              <View key={faq.q}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => setOpenId(open ? null : idx)}
                  activeOpacity={0.75}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={faq.icon} size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.faqQ}>{faq.q}</Text>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
                </TouchableOpacity>
                {open && <Text style={styles.faqA}>{faq.a}</Text>}
              </View>
            );
          })}
          {filtered.length === 0 && (
            <Text style={styles.empty}>No articles match “{query}”. Try another keyword.</Text>
          )}
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={22} color="#B45309" />
          <Text style={styles.tipText}>
            Still stuck? Open Contact Support and share your trip ID — our team typically replies within a few
            minutes during service hours.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.ink, paddingVertical: 14 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  chipText: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.primary },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQ: { flex: 1, fontSize: FontSizes.md, fontWeight: FontWeights.semibold, color: Colors.ink },
  faqA: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingLeft: 62,
    fontSize: FontSizes.sm,
    color: Colors.inkSecondary,
    lineHeight: 20,
  },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  empty: { padding: Spacing.lg, textAlign: 'center', color: Colors.inkMuted },
  tipCard: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.lg,
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipText: { flex: 1, fontSize: FontSizes.sm, color: '#92400E', lineHeight: 20 },
});
