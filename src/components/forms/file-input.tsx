'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { oversizeMessage, shrinkImage } from '@/lib/client-image'

/**
 * Campo de arquivo que reduz fotos grandes assim que sao escolhidas e troca o
 * arquivo do proprio input, entao o formulario envia a versao reduzida sem
 * precisar saber disso. O que continua grande demais e recusado aqui mesmo,
 * com mensagem clara, em vez de estourar o limite da Vercel no envio.
 */
export function FileInput(props: Omit<React.ComponentProps<'input'>, 'type' | 'onChange'>) {
  const [processing, setProcessing] = useState(false)

  const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    setProcessing(true)
    const prepared = await shrinkImage(file)
    setProcessing(false)

    const tooLarge = oversizeMessage(prepared)
    if (tooLarge) {
      toast.error(tooLarge)
      input.value = ''
      return
    }

    if (prepared !== file) {
      const transfer = new DataTransfer()
      transfer.items.add(prepared)
      input.files = transfer.files
    }
  }

  return (
    <div className="space-y-1">
      <Input {...props} type="file" onChange={onChange} aria-busy={processing} />
      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {processing ? 'Optimizing photo…' : ''}
      </p>
    </div>
  )
}
