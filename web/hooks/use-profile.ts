"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authApi, type ProfileUpdatePayload } from "@/lib/api/auth"
import { publicApi } from "@/lib/api/public"
import { showToast } from "@/lib/toast"

export function usePublicWriter(handle: string) {
  return useQuery({
    queryKey: ["public-writer", handle],
    queryFn: () => publicApi.getWriter(handle),
    retry: false,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => authApi.updateProfile(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user)
      queryClient.invalidateQueries({ queryKey: ["public-writer"] })
      queryClient.invalidateQueries({ queryKey: ["public-stories"] })
      showToast.success("Profile saved")
    },
    onError: (error: { detail?: string }) => {
      showToast.error(error.detail ?? "Couldn't save your profile")
    },
  })
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return debounced
}

/** Live "is this handle free?" check, debounced; skipped for the writer's current handle. */
export function useHandleAvailability(handle: string, current: string | null | undefined) {
  const debounced = useDebounced(handle.trim().toLowerCase(), 400)
  const enabled = debounced.length > 0 && debounced !== current
  const query = useQuery({
    queryKey: ["handle-available", debounced],
    queryFn: () => authApi.handleAvailable(debounced),
    enabled,
    staleTime: 30_000,
  })
  const settling = handle.trim().toLowerCase() !== debounced
  return { ...query, enabled, settling }
}
