import { router, type Href } from 'expo-router';
import { AppText, Card, Divider, ListRow, Screen } from '@/components/ui';
import type { IconName } from '@/db/types';

type Item = { icon: IconName; color: string; title: string; subtitle: string; href: Href };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Plan',
    items: [
      { icon: 'flag', color: '#10B981', title: 'Savings goals', subtitle: 'Save towards the things that matter', href: '/goals' },
      { icon: 'calendar', color: '#F97316', title: 'Bills & subscriptions', subtitle: 'Recurring payments and due dates', href: '/bills' },
    ],
  },
  {
    title: 'Financial tools',
    items: [
      { icon: 'calculator', color: '#3B82F6', title: 'Tax calculator', subtitle: 'Take-home pay with your country’s PAYE rules', href: '/tools/tax' },
      { icon: 'umbrella', color: '#8B5CF6', title: 'Pension planner', subtitle: 'Your country’s pension scheme, projected', href: '/tools/pension' },
      { icon: 'home', color: '#EF4444', title: 'Loan & mortgage', subtitle: 'Repayments, interest and overpayments', href: '/tools/loan' },
      { icon: 'trending-up', color: '#F59E0B', title: 'Savings growth', subtitle: 'See compound interest at work', href: '/tools/savings' },
      { icon: 'swap-horizontal', color: '#10B981', title: 'Currency converter', subtitle: 'Official central bank exchange rates', href: '/tools/convert' },
    ],
  },
  {
    title: 'App',
    items: [
      { icon: 'pricetags', color: '#EC4899', title: 'Categories', subtitle: 'Add, edit or archive categories', href: '/categories' },
      { icon: 'settings', color: '#64748B', title: 'Settings', subtitle: 'Currency, export and data', href: '/settings' },
    ],
  },
];

export default function MoreScreen() {
  return (
    <Screen>
      {SECTIONS.map((section) => (
        <Card key={section.title} style={{ gap: 6 }}>
          <AppText variant="label">{section.title.toUpperCase()}</AppText>
          {section.items.map((item, i) => (
            <ListRowWithDivider key={item.title} item={item} first={i === 0} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function ListRowWithDivider({ item, first }: { item: Item; first: boolean }) {
  return (
    <>
      {!first && <Divider />}
      <ListRow icon={item.icon} iconColor={item.color} title={item.title} subtitle={item.subtitle} onPress={() => router.push(item.href)} />
    </>
  );
}
