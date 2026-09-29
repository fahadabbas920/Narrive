"use client"

import { createContext, useContext } from "react"

/** Story pages are shared by /write/stories and /admin/originals, so their links and
 * wording come from here, never hard-coded. */
export interface StoryWorkspace {
  /** List page; a story lives at `${root}/${id}`. */
  root: string
  backLabel: string
  draftHint: string
}

export const WRITER_WORKSPACE: StoryWorkspace = {
  root: "/write/stories",
  backLabel: "My stories",
  draftHint: "Only you can see this story.",
}

export const ORIGINALS_WORKSPACE: StoryWorkspace = {
  root: "/admin/originals",
  backLabel: "Narrive Originals",
  draftHint: "Only admins can see this Original.",
}

const Context = createContext<StoryWorkspace>(WRITER_WORKSPACE)

export function OriginalsWorkspace({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={ORIGINALS_WORKSPACE}>{children}</Context.Provider>
}

export function useStoryWorkspace() {
  const ws = useContext(Context)
  return { ...ws, storyPath: (id: string) => `${ws.root}/${id}` }
}
