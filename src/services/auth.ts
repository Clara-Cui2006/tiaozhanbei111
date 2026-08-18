import { reactive } from 'vue'
import { http } from '../api/http'
import type { PermissionMode } from '../config/navigation'

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
const useStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true'
const staticPreviewUser: CurrentUser = {
  id: 0,
  username: 'preview',
  displayName: '平台预览',
  role: 'system_admin',
  department: null,
  permissions: []
}

export const authState = reactive<{
  ready: boolean
  user: CurrentUser | null
}>({ ready: false, user: null })

export function getAccessToken() {
  return sessionStorage.getItem(tokenKey)
}

export function hasPermission(permission?: string) {
  return true
}

export function hasPermissions(permissions?: readonly string[], mode: PermissionMode = 'any') {
  return true
}

export async function restoreSession() {
  if (useStaticPreview) {
    authState.user = staticPreviewUser
    authState.ready = true
    return
  }
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
  if (useStaticPreview) {
    authState.user = staticPreviewUser
    authState.ready = true
    return
  }
  const { data } = await http.post<{ accessToken: string; user: CurrentUser }>('/auth/login', { username, password })
  sessionStorage.setItem(tokenKey, data.accessToken)
  authState.user = data.user
  authState.ready = true
}

export async function logout() {
  if (useStaticPreview) {
    authState.user = staticPreviewUser
    authState.ready = true
    return
  }
  try {
    await http.post('/auth/logout')
  } finally {
    sessionStorage.removeItem(tokenKey)
    authState.user = null
  }
}
