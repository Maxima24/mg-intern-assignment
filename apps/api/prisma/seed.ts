/**
 * Seed a couple of deterministic signature requests so the Status page's
 * "recent requests" list has content immediately in stub mode. Idempotent:
 * upserts by signatureId.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const records = [
    {
      id: 'req_seedcomplete',
      documentId: 'doc_seedcomplete',
      signatureId: 'sig_seedcomplete',
      fileName: 'nda-acme-signed.pdf',
      documentName: 'Mutual NDA — Acme Corp',
      signerName: 'Aarav Sharma',
      signerIdentifier: 'aarav.sharma@example.com',
      birthYear: '1994',
      status: 'sign_complete',
      signerStatus: 'signed',
      signerUrl: 'https://dg-sandbox.setu.co/api/signature/sig_seedcomplete/sign',
      signatureDetails: {
        aadhaarName: 'AARAV SHARMA',
        aadhaarSuffix: '4821',
        birthYear: '1994',
        gender: 'M',
        postalCode: '560001',
      },
      rawSetu: { id: 'sig_seedcomplete', status: 'sign_complete' },
    },
    {
      id: 'req_seedpending',
      documentId: 'doc_seedpending',
      signatureId: 'sig_seedpending',
      fileName: 'employment-offer.pdf',
      documentName: 'Employment Offer Letter',
      signerName: 'Diya Nair',
      signerIdentifier: '+919812345678',
      birthYear: null,
      status: 'sign_pending',
      signerStatus: 'pending',
      signerUrl: 'https://dg-sandbox.setu.co/api/signature/sig_seedpending/sign',
      signatureDetails: null,
      rawSetu: { id: 'sig_seedpending', status: 'sign_pending' },
    },
  ];

  for (const r of records) {
    await prisma.signatureRequest.upsert({
      where: { signatureId: r.signatureId },
      create: r,
      update: {
        status: r.status,
        signerStatus: r.signerStatus,
        signatureDetails: r.signatureDetails ?? undefined,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${records.length} signature requests.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
