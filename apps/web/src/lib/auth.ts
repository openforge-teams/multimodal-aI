import { cookies } from 'next/headers';
import { prisma } from '@dreamforge/db';
import { randomBytes, createHash } from 'crypto';

const SESSION_COOKIE = 'dreamforge_session';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const hashedToken = hashToken(token);

  // 删除旧会话
  await prisma.session.deleteMany({ where: { userId } });

  // 创建新会话，7 天过期
  await prisma.session.create({
    data: {
      userId,
      id: hashedToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return token;
}

export async function getSession(): Promise<{ user: { id: string; email: string; name: string | null } } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const hashedToken = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: hashedToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: hashedToken } });
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const hashedToken = hashToken(token);
    await prisma.session.delete({ where: { id: hashedToken } }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function signUp(email: string, password: string, name?: string): Promise<{ user: any; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('邮箱已注册');
  }

  const hashedPassword = hashToken(password + 'dreamforge_salt');

  const user = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      passwordHash: hashedPassword,
    },
  });

  // 免费赠送积分
  const freeCredits = parseInt(process.env.CREDITS_FREE_TIER || '1000', 10);
  if (freeCredits > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: freeCredits },
    });
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: freeCredits,
        type: 'subscription',
        description: '新用户注册赠送',
      },
    });
  }

  const token = await createSession(user.id);
  return { user, token };
}

export async function signIn(email: string, password: string): Promise<{ user: any; token: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new Error('邮箱或密码错误');
  }

  const hashedPassword = hashToken(password + 'dreamforge_salt');
  if (user.passwordHash !== hashedPassword) {
    throw new Error('邮箱或密码错误');
  }

  const token = await createSession(user.id);
  return { user, token };
}

export { SESSION_COOKIE };
