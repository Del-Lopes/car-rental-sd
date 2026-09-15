import { z } from 'zod'

import { optionalText, requiredText } from '@/lib/validation/common'

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  redirectTo: z.string().optional(),
})

export const registerSchema = z
  .object({
    full_name: requiredText('Full name', 120),
    email: z.email('Enter a valid email'),
    phone: optionalText(30),
    password,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email'),
})

export const resetPasswordSchema = z
  .object({
    password,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const profileSchema = z.object({
  full_name: requiredText('Full name', 120),
  phone: optionalText(30),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ProfileValues = z.infer<typeof profileSchema>
