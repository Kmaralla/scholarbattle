'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AvatarUpload({
  userId,
  username,
  currentUrl,
}: {
  userId: string
  username: string
  currentUrl: string | null
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB'); return }
    if (!file.type.startsWith('image/')) { setError('File must be an image'); return }

    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('Upload failed — make sure the avatars bucket exists in Supabase Storage.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = publicUrl + '?t=' + Date.now()

    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUrl(urlWithBust)
    setUploading(false)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group"
      >
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white/10">
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white">
              {username[0].toUpperCase()}
            </div>
          )}
        </div>
        {/* Overlay */}
        <div className={cn(
          'absolute inset-0 rounded-full flex items-center justify-center transition-all',
          uploading
            ? 'bg-black/60'
            : 'bg-black/0 group-hover:bg-black/50'
        )}>
          {uploading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>

      <p className="text-xs text-white/40">{uploading ? 'Uploading...' : 'Tap to change photo'}</p>
      {error && <p className="text-xs text-red-400 font-semibold text-center max-w-[200px]">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
