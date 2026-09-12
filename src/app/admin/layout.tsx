import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminRootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';

  // Allow /admin/login without requiring an active session
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect('/admin/login?redirect=' + encodeURIComponent(pathname || '/admin'));
  }

  if (user.role === 'CUSTOMER') {
    redirect('/login?redirect=/admin&error=unauthorized');
  }

  return <>{children}</>;
}
