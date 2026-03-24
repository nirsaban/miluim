'use client';

export function Footer() {
  return (
    <footer className="bg-app border-t border-border-subtle text-white py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg font-bold text-content-primary">פלוגת יוגב – ביחד מנצחים</p>
        <p className="text-sm text-content-muted mt-2">
          מערכת תפעול פלוגתית &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
