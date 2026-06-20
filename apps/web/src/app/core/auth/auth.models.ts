export interface User {
  id: string;
  name?: string;
  nom?: string | null;
  prenom?: string | null;
  email: string;
  roles?: string[];
  avatarUrl?: string | null;
  avatarMediaId?: string | null;
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
