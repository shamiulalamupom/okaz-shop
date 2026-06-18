export interface User {
  id: string;
  name?: string;
  email: string;
  roles?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}
