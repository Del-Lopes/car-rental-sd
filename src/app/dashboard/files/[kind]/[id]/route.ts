import { NextResponse } from 'next/server'

import { getCurrentProfile } from '@/lib/auth'
import { STORAGE_BUCKETS } from '@/lib/constants'
import { isPreviewMode } from '@/lib/preview'
import { createSignedUrl } from '@/lib/storage'
import { createClient } from '@/lib/supabase/server'

/**
 * Abre um documento privado.
 *
 * A UI nunca recebe o caminho do arquivo nem um link permanente: ela aponta
 * para esta rota com o id do registro. Aqui buscamos o registro com o client do
 * usuario -- entao a RLS decide se ele pode ver -- e so entao geramos um link
 * assinado de poucos minutos e redirecionamos.
 */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params
  // ?download=1 baixa o arquivo; sem ele, abre no navegador (e serve de preview).
  const download = new URL(request.url).searchParams.get('download') === '1'

  if (isPreviewMode()) {
    return new NextResponse('Preview mode: sample documents have no files attached.', { status: 404 })
  }

  const profile = await getCurrentProfile()
  if (!profile) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()

  if (kind === 'vehicle') {
    const { data } = await supabase.from('vehicle_documents').select('file_path').eq('id', id).maybeSingle()
    return redirectToSigned(STORAGE_BUCKETS.vehicleDocs, data?.file_path, download)
  }

  if (kind === 'customer') {
    const { data } = await supabase
      .from('customer_documents')
      .select('file_path, file_name')
      .eq('id', id)
      .maybeSingle()
    return redirectToSigned(STORAGE_BUCKETS.customerDocs, data?.file_path, download, data?.file_name)
  }

  return new NextResponse('Not found', { status: 404 })
}

async function redirectToSigned(
  bucket: (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS],
  path: string | null | undefined,
  download = false,
  fileName?: string | null,
) {
  // "Nao existe" e "voce nao pode ver" respondem igual, de proposito.
  if (!path) return new NextResponse('Not found', { status: 404 })

  const downloadAs = download ? (fileName ?? path.split('/').pop() ?? 'document') : undefined
  const url = await createSignedUrl(bucket, path, undefined, downloadAs)
  if (!url) return new NextResponse('Not found', { status: 404 })

  return NextResponse.redirect(url)
}
