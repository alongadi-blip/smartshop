'use client'

import { useState } from 'react'
import { AlertTriangle, Info, Link2, Loader2, PenLine, Sparkles, Type } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { draftFromExtraction, RecipeForm, type RecipeDraft } from '@/components/recipe-form'
import type { ExtractionMethod, ExtractionResult } from '@/lib/types'
import type { MyGroup } from '@/lib/queries'

const METHOD_NOTE: Record<ExtractionMethod, string | null> = {
  'json-ld': 'המתכון נקרא ישירות מהנתונים המובנים של האתר — בדרך כלל מדויק.',
  microdata: 'המתכון נקרא מהתגיות המובנות של האתר — בדרך כלל מדויק.',
  llm: 'המתכון חולץ מהטקסט על ידי Claude. כדאי לעבור על המצרכים לפני השמירה.',
  opengraph: null,
  empty: null,
}

const EMPTY_DRAFT: RecipeDraft = {
  title: '',
  description: '',
  image_url: null,
  source_url: null,
  source_type: 'manual',
  source_name: null,
  servings: '',
  prep_minutes: '',
  cook_minutes: '',
  ingredients: [{ quantity: null, unit: null, item: '', note: null }],
  instructions: [''],
  tags: [],
  notes: '',
  is_private: true,
  group_id: null,
}

export function AddRecipe({ groups }: { groups: MyGroup[] }) {
  const [tab, setTab] = useState('link')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [draft, setDraft] = useState<RecipeDraft | null>(null)

  async function extract(body: { url: string } | { text: string }) {
    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? 'החילוץ נכשל.')
        return
      }

      setResult(data as ExtractionResult)
      setDraft(draftFromExtraction((data as ExtractionResult).recipe))
    } catch {
      setError('החילוץ נכשל. בדקו את החיבור ונסו שוב.')
    } finally {
      setPending(false)
    }
  }

  if (draft) {
    const note = result ? METHOD_NOTE[result.method] : null

    return (
      <div className="space-y-6">
        {result?.warning ? (
          <Notice tone="warning" icon={AlertTriangle} text={result.warning} />
        ) : note ? (
          <Notice tone="info" icon={result?.method === 'llm' ? Sparkles : Info} text={note} />
        ) : null}

        <RecipeForm initial={draft} groups={groups} />

        <Button
          type="button"
          variant="ghost"
          className="cursor-pointer text-muted-foreground"
          onClick={() => {
            setDraft(null)
            setResult(null)
          }}
        >
          חזרה לבחירת מקור
        </Button>
      </div>
    )
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="link" className="cursor-pointer gap-1.5">
          <Link2 className="size-4" aria-hidden />
          קישור
        </TabsTrigger>
        <TabsTrigger value="text" className="cursor-pointer gap-1.5">
          <Type className="size-4" aria-hidden />
          טקסט חופשי
        </TabsTrigger>
        <TabsTrigger value="manual" className="cursor-pointer gap-1.5">
          <PenLine className="size-4" aria-hidden />
          ידני
        </TabsTrigger>
      </TabsList>

      <TabsContent value="link" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="url">קישור למתכון</Label>
          <Input
            id="url"
            dir="ltr"
            className="field-ltr h-12"
            inputMode="url"
            placeholder="https://www.instagram.com/p/…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && url.trim()) {
                event.preventDefault()
                void extract({ url: url.trim() })
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            אתרי מתכונים נקראים במלואם. באינסטגרם ובפייסבוק עדיף להעתיק את הכיתוב ולהדביק
            בלשונית &quot;טקסט חופשי&quot;.
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full cursor-pointer"
          disabled={pending || !url.trim()}
          onClick={() => void extract({ url: url.trim() })}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? 'קוראים את העמוד…' : 'חילוץ המתכון'}
        </Button>
      </TabsContent>

      <TabsContent value="text" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="text">הדביקו את המתכון</Label>
          <Textarea
            id="text"
            rows={10}
            placeholder={'עוגת שוקולד\n\n200 גרם שוקולד מריר\n3 ביצים\n…'}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full cursor-pointer"
          disabled={pending || text.trim().length < 40}
          onClick={() => void extract({ text: text.trim() })}
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? 'מפענחים…' : 'חילוץ המתכון'}
        </Button>
      </TabsContent>

      <TabsContent value="manual" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          נתחיל מדף ריק, ותמלאו הכול בעצמכם.
        </p>
        <Button
          type="button"
          size="lg"
          className="w-full cursor-pointer"
          onClick={() => setDraft(EMPTY_DRAFT)}
        >
          פתיחת טופס ריק
        </Button>
      </TabsContent>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </Tabs>
  )
}

function Notice({
  tone,
  icon: Icon,
  text,
}: {
  tone: 'info' | 'warning'
  icon: typeof Info
  text: string
}) {
  return (
    <div
      className={
        tone === 'warning'
          ? 'flex gap-2.5 rounded-xl border border-accent/50 bg-accent/10 p-3.5 text-sm'
          : 'flex gap-2.5 rounded-xl border border-border bg-secondary/60 p-3.5 text-sm'
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-pretty">{text}</p>
    </div>
  )
}
