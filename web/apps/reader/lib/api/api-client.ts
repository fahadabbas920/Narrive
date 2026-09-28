type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown }
type FetchInterceptor = (url: string, options: FetchOptions) => FetchOptions
type OnUnauthorized = () => void

const requestInterceptors: FetchInterceptor[] = []
let onUnauthorizedCallback: OnUnauthorized | null = null

export const addRequestInterceptor = (interceptor: FetchInterceptor) => {
  requestInterceptors.push(interceptor)
}

export const setOnUnauthorized = (callback: OnUnauthorized) => {
  onUnauthorizedCallback = callback
}

export const fetchWithInterceptors = async <T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> => {
  let modifiedOptions = { ...options }

  for (const interceptor of requestInterceptors) {
    modifiedOptions = interceptor(url, modifiedOptions)
  }

  if (
    ["POST", "PATCH", "PUT", "DELETE"].includes(modifiedOptions.method ?? "") &&
    modifiedOptions.body &&
    typeof modifiedOptions.body === "object" &&
    !(modifiedOptions.body instanceof FormData) &&
    !(modifiedOptions.body instanceof URLSearchParams)
  ) {
    modifiedOptions.body = JSON.stringify(modifiedOptions.body)
    modifiedOptions.headers = {
      "Content-Type": "application/json",
      ...modifiedOptions.headers,
    }
  }

  let response: Response
  try {
    response = await fetch(url, modifiedOptions as RequestInit)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to connect to server"
    throw {
      status: 0,
      detail: errorMsg,
      message: "Network error — the server may be unreachable or your connection may be down",
    }
  }

  if (response.status === 401 && onUnauthorizedCallback) {
    onUnauthorizedCallback()
  }

  if (!response.ok) {
    const text = await response.clone().text()
    let errorData: Record<string, unknown>
    try {
      errorData = text ? JSON.parse(text) : { message: response.statusText }
    } catch {
      errorData = { message: response.statusText, detail: text }
    }
    if (Array.isArray(errorData.detail)) {
      throw {
        status: response.status,
        ...errorData,
        detail: errorData.detail.map((e: { msg: string }) => e.msg).join("; "),
      }
    }
    throw { status: response.status, ...errorData }
  }

  if (response.status === 204) return {} as T

  const text = await response.text()
  if (!text) return {} as T

  return JSON.parse(text) as T
}

interface ApiClient {
  baseUrl: string
}

export const apiClient = ({ baseUrl }: ApiClient) => ({
  get: async <T>(url: string): Promise<T> =>
    fetchWithInterceptors<T>(baseUrl + url, { method: "GET" }),
  post: async <T>(url: string, body: unknown): Promise<T> =>
    fetchWithInterceptors<T>(baseUrl + url, { method: "POST", body }),
  patch: async <T>(url: string, body: unknown): Promise<T> =>
    fetchWithInterceptors<T>(baseUrl + url, { method: "PATCH", body }),
  delete: async <T>(url: string, body?: unknown): Promise<T> =>
    fetchWithInterceptors<T>(baseUrl + url, { method: "DELETE", body }),
})
