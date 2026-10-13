'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  ['Market', '/markets'],
  ['Strategy', '/desk'],
  ['Activity', '/activity'],
  ['Proof', '/proof'],
] as const;

export function PrimaryNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Primary navigation">{navigation.map(([label, href]) => {
    const active = pathname === href;
    return <Link href={href} key={href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}><span className="nav-dot" aria-hidden="true" />{label}</Link>;
  })}</nav>;
}
