export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  lastLogin?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message?: string;
}
