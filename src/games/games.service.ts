import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';

interface AuthUser { id: string; role: UserRole; }

export interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: number;
  timeLimit: number; // seconds
}

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateTambolaCard(): number[][] {
  // 3 rows × 9 columns, 5 numbers per row, 0 = blank
  // Column c contains numbers in range [c*10+1, c*10+9] (col 0: 1-9, col 8: 80-90)
  const card: number[][] = Array.from({ length: 3 }, () => Array(9).fill(0));
  const rowNeeds = [5, 5, 5];

  for (let col = 0; col < 9; col++) {
    const min = col === 0 ? 1 : col * 10;
    const max = col === 8 ? 90 : col * 10 + 9;
    const pool = shuffleArr(Array.from({ length: max - min + 1 }, (_, i) => min + i));

    const remaining = 8 - col;
    const totalLeft = rowNeeds.reduce((a, b) => a + b, 0);
    const available = [0, 1, 2].filter((r) => rowNeeds[r] > 0);

    // Determine how many to place in this column
    let count = available.length >= 2 && Math.random() > 0.4 ? 2 : 1;
    const minNeeded = Math.max(0, totalLeft - remaining * 2);
    const maxAllowed = Math.min(2, available.length);
    count = Math.max(minNeeded, Math.min(count, maxAllowed));
    count = Math.min(count, available.length);

    // Choose rows (prefer rows with more needs)
    const sorted = [...available].sort((a, b) => rowNeeds[b] - rowNeeds[a]);
    const chosen = sorted.slice(0, count).sort((a, b) => a - b);
    const nums = pool.slice(0, count).sort((a, b) => a - b);

    chosen.forEach((row, i) => {
      card[row][col] = nums[i];
      rowNeeds[row]--;
    });
  }
  return card;
}

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Volunteer: create / manage ──────────────────────────────────────────────

  async create(dto: { eventId: string; title: string; type: 'TAMBOLA' | 'QUIZ'; questions?: QuizQuestion[] }, user: AuthUser) {
    if (user.role !== UserRole.ADMIN) {
      const vol = await this.prisma.volunteer.findFirst({ where: { userId: user.id, eventId: dto.eventId } });
      if (!vol) throw new ForbiddenException('Not a volunteer for this event');
    }
    return this.prisma.gameSession.create({
      data: {
        eventId: dto.eventId,
        title: dto.title,
        type: dto.type as any,
        questions: dto.questions ? (dto.questions as any) : undefined,
      },
    });
  }

  async findAll(eventId: string) {
    return this.prisma.gameSession.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tambolaCards: true, tambolaClaims: true, quizAnswers: true } },
      },
    });
  }

  async getState(id: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id },
      include: {
        tambolaClaims: { orderBy: { claimedAt: 'asc' } },
        _count: { select: { tambolaCards: true } },
      },
    });
    if (!session) throw new NotFoundException('Game not found');
    return session;
  }

  async updateStatus(id: string, status: 'WAITING' | 'ACTIVE' | 'FINISHED') {
    return this.prisma.gameSession.update({ where: { id }, data: { status: status as any } });
  }

  async setQuestions(id: string, questions: QuizQuestion[]) {
    return this.prisma.gameSession.update({ where: { id }, data: { questions: questions as any } });
  }

  // Tambola: call next random number
  async callNumber(id: string, specificNumber?: number) {
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Game not found');
    if (session.type !== 'TAMBOLA') throw new BadRequestException('Not a tambola game');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Game is not active');

    const called = session.calledNumbers as number[];
    const remaining = Array.from({ length: 90 }, (_, i) => i + 1).filter((n) => !called.includes(n));
    if (remaining.length === 0) throw new BadRequestException('All numbers called');

    const number = specificNumber ?? remaining[Math.floor(Math.random() * remaining.length)];
    if (called.includes(number)) throw new BadRequestException(`Number ${number} already called`);

    return this.prisma.gameSession.update({
      where: { id },
      data: { calledNumbers: { push: number } },
    });
  }

  // Quiz: advance to next question
  async nextQuestion(id: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Game not found');
    if (session.type !== 'QUIZ') throw new BadRequestException('Not a quiz game');

    const questions = (session.questions as unknown as QuizQuestion[]) ?? [];
    const next = session.currentQuestion + 1;
    if (next >= questions.length) throw new BadRequestException('No more questions');

    return this.prisma.gameSession.update({
      where: { id },
      data: { currentQuestion: next, questionOpenAt: new Date(), status: 'ACTIVE' as any },
    });
  }

  // Volunteer: verify or reject a tambola claim
  async verifyClaim(claimId: string, verified: boolean) {
    return this.prisma.tambolaClaim.update({ where: { id: claimId }, data: { verified } });
  }

  // Quiz leaderboard
  async quizLeaderboard(id: string) {
    const answers = await this.prisma.quizAnswer.findMany({ where: { sessionId: id } });
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    const questions = (session?.questions as unknown as QuizQuestion[]) ?? [];

    const byParticipant: Record<string, { name: string; score: number; totalMs: number; correct: number }> = {};
    for (const a of answers) {
      if (!byParticipant[a.participantId]) {
        byParticipant[a.participantId] = { name: a.participantName ?? a.participantId, score: 0, totalMs: 0, correct: 0 };
      }
      if (a.isCorrect) {
        const tl = questions[a.questionIndex]?.timeLimit ?? 30;
        // Points: base 1000, minus time penalty, faster = more points
        const points = Math.max(100, Math.round(1000 - (a.responseMs / (tl * 1000)) * 900));
        byParticipant[a.participantId].score += points;
        byParticipant[a.participantId].correct++;
      }
      byParticipant[a.participantId].totalMs += a.responseMs;
    }

    return Object.entries(byParticipant)
      .map(([participantId, stats]) => ({ participantId, ...stats }))
      .sort((a, b) => b.score - a.score || a.totalMs - b.totalMs)
      .map((e, i) => ({ rank: i + 1, ...e }));
  }

  // ── Participant actions ─────────────────────────────────────────────────────

  async getMyCard(sessionId: string, participantId: string, participantName: string) {
    const existing = await this.prisma.tambolaCard.findUnique({
      where: { sessionId_participantId: { sessionId, participantId } },
    });
    if (existing) return existing;

    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Game not found');
    if (session.type !== 'TAMBOLA') throw new BadRequestException('Not a tambola game');

    return this.prisma.tambolaCard.create({
      data: { sessionId, participantId, rows: generateTambolaCard() as any },
    });
  }

  async claimTambola(sessionId: string, claimType: string, participantId: string, participantName: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Game not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Game is not active');

    const card = await this.prisma.tambolaCard.findUnique({
      where: { sessionId_participantId: { sessionId, participantId } },
    });
    if (!card) throw new BadRequestException('No card found — fetch your card first');

    const called = new Set(session.calledNumbers as number[]);
    const rows = card.rows as number[][];

    // Validate claim
    const rowComplete = (row: number[]) => row.filter((n) => n > 0).every((n) => called.has(n));
    const completedRows = rows.filter(rowComplete).length;
    const allComplete = rows.every(rowComplete);

    const valid =
      (claimType === 'ONE_LINE' && completedRows >= 1) ||
      (claimType === 'TWO_LINES' && completedRows >= 2) ||
      (claimType === 'FULL_HOUSE' && allComplete);

    if (!valid) throw new BadRequestException('Claim not valid — not all required numbers called yet');

    return this.prisma.tambolaClaim.upsert({
      where: { sessionId_participantId_claimType: { sessionId, participantId, claimType } },
      create: { sessionId, participantId, participantName, claimType },
      update: {},
    });
  }

  async submitQuizAnswer(sessionId: string, questionIndex: number, selectedOption: number, participantId: string, participantName: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Game not found');
    if (session.status !== 'ACTIVE') throw new BadRequestException('Game is not active');
    if (session.currentQuestion !== questionIndex) throw new BadRequestException('Wrong question index');

    const questions = (session.questions as unknown as QuizQuestion[]) ?? [];
    const q = questions[questionIndex];
    if (!q) throw new NotFoundException('Question not found');

    const responseMs = session.questionOpenAt
      ? Date.now() - new Date(session.questionOpenAt).getTime()
      : 0;

    const isCorrect = selectedOption === q.correctOption;

    return this.prisma.quizAnswer.upsert({
      where: { sessionId_participantId_questionIndex: { sessionId, participantId, questionIndex } },
      create: { sessionId, participantId, participantName, questionIndex, selectedOption, isCorrect, responseMs },
      update: { selectedOption, isCorrect, responseMs },
    });
  }

  async getGamesForEvents(eventIds: string[]) {
    return this.prisma.gameSession.findMany({
      where: { eventId: { in: eventIds }, status: { in: ['WAITING', 'ACTIVE'] } },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
