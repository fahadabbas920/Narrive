import { client } from "."

export interface UserRead {
  id: string
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

export const authApi = {
  signup: (email: string, password: string) =>
    client.post<UserRead>("/api/v1/auth/signup", { email, password }),
  signin: (email: string, password: string) =>
    client.post<Token>("/api/v1/auth/signin", { email, password }),
}
