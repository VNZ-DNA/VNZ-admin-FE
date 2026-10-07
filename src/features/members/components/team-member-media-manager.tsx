import { Button } from '@heroui/react'
import { RefreshCw, Trash2, Upload } from 'lucide-react'
import { type ChangeEvent, useRef, useState } from 'react'

import {
  removeTeamMemberMedia,
  setTeamMemberMediaFile,
  type TeamMemberMediaDraft,
  type TeamMemberMediaKind,
} from '@/features/members/member-media'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/x-flac'])

type TeamMemberMediaManagerProps = {
  value: TeamMemberMediaDraft
  onChange: (value: TeamMemberMediaDraft) => void
  disabled?: boolean
}

const mediaSlots: Array<{
  kind: TeamMemberMediaKind
  label: string
  accept: string
  formats: string
}> = [
  {
    kind: 'avatar',
    label: 'Avatar',
    accept: 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
    formats: 'JPG, JPEG, PNG, GIF hoặc WebP',
  },
  {
    kind: 'animation',
    label: 'Animation',
    accept: 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
    formats: 'JPG, JPEG, PNG, GIF hoặc WebP',
  },
  {
    kind: 'background',
    label: 'Background',
    accept: 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
    formats: 'JPG, JPEG, PNG, GIF hoặc WebP',
  },
  {
    kind: 'audio',
    label: 'Audio',
    accept: 'audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/flac,.mp3,.wav,.m4a,.ogg,.flac',
    formats: 'MP3, WAV, M4A, OGG hoặc FLAC',
  },
]

function validateFile(file: File, kind: TeamMemberMediaKind): string | null {
  if (file.size === 0) return 'File không được để trống.'
  if (file.size > MAX_FILE_BYTES) return 'File không được vượt quá 5 MB.'

  const allowedTypes = kind === 'audio' ? AUDIO_TYPES : IMAGE_TYPES
  if (!allowedTypes.has(file.type)) {
    return kind === 'audio'
      ? 'Chỉ hỗ trợ MP3, WAV, M4A, OGG hoặc FLAC.'
      : 'Chỉ hỗ trợ JPG, JPEG, PNG hoặc GIF/WebP.'
  }

  return null
}

function getFileName(slot: TeamMemberMediaDraft[TeamMemberMediaKind]): string {
  if (slot.file) return slot.file.name
  if (slot.removed) return 'File sẽ được gỡ khi lưu'
  if (slot.currentUrl) {
    const path = slot.currentUrl.split(/[?#]/, 1)[0]
    const fileName = path.split('/').pop()?.trim()
    if (fileName) return decodeURIComponent(fileName)
    return 'Đang dùng file hiện tại'
  }
  return 'Chưa có file'
}

export function TeamMemberMediaManager({
  value,
  onChange,
  disabled = false,
}: TeamMemberMediaManagerProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const animationInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const inputRefs = {
    avatar: avatarInputRef,
    animation: animationInputRef,
    background: backgroundInputRef,
    audio: audioInputRef,
  }
  const [errors, setErrors] = useState<Partial<Record<TeamMemberMediaKind, string>>>({})

  function chooseFile(kind: TeamMemberMediaKind) {
    inputRefs[kind].current?.click()
  }

  function handleFile(kind: TeamMemberMediaKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const error = validateFile(file, kind)
    if (error) {
      setErrors((current) => ({ ...current, [kind]: error }))
      return
    }

    setErrors((current) => ({ ...current, [kind]: undefined }))
    onChange(setTeamMemberMediaFile(value, kind, file))
  }

  function removeFile(kind: TeamMemberMediaKind) {
    setErrors((current) => ({ ...current, [kind]: undefined }))
    onChange(removeTeamMemberMedia(value, kind))
  }

  return (
    <section className="team-member-media" aria-labelledby="team-member-media-heading">
      <div className="team-member-media__heading">
        <h2 id="team-member-media-heading">MEDIA</h2>
        <span>File hồ sơ tùy chọn</span>
      </div>

      <div className="team-member-media__list">
        {mediaSlots.map(({ kind, label, accept, formats }) => {
          const slot = value[kind]
          const hasMedia = Boolean(slot.file || (slot.currentUrl && !slot.removed))

          return (
            <div className="team-member-media__row" key={kind}>
              <label className="team-member-media__label" htmlFor={`team-member-${kind}-file`}>{label}</label>
              <input
                className="team-member-media__filename"
                value={getFileName(slot)}
                readOnly
                aria-label={`Tên file ${label}`}
              />
              <input
                ref={inputRefs[kind]}
                id={`team-member-${kind}-file`}
                className="team-member-media__input"
                type="file"
                accept={accept}
                onChange={(event) => handleFile(kind, event)}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                isDisabled={disabled}
                onClick={() => chooseFile(kind)}
              >
                {hasMedia ? <RefreshCw size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}
                {hasMedia ? 'Thay file' : 'Tải lên'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={`Gỡ ${label}`}
                isDisabled={disabled || (!slot.file && !slot.currentUrl)}
                onClick={() => removeFile(kind)}
              >
                <Trash2 size={15} aria-hidden="true" />
              </Button>
              <span className="team-member-media__hint">{formats} · tối đa 5 MB</span>
              {errors[kind] && <span className="team-member-media__error" role="alert">{errors[kind]}</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
