import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Newsreader } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headings and the wordmark — high-contrast, literary.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

// The manuscript face: what writers actually see their own words in.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "GitWriter — version control for writers",
    template: "%s · GitWriter",
  },
  description:
    "Draft, revise and keep every version of your book. GitWriter gives your manuscript a memory, so no sentence is ever lost.",
};

// Applies the saved theme before first paint so night writers never get flashed
// with a white page. Kept inline and tiny on purpose.
const themeScript = `
try {
  var t = localStorage.getItem('gitwriter-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${newsreader.variable} h-full antialiased`}
      // Browser extensions (e.g. Dark Reader) add attributes to <html> before
      // React hydrates, as does the theme script above. Only suppresses this
      // element's own attribute mismatches.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-2)',
              fontSize: '14px',
              padding: '10px 14px',
              maxWidth: '26rem',
            },
            success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--surface)' } },
            error: { iconTheme: { primary: 'var(--del-fg)', secondary: 'var(--surface)' } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
