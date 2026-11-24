// UI gating only. The database (RLS + has_staff) is what actually enforces access.
export const sections = [
  { key: 'overview', label: 'Overview', roles: ['store_manager', 'finance_manager'] },
  { key: 'storefront', label: 'Storefront', roles: ['store_manager'] },
  { key: 'orders', label: 'Orders', roles: ['order_manager'] },
  { key: 'inventory', label: 'Inventory', roles: ['store_manager'] },
  { key: 'vendors', label: 'Vendors', roles: ['vendor_manager'] },
  { key: 'printing', label: 'Printing', roles: ['printing_manager'] },
  { key: 'finance', label: 'Finance', roles: ['finance_manager'] },
  { key: 'support', label: 'Support', roles: ['support'] },
  { key: 'reports', label: 'Reports', roles: ['finance_manager', 'store_manager'] },
  { key: 'pricing', label: 'Pricing & AI usage', roles: ['printing_manager', 'finance_manager'] },
  { key: 'ai', label: 'AI assistant', roles: ['finance_manager', 'store_manager'] },
  { key: 'providers', label: 'Service providers', roles: ['vendor_manager'] },
  { key: 'alerts', label: 'Alerts', roles: ['*'] },
  { key: 'staff', label: 'Staff & audit', roles: [] as string[] },
]
export const canSee = (have: string[], key: string) => {
  const s = sections.find(x => x.key === key)
  return !!s && have.length > 0 && (have.includes('super_admin') || s.roles.includes('*') || s.roles.some(r => have.includes(r)))
}
