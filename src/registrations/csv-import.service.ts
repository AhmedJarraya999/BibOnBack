import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';

interface CsvRow {
  prenom?: string;
  nom?: string;
  fullname?: string;
  'full name'?: string;
  'prénom'?: string;
  'date de naissance'?: string;
  birthdate?: string;
  dob?: string;
  genre?: string;
  gender?: string;
  sexe?: string;
  email?: string;
  'adresse e-mail'?: string;
  telephone?: string;
  téléphone?: string;
  phone?: string;
  cin?: string;
  'cin/passeport'?: string;
  passeport?: string;
  club?: string;
  'club/association'?: string;
  pays?: string;
  'pays/région'?: string;
  country?: string;
  dossard?: string;
  bib?: string;
  'numéro de dossard'?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class CsvImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromCsv(raceId: string, fileBuffer: Buffer) {
    const race = await this.prisma.race.findUnique({ where: { id: raceId } });
    if (!race) throw new BadRequestException('Race not found');

    let rows: CsvRow[];
    try {
      rows = parse(fileBuffer, {
        columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      throw new BadRequestException('Invalid CSV file — could not parse');
    }

    if (rows.length === 0) throw new BadRequestException('CSV file is empty');

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        const firstName = row['prénom'] ?? row['prenom'] ?? '';
        const lastName = row['nom'] ?? '';
        const fullName = row['fullname'] ?? row['full name'] ??
          `${firstName} ${lastName}`.trim();

        if (!fullName) { results.errors.push(`Row skipped: missing name`); results.skipped++; continue; }

        const email = row['email'] ?? row['adresse e-mail'] ?? row['adresse email'] ?? '';
        if (!email) { results.errors.push(`Row skipped (${fullName}): missing email`); results.skipped++; continue; }

        const rawDate = row['date de naissance'] ?? row['birthdate'] ?? row['dob'] ?? '';
        const birthdate = this.parseDate(rawDate);
        if (!birthdate) { results.errors.push(`Row skipped (${fullName}): invalid date "${rawDate}"`); results.skipped++; continue; }

        const rawGender = row['genre'] ?? row['gender'] ?? row['sexe'] ?? '';
        const gender = this.parseGender(rawGender);

        const phone = row['téléphone'] ?? row['telephone'] ?? row['phone'] ?? undefined;
        const cin = row['cin/passeport'] ?? row['cin'] ?? row['passeport'] ?? undefined;
        const club = row['club/association'] ?? row['club'] ?? undefined;
        const country = row['pays/région'] ?? row['pays'] ?? row['country'] ?? 'Tunisie';
        const bibNumber = row['dossard'] ?? row['bib'] ?? row['numéro de dossard'] ?? undefined;

        // upsert participant by email
        const participant = await this.prisma.participant.upsert({
          where: { email },
          update: { fullName, birthdate, gender, phone, cin, club, country },
          create: { fullName, email, birthdate, gender, phone, cin, club, country },
        });

        // upsert registration
        await this.prisma.registration.upsert({
          where: { participantId_raceId: { participantId: participant.id, raceId } },
          update: { ...(bibNumber && { bibNumber }) },
          create: {
            participantId: participant.id,
            raceId,
            paymentStatus: 'PAID',
            ...(bibNumber && { bibNumber }),
          },
        });

        results.imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Row error: ${msg}`);
        results.skipped++;
      }
    }

    return results;
  }

  private parseDate(raw: string): Date | null {
    if (!raw) return null;
    // dd/mm/yyyy
    const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
    // yyyy-mm-dd
    const ymd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) return new Date(raw);
    return null;
  }

  private parseGender(raw: string): string {
    const val = raw.toLowerCase().trim();
    if (val === 'homme' || val === 'm' || val === 'male' || val === 'h') return 'M';
    if (val === 'femme' || val === 'f' || val === 'female') return 'F';
    return 'M';
  }
}
