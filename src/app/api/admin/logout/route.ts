import { NextResponse } from 'next/server';

// 管理员登出
export async function POST() {
  return NextResponse.json({ success: true });
}
