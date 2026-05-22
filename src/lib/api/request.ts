/**
 * API 请求工具函数
 * 自动携带 Token 认证
 */

interface RequestOptions extends RequestInit {
  skipAuth?: boolean; // 是否跳过认证
}

/**
 * 获取存储的 Token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * 获取存储的管理员 Token
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

/**
 * 获取用户信息
 */
export function getUserInfo(): any {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user_info');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * 检查管理员是否已登录
 */
export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

/**
 * 清除认证信息
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user_info');
  localStorage.removeItem('user_id');
  localStorage.removeItem('guardian_user');
}

/**
 * 通用 API 请求函数（自动携带 Token）
 */
export async function apiRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { skipAuth = false, headers = {}, ...restOptions } = options;
  
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  // 自动添加 Token（除非明确跳过）
  if (!skipAuth) {
    const token = getToken();
    if (token) {
      (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
  }
  
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });
  
  // 处理 401 未授权响应（Token 过期或无效）
  if (response.status === 401 && !skipAuth) {
    clearAuth();
    // 触发全局事件，通知应用用户需要重新登录
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
  }
  
  return response;
}

/**
 * 管理员 API 请求函数（自动携带管理员 Token）
 */
export async function adminApiRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { headers = {}, ...restOptions } = options;
  
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  // 自动添加管理员 Token
  const adminToken = getAdminToken();
  if (adminToken) {
    (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${adminToken}`;
  }
  
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });
  
  // 处理 401 未授权响应（Token 过期或无效）
  if (response.status === 401) {
    localStorage.removeItem('admin_info');
    localStorage.removeItem('admin_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin-logged-out'));
      window.location.href = '/admin/login';
    }
  }
  
  return response;
}

/**
 * GET 请求
 */
export async function apiGet(url: string, options: RequestOptions = {}): Promise<any> {
  const response = await apiRequest(url, { ...options, method: 'GET' });
  return response.json();
}

/**
 * POST 请求
 */
export async function apiPost(url: string, data?: any, options: RequestOptions = {}): Promise<any> {
  const response = await apiRequest(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

/**
 * PUT 请求
 */
export async function apiPut(url: string, data?: any, options: RequestOptions = {}): Promise<any> {
  const response = await apiRequest(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  return response.json();
}

/**
 * DELETE 请求
 */
export async function apiDelete(url: string, options: RequestOptions = {}): Promise<any> {
  const response = await apiRequest(url, { ...options, method: 'DELETE' });
  return response.json();
}
