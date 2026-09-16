import Link from 'next/link'

import { BrandMark } from '@/components/site/brand-mark'
import { PUBLIC_NAV, SITE_CONFIG } from '@/lib/site'

export function SiteFooter() {
  const { contact } = SITE_CONFIG
  const hasContact = Object.values(contact).some(Boolean)

  return (
    <footer className="border-t border-border/60 bg-card/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <BrandMark size="sm" withTagline className="items-start" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {SITE_CONFIG.description}
          </p>
        </div>

        <div className="space-y-3">
          <p className="eyebrow text-muted-foreground">Explore</p>
          <ul className="space-y-2 text-sm">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                Full rental terms
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-muted-foreground hover:text-foreground">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </div>

        {hasContact && (
          <div className="space-y-3">
            <p className="eyebrow text-muted-foreground">Contact</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone}`} className="hover:text-foreground">
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="hover:text-foreground">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.city && <li>{contact.city}</li>}
              {contact.instagram && (
                <li>
                  <a
                    href={`https://instagram.com/${contact.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    @{contact.instagram}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-border/60">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Carental. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
