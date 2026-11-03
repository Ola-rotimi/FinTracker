import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { COUNTRIES, CUSTOM_COUNTRY, type CountryPreset } from '@/lib/countries';
import { useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/theme';

type Row = Pick<CountryPreset, 'code' | 'name' | 'flag' | 'currency'>;

const CUSTOM_ROW: Row = { code: CUSTOM_COUNTRY, name: 'Custom (enter your own rates)', flag: '✏️', currency: '' };

/**
 * `purpose=home` sets the user's country (and currency).
 * `purpose=calc` only changes which country's rules the calculators use.
 */
export default function CountryScreen() {
  const { purpose } = useLocalSearchParams<{ purpose?: string }>();
  const forCalc = purpose === 'calc';
  const t = useTheme();
  const { country, calcCountry, setCountry, setCalcCountry } = useSettings();
  const [search, setSearch] = useState('');
  const selected = forCalc ? calcCountry : country;

  const q = search.trim().toLowerCase();
  const matches = (c: Row) => !q || c.name.toLowerCase().includes(q) || c.currency.toLowerCase().includes(q);
  const sections = [
    { title: 'Africa', data: COUNTRIES.filter((c) => c.region === 'africa' && matches(c)) },
    { title: 'Rest of the world', data: COUNTRIES.filter((c) => c.region === 'world' && matches(c)) },
    ...(forCalc ? [{ title: 'Other', data: [CUSTOM_ROW].filter(matches) }] : []),
  ].filter((s) => s.data.length > 0);

  const choose = async (code: string) => {
    await (forCalc ? setCalcCountry(code) : setCountry(code));
    router.back();
  };

  return (
    <SectionList
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      sections={sections}
      keyExtractor={(item) => item.code}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={{ gap: 10, marginBottom: 4 }}>
          <Stack.Screen options={{ title: forCalc ? 'Calculator country' : 'Your country' }} />
          <AppText variant="caption">
            {forCalc
              ? 'Tax bands, social contributions and pension rules will be filled in for the country you pick.'
              : 'Sets your currency and the default rules for the tax and pension calculators.'}
          </AppText>
          <View style={[styles.search, { backgroundColor: t.inputBg, borderColor: t.border }]}>
            <Ionicons name="search" size={18} color={t.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or currency"
              placeholderTextColor={t.muted}
              style={[styles.searchInput, { color: t.text }]}
              autoCorrect={false}
            />
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <AppText variant="label" style={styles.sectionHeader}>
          {section.title.toUpperCase()}
        </AppText>
      )}
      renderItem={({ item }) => {
        const active = item.code === selected;
        return (
          <Pressable
            onPress={() => choose(item.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: active ? t.primarySoft : t.card, borderColor: active ? t.primary : t.border },
              pressed && { opacity: 0.6 },
            ]}>
            <Text style={styles.flag}>{item.flag}</Text>
            <AppText weight="600" style={{ flex: 1 }}>
              {item.name}
            </AppText>
            {item.currency ? <AppText variant="caption">{item.currency}</AppText> : null}
            {active && <Ionicons name="checkmark-circle" size={22} color={t.primary} />}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 16 },
  sectionHeader: { paddingTop: 16, paddingBottom: 8, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
  flag: { fontSize: 24 },
});
