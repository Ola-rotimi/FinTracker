import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import type { IconName } from '@/db/types';
import { useTheme } from '@/lib/theme';

export function Screen({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={[styles.screen, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator color={t.primary} />
    </View>
  );
}

type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

export function AppText({
  variant = 'body',
  color,
  weight,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: string; weight?: '400' | '500' | '600' | '700' | '800' }) {
  const t = useTheme();
  const muted = variant === 'caption' || variant === 'label';
  return (
    <Text
      style={[textStyles[variant], { color: color ?? (muted ? t.muted : t.text) }, weight && { fontWeight: weight }, style]}
      {...rest}
    />
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const t = useTheme();
  const cardStyle = [styles.card, { backgroundColor: t.card, borderColor: t.border }, style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = { primary: t.primary, secondary: t.primarySoft, danger: 'transparent', ghost: 'transparent' }[variant];
  const fg = { primary: t.onPrimary, secondary: t.primary, danger: t.expense, ghost: t.primary }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'danger' && { borderWidth: 1, borderColor: t.expense },
        (pressed || disabled) && styles.pressed,
        style,
      ]}>
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function HeaderButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={10} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={24} color={t.primary} />
    </Pressable>
  );
}

export function Field({ label, hint, prefix, style, ...input }: TextInputProps & { label: string; hint?: string; prefix?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.field, style as StyleProp<ViewStyle>]}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={[styles.inputWrap, { backgroundColor: t.inputBg, borderColor: t.border }]}>
        {prefix ? <AppText color={t.muted}>{prefix}</AppText> : null}
        <TextInput placeholderTextColor={t.muted} style={[styles.input, { color: t.text }]} {...input} />
      </View>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.inputBg, borderColor: t.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: t.card, ...styles.segmentActive }]}>
            <Text style={[styles.segmentText, { color: active ? t.text : t.muted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ progress, color, height = 8 }: { progress: number; color: string; height?: number }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: t.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

export function IconBadge({ icon, color, size = 40 }: { icon: IconName; color: string; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22` }]}>
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="heading">{title}</AppText>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={{ color: t.primary, fontWeight: '600' }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  chevron = !!onPress,
}: {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {icon && <IconBadge icon={icon} color={iconColor ?? t.primary} size={38} />}
      <View style={{ flex: 1 }}>
        <AppText weight="600" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {chevron && <Ionicons name="chevron-forward" size={18} color={t.muted} />}
    </Pressable>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 2 }} />;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={t.muted} />
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      {message ? <AppText style={{ textAlign: 'center', color: t.muted }}>{message}</AppText> : null}
      {action && <Button title={action.label} onPress={action.onPress} icon="add" style={{ marginTop: 8 }} />}
    </View>
  );
}

/** Label / value pair laid out on one line, used in result cards. */
export function StatLine({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.statLine}>
      <AppText style={{ flex: 1 }} weight={bold ? '700' : undefined}>
        {label}
      </AppText>
      <AppText color={color} weight={bold ? '800' : '600'} selectable>
        {value}
      </AppText>
    </View>
  );
}

const textStyles = StyleSheet.create({
  display: { fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] },
  title: { fontSize: 22, fontWeight: '700' },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12.5 },
});

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  pressed: { opacity: 0.6 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  headerButton: { paddingHorizontal: 8 },
  field: { gap: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  input: { flex: 1, minHeight: 46, fontSize: 16 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 3, borderWidth: StyleSheet.hairlineWidth },
  segment: { flex: 1, minHeight: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  badge: { alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32, paddingHorizontal: 24 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
