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

// How long the user can stay silent before we treat them as "done" and submit.
// Generous so people can gather their thoughts mid-sentence; the on-screen
// countdown bar is synced to this, and they can always tap to send early.
const SILENCE_MS = 6000

function createRecognition(): SpeechRecognitionLike | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!Ctor) return null
  const rec: SpeechRecognitionLike = new Ctor()
  rec.lang = 'en-US'
  rec.interimResults = true
  // Keep listening across pauses; we decide when "done" via the silence timer.
  rec.continuous = true
  return rec
}

export function AiBar({ value, onChange, onGenerate, loading }: AiBarProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  // Bumped every time we (re)start the silence countdown — remounts the bar so
  // its CSS animation restarts from empty.
  const [countdownKey, setCountdownKey] = useState(0)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  const silenceRef = useRef<number | null>(null)

  const clearSilence = () => {
    if (silenceRef.current !== null) {
      clearTimeout(silenceRef.current)
      silenceRef.current = null
    }
  }

  // Restart the "done talking" countdown; firing it stops recognition.
  const armSilence = () => {
    clearSilence()
    setCountdownKey((k) => k + 1)
    silenceRef.current = window.setTimeout(() => recRef.current?.stop?.(), SILENCE_MS)
  }

  useEffect(() => {
    setSupported(
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    )
    return () => {
      clearSilence()
      recRef.current?.abort?.()
    }
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
      armSilence() // reset the countdown every time we hear something
    }
    rec.onerror = () => {
      clearSilence()
      setListening(false)
    }
    rec.onend = () => {
      clearSilence()
      setListening(false)
      const text = finalRef.current.trim()
      if (text) {
        onChange(text)
        onGenerate(text) // auto-generate once the user is done talking
      }
    }

    setListening(true)
    rec.start()
    armSilence() // start the countdown immediately
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
            ? 'Listening… speak freely, pause to think, then tap to send'
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
          data-tip={listening ? 'Listening… tap when done' : 'Speak your description'}
          data-tip-pos="below"
        >
          <Mic size={16} />
          {listening ? 'Listening' : 'Speak'}
        </button>
      )}
      <button className="aibar-btn" type="submit" disabled={loading || !value.trim()}>
        {loading ? 'Generating…' : 'Generate'}
      </button>

      {listening && (
        <div className="mic-countdown" aria-hidden>
          <div
            key={countdownKey}
            className="mic-countdown-fill"
            style={{ animationDuration: `${SILENCE_MS}ms` }}
          />
        </div>
      )}
    </form>
  )
}
