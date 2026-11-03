import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { fromISODate, shortDate, toISODate } from '@/lib/dates';
import { useTheme } from '@/lib/theme';
import { AppText } from './ui';

/** A labelled date input. iOS shows the native compact picker; Android opens the system dialog. */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minimumDate?: Date;
}) {
  const t = useTheme();
  const scheme = useColorScheme();
  const date = fromISODate(value);

  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.row, { backgroundColor: t.inputBg, borderColor: t.border }]}>
        <AppText variant="label" style={{ flex: 1 }}>
          {label}
        </AppText>
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          accentColor={t.primary}
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          minimumDate={minimumDate}
          onValueChange={(_, d) => onChange(toISODate(d))}
        />
      </View>
    );
  }

  const open = () =>
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      minimumDate,
      onValueChange: (_, d) => onChange(toISODate(d)),
    });

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${shortDate(value)}`}
      style={({ pressed }) => [styles.row, { backgroundColor: t.inputBg, borderColor: t.border }, pressed && { opacity: 0.6 }]}>
      <AppText variant="label" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText weight="600">{shortDate(value)}</AppText>
      <Ionicons name="calendar-outline" size={18} color={t.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
});
