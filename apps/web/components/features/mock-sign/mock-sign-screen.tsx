'use client';

import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Simulated Setu hosted signing screen — only reached in stub mode (the stub Setu
 * client points signerUrl here). Mimics the Aadhaar OTP step, then returns the signer
 * to the app's redirectUrl exactly like the real hosted page does.
 */
export function MockSignScreen({ id, redirect }: { id: string; redirect: string }) {
  const [otp, setOtp] = useState('');
  const [signing, setSigning] = useState(false);

  const complete = () => {
    setSigning(true);
    const url = new URL(redirect);
    url.searchParams.set('id', id);
    url.searchParams.set('signerIdentifier', 'signer');
    url.searchParams.set('success', 'true');
    window.location.href = url.toString();
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Simulated Setu Aadhaar eSign
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Verify with Aadhaar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            In production this is Setu&apos;s hosted page: the signer enters their Aadhaar number,
            receives an OTP on their linked mobile, and eSigns. This sandbox screen simulates that
            step.
          </p>
          <div>
            <Label htmlFor="otp" className="mb-2 block">
              Enter OTP (any 6 digits)
            </Label>
            <Input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              placeholder="482301"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            loading={signing}
            disabled={otp.length < 6}
            onClick={complete}
          >
            <CheckCircle2 className="h-4 w-4" />
            Sign document
          </Button>
          <p className="text-center font-mono text-xs text-muted-foreground">{id}</p>
        </CardContent>
      </Card>
    </div>
  );
}
