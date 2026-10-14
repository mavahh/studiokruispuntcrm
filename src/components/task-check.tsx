'use client'

import { useOptimistic, useTransition } from 'react'
import { Check } from 'lucide-react'
import { toggleTaskDoneAction } from '@/actions/projects'

export function TaskCheck({ id, done, title }: { id: string; done: boolean; title: string }) {
  const [optimistic, setOptimistic] = useOptimistic(done)
  const [, start] = useTransition()
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={`${title} ${optimistic ? 'niet afgewerkt' : 'afgewerkt'} markeren`}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic)
          await toggleTaskDoneAction(id, !optimistic)
        })
      }
      className={`flex h-[22px] w-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform] duration-150 active:scale-90 ${
        optimistic ? 'border-mint bg-mint text-nacht' : 'border-lijn bg-white text-transparent hover:border-groen'
      }`}
    >
      <Check size={13} strokeWidth={3} aria-hidden />
    </button>
  )
}
