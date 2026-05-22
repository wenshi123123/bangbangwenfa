import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface AdminLogParams {
  adminId: number;
  adminUsername?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 记录管理员操作日志
 */
export async function logAdminAction(params: AdminLogParams): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    await supabase.from('admin_logs').insert({
      admin_id: params.adminId,
      admin_username: params.adminUsername,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  } catch (error) {
    console.error('记录管理员日志失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 常用操作类型
 */
export const AdminActions = {
  // 登录相关
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // 订单管理
  ORDER_VIEW: 'order_view',
  ORDER_UPDATE: 'order_update',
  ORDER_REFUND: 'order_refund',
  ORDER_ASSIGN: 'order_assign',
  
  // 律师管理
  LAWYER_APPROVE: 'lawyer_approve',
  LAWYER_REJECT: 'lawyer_reject',
  LAWYER_UPDATE: 'lawyer_update',
  
  // 守护者管理
  GUARDIAN_VIEW: 'guardian_view',
  GUARDIAN_UPDATE: 'guardian_update',
  
  // 提现审核
  WITHDRAWAL_APPROVE: 'withdrawal_approve',
  WITHDRAWAL_REJECT: 'withdrawal_reject',
  
  // 分成审核
  COMMISSION_APPROVE: 'commission_approve',
  COMMISSION_REJECT: 'commission_reject',
  
  // 系统配置
  CONFIG_UPDATE: 'config_update',
} as const;

export type AdminAction = typeof AdminActions[keyof typeof AdminActions];
