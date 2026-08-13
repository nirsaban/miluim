import type { Metadata } from 'next';
import Link from 'next/link';
import { LeadForm } from './LeadForm';

export const metadata: Metadata = {
  title: 'מילטק - העתיד של ניהול המילואים',
  description: 'מערכת ניהול מילואים חכמה: שיבוצים, בקשות חופש, מחזורי שירות ותקשורת פנימית — במקום אחד.',
};

const FEATURES = [
  {
    title: 'שיבוצי משמרות בלי לוח אקסל',
    body: 'תבניות משמרת, אזורים ומשימות — מסודר מראש, עם דו"ח נוכחות אוטומטי בכל כניסה.',
  },
  {
    title: 'בקשות חופש בזרימה אחת',
    body: 'חייל מגיש, קצין מאשר — עם מעקב סטטוס, התראות דחיפה וסגירה עצמית בחזרה מהחופש.',
  },
  {
    title: 'מעקב מחזורי שירות מלא',
    body: 'כל תקופת מילואים עם נוכחות וצ׳ק-ליסטים משלה — בלי לאבד תמונת מצב בין מחזור למחזור.',
  },
  {
    title: 'תמונת מצב ברמת מחלקה וגדוד',
    body: 'סטטיסטיקות נוכחות, חופשות וכוח אדם — מרמת מחלקה בודדת ועד תצוגה כוללת של הגדוד.',
  },
  {
    title: 'הודעות עם אישור קריאה',
    body: 'הודעות מחלקתיות וכלליות עם מעקב מי ראה ומי לא — לא עוד "שלחתי בקבוצה ולא כולם ראו".',
  },
  {
    title: 'ייבוא נתונים והפקת דוחות',
    body: 'ייבוא כוח אדם מקובץ CSV, והפקת דוחות Word מוכנים תוך שניות — בלי הקלדה ידנית.',
  },
];

const TRUST_POINTS = [
  {
    title: 'כניסה בטוחה, בלי סיסמה לשכוח',
    body: 'קוד חד-פעמי במייל, ותמיכה בכניסה ביומטרית (Passkey) — בטוח יותר מסיסמה, ומהיר יותר מלשחזר אחת ששכחתם.',
  },
  {
    title: 'הרשאות לפי תפקיד, לא לפי ניחוש',
    body: 'תפקיד ארגוני (מ"פ, רס"פ, קצין תורן) נפרד לגמרי מרמת ההרשאה במערכת — כל אחד רואה בדיוק את מה שהתפקיד שלו דורש.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <header className="border-b border-military-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-bold text-lg text-military-800">מילטק</span>
          <Link
            href="/auth/login"
            className="rounded-full border border-military-300 px-4 py-1.5 text-sm font-semibold text-military-800 transition-colors hover:bg-military-50"
          >
            כניסה
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center">
        <p className="text-sm font-semibold text-military-700">מערכת ניהול מילואים חכמה</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
          העתיד של ניהול <span className="text-military-700">פלוגת המילואים.</span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-gray-600">
          שיבוצים, חופשות, מחזורי שירות ותקשורת פנימית — הכל במקום אחד, בלי לוחות אקסל
          ובלי הודעות שנעלמות בקבוצת וואטסאפ.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="mailto:hello@geniriflow.com"
            className="rounded-full bg-military-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-military-800"
          >
            בואו נדבר
          </a>
          <span className="text-sm text-gray-500">בלי התחייבות · הקמה מלווה אישית</span>
        </div>
      </section>

      <section className="border-t border-military-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-military-700">יכולות</p>
            <h2 className="mt-3 text-3xl font-bold">כל מה שצריך לניהול פלוגה, במקום אחד</h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-military-200 bg-gray-50 p-6 shadow-card">
                <h3 className="text-lg font-bold text-military-800">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="text-center">
          <p className="text-sm font-semibold text-military-700">אבטחה והרשאות</p>
          <h2 className="mt-3 text-3xl font-bold">בנוי בשביל מערכת ביטחונית</h2>
        </div>
        <div className="mt-10 space-y-5">
          {TRUST_POINTS.map((p, i) => (
            <div key={p.title} className="flex gap-4 rounded-2xl border border-military-200 bg-white p-6 shadow-card">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-military-100 font-bold text-military-800">
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold text-military-800">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-military-200 bg-military-700">
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white">מוכנים לעבור מגיליון אקסל למערכת אמיתית?</h2>
          <p className="mt-4 text-white/85">נראה לכם איך זה עובד על הפלוגה שלכם, בלי התחייבות.</p>
          <div className="mt-8">
            <LeadForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-military-200 py-8">
        <p className="text-center text-sm text-gray-500">מילטק · נבנה על ידי GeniriFlow</p>
      </footer>
    </div>
  );
}
