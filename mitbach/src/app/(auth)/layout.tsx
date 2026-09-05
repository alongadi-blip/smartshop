import { Brand } from '@/components/brand'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Brand size="lg" />
          <p className="text-sm text-muted-foreground">
            המתכונים של המשפחה, במקום אחד.
          </p>
        </div>
        {children}
      </div>
    </main>
  )
}
