import { NextResponse } from 'next/server';
import { signIn, signUp, destroySession, setSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.pathname.split('/').pop();

  try {
    switch (action) {
      case 'sign-in': {
        const { email, password } = await req.json();
        const { user, token } = await signIn(email, password);
        setSessionCookie(token);
        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
      }

      case 'sign-up': {
        const { email, password, name } = await req.json();
        const { user, token } = await signUp(email, password, name);
        setSessionCookie(token);
        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
      }

      case 'sign-out': {
        await destroySession();
        return NextResponse.json({ success: true });
      }

      case 'session': {
        const { getSession } = await import('@/lib/auth');
        const session = await getSession();
        return NextResponse.json(session);
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 400 });
  }
}
