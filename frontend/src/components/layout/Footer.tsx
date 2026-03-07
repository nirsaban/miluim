'use client';

export function Footer() {
  return (
    <footer className="bg-military-800 text-white py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-lg font-bold">פלוגת יוגב – ביחד מנצחים</p>
        <p className="text-sm text-military-300 mt-2">
          מערכת תפעול פלוגתית &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
