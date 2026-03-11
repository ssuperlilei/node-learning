/** 登录请求体 */
export interface LoginDto {
  username: string;
  password: string;
}

/** 注册请求体 */
export interface RegisterDto {
  username: string;
  password: string;
  email?: string;
}

/** JWT 荷载（写入 token，解析后挂在 req.user） */
export interface JwtPayload {
  userId: number;
  username: string;
  iat?: number;
  exp?: number;
}

/** 登录成功响应 */
export interface LoginResult {
  token: string;
  user: { id: number; username: string; email?: string | null };
}
