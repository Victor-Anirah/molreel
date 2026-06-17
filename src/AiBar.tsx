import { useEffect, useRef, useState } from 'react'
import { Mic, Sparkles } from 'lucide-react'

interface AiBarProps {
  value: string
  onChange: (value: string) => void
  /** Generate from the given text, or from the current input when omitted. */
  onGenerate: (override?: string) => void
  loading: boolean
}

/** Minimal shape of the Web Speech API (not in all TS lib.dom versions). */
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: any) => void) | null
  onend: (() => void) | null
  onerror: ((e: any) => void) | null
}

function createRecognition(): SpeechRecognitionLike | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Ctor) return null
  const rec: SpeechRecognitionLike = new Ctor()
  rec.lang = 'en-US'
  rec.interimResults = true
  // Stops automatically when the user pauses — that pause is our "done talking".
  rec.continuous = false
  return rec
}

export function AiBar({ value, onChange, onGenerate, loading }: AiBarProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')

  useEffect(() => {
    setSupported(
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    )
    return () => recRef.current?.abort?.()
  }, [])

  const startListening = () => {
    if (loading || listening) return
    const rec = createRecognition()
    if (!rec) {
      setSupported(false)
      return
    }
    recRef.current = rec
    finalRef.current = ''

    rec.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) final += transcript
        else interim += transcript
      }
      if (final) finalRef.current = `${finalRef.current} ${final}`.trim()
      onChange(`${finalRef.current} ${interim}`.trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => {
      setListening(false)
      const text = finalRef.current.trim()
      if (text) {
        onChange(text)
        onGenerate(text) // auto-generate when speech ends
      }
    }

    setListening(true)
    rec.start()
  }

  const toggleMic = () => {
    if (listening) recRef.current?.stop?.()
    else startListening()
  }

  return (
    <form
      className="aibar"
      onSubmit={(e) => {
        e.preventDefault()
        onGenerate()
      }}
    >
      <Sparkles className="aibar-spark" size={18} aria-hidden />
      <input
        className="aibar-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          listening
            ? 'Listening… say what you want'
            : 'Describe the animation — type it or tap the mic'
        }
        disabled={loading}
        aria-label="Describe the animation"
      />
      {supported && (
        <button
          type="button"
          className={`aibar-mic${listening ? ' listening' : ''}`}
          onClick={toggleMic}
          disabled={loading}
          aria-label={listening ? 'Stop listening' : 'Speak your description'}
          data-tip={listening ? 'Listening… tap to stop' : 'Speak your description'}
          data-tip-pos="below"
        >
          <Mic size={16} />
          {listening ? 'Listening' : 'Speak'}
        </button>
      )}
      <button className="aibar-btn" type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Generating…' : 'Generate'}
      </button>
    </form>
  )
}
