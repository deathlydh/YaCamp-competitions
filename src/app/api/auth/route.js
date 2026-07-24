import { NextResponse } from 'next/server';

const JUDGE_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD_ADMIN;

export async function POST(request) {
  try {
    const { passcode } = await request.json();

    if (!passcode) {
      return NextResponse.json({ error: 'Пароль не указан' }, { status: 400 });
    }

    const trimmed = passcode.trim();

    // Check if passwords are configured in the environment
    if (!ADMIN_PASSWORD && !JUDGE_PASSWORD) {
      console.error('CRITICAL SECURITY WARNING: ADMIN_PASSWORD and ADMIN_PASSWORD_ADMIN environment variables are not set!');
      return NextResponse.json({ error: 'Сервер не настроен: обратитесь к организаторам' }, { status: 500 });
    }

    if (ADMIN_PASSWORD && trimmed === ADMIN_PASSWORD) {
      return NextResponse.json({ role: 'admin', success: true });
    }

    if (JUDGE_PASSWORD && trimmed === JUDGE_PASSWORD) {
      return NextResponse.json({ role: 'judge', success: true });
    }

    // Delay failed attempts to slow down brute force attacks
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
