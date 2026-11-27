import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Page Not Found</h2>
      <p className="mt-2 text-sm text-muted-foreground">The requested page or resource could not be found.</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-seg-plum px-4 py-2 text-sm font-medium text-white hover:bg-seg-plum/90 transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
