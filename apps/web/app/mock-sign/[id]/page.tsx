import { MockSignScreen } from '@/components/features/mock-sign/mock-sign-screen';
import { env } from '@/lib/env';

export default async function MockSignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { id } = await params;
  const { redirect } = await searchParams;
  return <MockSignScreen id={id} redirect={redirect ?? `${env.NEXT_PUBLIC_SITE_URL}/signing-complete`} />;
}
