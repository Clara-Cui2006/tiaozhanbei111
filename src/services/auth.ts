import { reactive } from 'vue'
import { http } from '../api/http'

export type UserRole = 'ordinary' | 'department_supervisor' | 'leadership' | 'data_admin' | 'system_admin'

export interface CurrentUser {
  id: number
  username: string
  displayName: string
  role: UserRole
  department?: string | null
  permissions: string[]
}

const tokenKey = 'platform:access-token'

export const authState = reactive<{
  ready: boolean
  user: CurrentUser | null
}>({ ready: false, user: null })

export function getAccessToken() {
  return sessionStorage.getItem(tokenKey)
}

export function hasPermission(permission?: string) {
  return !permission || Boolean(authState.user?.permissions.includes(permission))
}

export async function restoreSession() {
  const token = getAccessToken()
  if (!token) {
    authState.ready = true
    authState.user = null
    return
  }
  try {
    const { data } = await http.get<CurrentUser>('/auth/me')
    authState.user = data
  } catch {
    sessionStorage.removeItem(tokenKey)
    authState.user = null
  } finally {
    authState.ready = true
  }
}

export async function login(username: string, password: string) {
  const { data } = await http.post<{ accessToken: string; user: CurrentUser }>('/auth/login', { username, password })
  sessionStorage.setItem(tokenKey, data.accessToken)
  authState.user = data.user
  authState.ready = true
}

export async function logout() {
  try {
    await http.post('/auth/logout')
  } finally {
    sessionStorage.removeItem(tokenKey)
    authState.user = null
  }
}
