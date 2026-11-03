import { router, type Href } from 'expo-router';
import { ProBadge } from '@/components/ProLock';
import { AppText, Card, Divider, ListRow, Screen } from '@/components/ui';
import type { IconName } from '@/db/types';
import { usePro } from '@/lib/pro';

type Item = { icon: IconName; color: string; title: string; subtitle: string; href: Href; pro?: boolean };

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Plan',
    items: [
      { icon: 'list', color: '#0F766E', title: 'Activity', subtitle: 'All your income and expenses', href: '/transactions' },
      { icon: 'stats-chart', color: '#6366F1', title: 'Insights', subtitle: 'Spending by category and trends', href: '/insights' },
      { icon: 'flag', color: '#10B981', title: 'Savings goals', subtitle: 'Save towards the things that matter', href: '/goals', pro: true },
      { icon: 'calendar', color: '#F97316', title: 'Bills & subscriptions', subtitle: 'Recurring payments and due dates', href: '/bills', pro: true },
    ],
  },
  {
    title: 'Financial tools',
    items: [
      { icon: 'home', color: '#EF4444', title: 'Loan & mortgage', subtitle: 'Repayments, interest and overpayments', href: '/tools/loan', pro: true },
      { icon: 'trending-up', color: '#F59E0B', title: 'Savings growth', subtitle: 'See compound interest at work', href: '/tools/savings', pro: true },
      { icon: 'swap-horizontal', color: '#10B981', title: 'Currency converter', subtitle: 'Official central bank exchange rates', href: '/tools/convert', pro: true },
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
  const { isPro } = usePro();
  return (
    <>
      {!first && <Divider />}
      <ListRow
        icon={item.icon}
        iconColor={item.color}
        title={item.title}
        subtitle={item.subtitle}
        right={item.pro && !isPro ? <ProBadge /> : undefined}
        onPress={() => router.push(item.href)}
      />
    </>
  );
}
