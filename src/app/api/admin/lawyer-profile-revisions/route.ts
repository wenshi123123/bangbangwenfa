import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    
    const supabase = getSupabaseAdmin();
    
    // 查询所有审核记录（带分页）
    const { data, error, count } = await supabase
      .from('lawyer_profile_revisions')
      .select('*, lawyers(name, phone)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 按 batch_id 聚合为卡片：同一批提交的所有记录合并为一张卡片
    const batchMap = new Map<string, {
      batch_id: string;
      lawyer_id: string;
      lawyer_name: string | null;
      reason: string;
      status: string;
      submitted_at: string;
      field_count: number;
      revision_ids: string[];
      fields: Array<{
        id: string;
        field_name: string;
        old_value: string;
        new_value: string;
        status: string;
        batch_id?: string;
      }>;
    }>();

    for (const row of (data || [])) {
      const record = row as Record<string, unknown>;
      const lawyers = record.lawyers as { name?: string; phone?: string } | null;
      const rowStatus = record.status as string;
      const batchId = (record.batch_id as string) || `single_${record.id}`;

      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batch_id: batchId,
          lawyer_id: String(record.lawyer_id ?? ''),
          lawyer_name: lawyers?.name || null,
          reason: (record.reason as string) || '',
          status: rowStatus,
          submitted_at: record.created_at as string,
          field_count: 0,
          revision_ids: [],
          fields: [],
        });
      }

      const card = batchMap.get(batchId)!;
      card.fields.push({
        id: record.id as string,
        field_name: record.field_name as string,
        old_value: record.old_value as string,
        new_value: record.new_value as string,
        status: rowStatus,
        batch_id: batchId,
      });
      card.field_count++;
      card.revision_ids.push(String(record.id));

      // 取最早提交时间
      if (new Date(record.created_at as string) < new Date(card.submitted_at)) {
        card.submitted_at = record.created_at as string;
      }
      // 只要有一个 pending，批次就是 pending
      if (rowStatus === 'pending') {
        card.status = 'pending';
        card.reason = (record.reason as string) || '';
      }
    }

    let cards = Array.from(batchMap.values());

    if (status && status !== 'all') {
      cards = cards.filter(c => c.status === status);
    }

    cards.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    const pendingCount = cards.filter(c => c.status === 'pending').length;

    return NextResponse.json({ 
      success: true, 
      cards,
      pendingCount,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) return adminUnauthorizedResponse(authResult.error);
  
  try {
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('lawyer_profile_revisions')
      .insert(body)
      .select()
      .single();
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, revision: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
