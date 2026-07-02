/**
 * 安全解码 JWT payload（支持 base64url）
 */
export function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad === 2) base64 += '==';
    else if (pad === 3) base64 += '=';
    else if (pad === 1) return null;
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * 从 localStorage/sessionStorage 同步读取律师身份
 */
export function getFallbackFromStorage(): {
  isLawyer: boolean;
  lawyerId: string | null;
  userId: string | null;
} {
  if (typeof window === 'undefined') {
    return { isLawyer: false, lawyerId: null, userId: null };
  }

  const token = localStorage.getItem('token');
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload && (payload.userType === 'lawyer' || payload.lawyerId)) {
      return {
        isLawyer: true,
        lawyerId: payload.lawyerId || null,
        userId: payload.id || null,
      };
    }
  }

  const userInfoStr = localStorage.getItem('user_info');
  if (userInfoStr) {
    try {
      const userData = JSON.parse(userInfoStr);
      const isLawyer =
        userData.isLawyer === true ||
        userData.userType === 'lawyer' ||
        !!userData.lawyerInfo;
      if (isLawyer) {
        return {
          isLawyer: true,
          lawyerId: userData.lawyerInfo?.id || userData.lawyerId || null,
          userId: userData.id || null,
        };
      }
    } catch {
      // ignore
    }
  }

  const savedLawyerId = sessionStorage.getItem('currentLawyerId');
  if (savedLawyerId) {
    return { isLawyer: true, lawyerId: savedLawyerId, userId: null };
  }

  return { isLawyer: false, lawyerId: null, userId: null };
}
