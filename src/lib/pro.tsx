/**
 * BudT Pro: subscription state via RevenueCat. Pro unlocks the Tax calculator, Pension planner
 * and currency converter. In Expo Go, RevenueCat runs in Preview API mode (no real charges).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';

/** Entitlement identifier configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT = 'pro';

/** Public SDK keys (safe to ship in the app). Set them in `.env`; see `.env.example`. */
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

type Pro = {
  isPro: boolean;
  /** False when no RevenueCat key is set, so purchases are unavailable. */
  available: boolean;
  /** Store management page for an active subscription, if any. */
  managementUrl: string | null;
  purchase: (pkg: PurchasesPackage) => Promise<'purchased' | 'cancelled'>;
  restore: () => Promise<boolean>;
  /** Development builds only: pretend to be Pro to test gated screens without buying. */
  devOverride: boolean;
  setDevOverride: (on: boolean) => void;
};

const ProContext = createContext<Pro | null>(null);

let configured = false;

function configureOnce() {
  if (configured || !API_KEY) return configured;
  Purchases.configure({ apiKey: API_KEY });
  configured = true;
  return true;
}

const hasPro = (info: CustomerInfo | null) => !!info?.entitlements.active[PRO_ENTITLEMENT];

export function ProProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [devOverride, setDevOverride] = useState(false);
  const available = !!API_KEY;

  useEffect(() => {
    if (!configureOnce()) return;
    Purchases.getCustomerInfo().then(setInfo, (e) => console.warn('RevenueCat getCustomerInfo failed', e));
    Purchases.addCustomerInfoUpdateListener(setInfo);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(setInfo);
    };
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const result = await Purchases.purchasePackage(pkg);
      setInfo(result.customerInfo);
      return 'purchased' as const;
    } catch (e) {
      if ((e as PurchasesError).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled' as const;
      throw e;
    }
  }, []);

  const restore = useCallback(async () => {
    const restored = await Purchases.restorePurchases();
    setInfo(restored);
    return hasPro(restored);
  }, []);

  const value = useMemo<Pro>(
    () => ({
      isPro: hasPro(info) || (__DEV__ && devOverride),
      available,
      managementUrl: info?.managementURL ?? null,
      purchase,
      restore,
      devOverride,
      setDevOverride,
    }),
    [info, available, purchase, restore, devOverride],
  );

  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used within ProProvider');
  return ctx;
}

export type PlanOption = { pkg: PurchasesPackage; kind: 'monthly' | 'annual' | 'lifetime'; title: string; price: string; note?: string };

/** Loads the current offering's monthly, yearly and lifetime packages for the paywall. */
export async function loadPlans(): Promise<PlanOption[]> {
  if (!configureOnce()) return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const monthly = current.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  const annual = current.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.ANNUAL);
  const lifetime = current.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.LIFETIME);

  const plans: PlanOption[] = [];
  if (annual) {
    const saving = monthly && monthly.product.price > 0 ? 1 - annual.product.price / (monthly.product.price * 12) : 0;
    plans.push({
      pkg: annual,
      kind: 'annual',
      title: 'Yearly',
      price: `${annual.product.priceString} / year`,
      note: saving >= 0.05 ? `Save ${Math.round(saving * 100)}%` : undefined,
    });
  }
  if (monthly) plans.push({ pkg: monthly, kind: 'monthly', title: 'Monthly', price: `${monthly.product.priceString} / month` });
  if (lifetime) plans.push({ pkg: lifetime, kind: 'lifetime', title: 'Lifetime', price: `${lifetime.product.priceString} once`, note: 'Pay once' });
  return plans;
}
