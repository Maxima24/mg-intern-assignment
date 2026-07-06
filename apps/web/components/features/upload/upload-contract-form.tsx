'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { uploadContractFormSchema, type UploadContractFormValues } from '@mango/shared';
import { ApiError } from '@/lib/api/client';
import { esignApi, type SignatureRecord } from '@/lib/api/esign';
import { env } from '@/lib/env';
import { useRecentRequests } from '@/stores/recent-requests-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError, Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PdfDropzone } from './pdf-dropzone';
import { UploadResultCard } from './upload-result-card';

export function UploadContractForm() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [record, setRecord] = useState<SignatureRecord | null>(null);
  const addRecent = useRecentRequests((s) => s.add);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadContractFormValues>({
    resolver: zodResolver(uploadContractFormSchema),
    defaultValues: { signerName: '', signerIdentifier: '', birthYear: '', documentName: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: UploadContractFormValues) => {
      const form = new FormData();
      form.append('file', file as File);
      form.append('signerName', values.signerName);
      form.append('signerIdentifier', values.signerIdentifier);
      if (values.birthYear) form.append('birthYear', values.birthYear);
      if (values.documentName) form.append('documentName', values.documentName);
      form.append('redirectUrl', `${env.NEXT_PUBLIC_SITE_URL}/signing-complete`);
      return esignApi.upload(form);
    },
    onSuccess: (result) => {
      addRecent({
        signatureId: result.signatureId,
        documentName: result.documentName,
        fileName: result.fileName,
        signerName: result.signerName,
        status: result.status,
        createdAt: result.createdAt,
      });
      toast.success('Signature request created');
      setRecord(result);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Something went wrong';
      toast.error(message);
    },
  });

  const onSubmit = (values: UploadContractFormValues) => {
    if (!file) {
      setFileError('Please attach a PDF to sign.');
      return;
    }
    mutation.mutate(values);
  };

  if (record) {
    return (
      <div className="space-y-4">
        <UploadResultCard record={record} />
        <Button
          variant="ghost"
          onClick={() => {
            setRecord(null);
            setFile(null);
          }}
        >
          Upload another contract
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload a contract</CardTitle>
        <CardDescription>
          Attach a PDF and the signer&apos;s details. We&apos;ll send it to Setu for Aadhaar eSign
          and hand you a signing link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <Label className="mb-2 block">Contract PDF</Label>
            <PdfDropzone
              file={file}
              disabled={mutation.isPending}
              onFile={(f) => {
                setFile(f);
                setFileError(null);
              }}
              onError={(msg) => setFileError(msg)}
            />
            <FieldError>{fileError}</FieldError>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="signerName" className="mb-2 block">
                Signer name
              </Label>
              <Input
                id="signerName"
                placeholder="Aarav Sharma"
                disabled={mutation.isPending}
                {...register('signerName')}
              />
              <FieldError>{errors.signerName?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="signerIdentifier" className="mb-2 block">
                Signer email or phone
              </Label>
              <Input
                id="signerIdentifier"
                placeholder="aarav@example.com"
                disabled={mutation.isPending}
                {...register('signerIdentifier')}
              />
              <FieldError>{errors.signerIdentifier?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="birthYear" className="mb-2 block">
                Birth year <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="birthYear"
                placeholder="1994"
                inputMode="numeric"
                disabled={mutation.isPending}
                {...register('birthYear')}
              />
              <FieldError>{errors.birthYear?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor="documentName" className="mb-2 block">
                Document name <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="documentName"
                placeholder="Mutual NDA"
                disabled={mutation.isPending}
                {...register('documentName')}
              />
              <FieldError>{errors.documentName?.message}</FieldError>
            </div>
          </div>

          <Button type="submit" size="lg" loading={mutation.isPending} className="w-full">
            {mutation.isPending ? 'Creating signature request…' : 'Send for signature'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
