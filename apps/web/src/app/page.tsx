import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-seg-plum/20 bg-seg-plum-subtle px-4 py-1.5 text-xs font-semibold text-seg-plum">
          <span className="h-2 w-2 rounded-full bg-seg-orange animate-pulse" />
          SEG Academy CRM &bull; Phase 1 Foundation
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-seg-plum sm:text-5xl">
          SEG Academy <span className="text-seg-orange">CRM</span>
        </h1>

        <p className="text-base text-muted-foreground">
          Modular Monolith enterprise platform foundation initialized with Next.js App Router,
          NestJS REST API, and Supabase PostgreSQL.
        </p>

        {/* Brand Token Verification */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button variant="default">Deep Plum (Primary)</Button>
          <Button variant="academy">Academy Orange (Accent)</Button>
          <Button variant="gold">Golden Yellow (Highlight)</Button>
        </div>
      </div>
    </main>
  );
}
