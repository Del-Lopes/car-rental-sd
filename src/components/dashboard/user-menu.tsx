'use client'

import Link from 'next/link'
import { ExternalLinkIcon, LogOutIcon, UserRoundIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAction } from '@/lib/actions/auth'

export function UserMenu({ name, email }: { name: string; email: string | null }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold outline-none hover:border-brand/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {initials || <UserRoundIcon className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {email && <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/account" />}>
          <UserRoundIcon />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/" />}>
          <ExternalLinkIcon />
          View site
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAction()}>
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
