import axios from 'axios'

const useStaticPreview = import.meta.env.VITE_STATIC_PREVIEW === 'true'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
})

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('platform:access-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!useStaticPreview && error.response?.status === 401 && window.location.pathname !== '/login') {
      sessionStorage.removeItem('platform:access-token')
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)
