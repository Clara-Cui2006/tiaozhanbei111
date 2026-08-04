export interface SocketHandlers {
  onOpen?: () => void
  onMessage?: (payload: unknown) => void
  onClose?: () => void
  onError?: () => void
}

export function createPlatformSocket(handlers: SocketHandlers = {}) {
  const socketUrl = import.meta.env.VITE_WS_URL
  let ws: WebSocket | null = null

  const connect = () => {
    if (!socketUrl) return false
    ws = new WebSocket(socketUrl)

    ws.onopen = () => handlers.onOpen?.()
    ws.onmessage = (event) => {
      try {
        handlers.onMessage?.(JSON.parse(event.data))
      } catch {
        handlers.onMessage?.(event.data)
      }
    }
    ws.onclose = () => handlers.onClose?.()
    ws.onerror = () => handlers.onError?.()
    return true
  }

  const disconnect = () => {
    ws?.close()
    ws = null
  }

  const send = (payload: unknown) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(payload))
  }

  return {
    connect,
    disconnect,
    send
  }
}
