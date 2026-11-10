'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setClinicVerification } from '@/app/(dashboard)/admin/clinics/actions'

export function ClinicVerificationButton({ clinicId, clinicName, verified }: { clinicId: string; clinicName: string; verified: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const shouldRefresh = useRef(false)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ status: 'success' | 'warning' | 'error'; message: string } | null>(null)

  const confirm = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await setClinicVerification(clinicId, !verified)
      setResult(response)
      if (response.status !== 'error') shouldRefresh.current = true
    } catch (error) {
      console.error('Clinic verification request failed:', error)
      setResult({ status: 'error', message: 'Could not confirm the update. Refresh the page to check the clinic status before trying again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setResult(null); dialogRef.current?.showModal() }} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${verified ? 'border border-amber-200 text-amber-800 hover:bg-amber-50' : 'bg-emerald-800 text-white hover:bg-emerald-900'}`}>
        {verified ? 'Revoke' : 'Verify clinic'}
      </button>
      <dialog ref={dialogRef} aria-labelledby={`verification-title-${clinicId}`} aria-describedby={`verification-description-${clinicId}`} onCancel={(event) => { if (loading) event.preventDefault() }} onClose={() => { if (shouldRefresh.current) { shouldRefresh.current = false; router.refresh() } }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-emerald-100 bg-white p-6 text-emerald-950 shadow-xl backdrop:bg-black/40">
        <h2 id={`verification-title-${clinicId}`} className="text-lg font-semibold">{verified ? 'Revoke clinic verification?' : 'Verify clinic?'}</h2>
        <p id={`verification-description-${clinicId}`} className="mt-3 text-sm text-gray-600">
          {verified ? `Mark ${clinicName} as pending review?` : `Verify ${clinicName} and email its account owner?`}
        </p>
        {result && <p role={result.status === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-md p-3 text-sm ${result.status === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{result.message}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={loading} onClick={() => dialogRef.current?.close()} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold disabled:opacity-50">{result && result.status !== 'error' ? 'Done' : 'Cancel'}</button>
          {(!result || result.status === 'error') && <button type="button" disabled={loading} onClick={confirm} className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">{loading ? 'Updating...' : verified ? 'Revoke verification' : 'Confirm verification'}</button>}
        </div>
      </dialog>
    </>
  )
}
