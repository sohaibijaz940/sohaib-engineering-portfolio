import './writing.css';

import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./portfolio.css";
import "./theme.css";

export const metadata: Metadata = {
  title: {
    default: "Sohaib Ijaz â€” AI/ML & Software Engineering",
    template: "%s | Sohaib Ijaz",
  },
  description:
    "Sohaib Ijaz is a BS Computer Science student at UCP Lahore developing software, learning machine learning and documenting real engineering projects. Explore source code and technical case studies.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  icons: {
    icon: [
      { url: "/favicon.ico?v=si1", sizes: "any" },
      { url: "/icon.svg?v=si1", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=si1", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=si1", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Sohaib Ijaz | Engineering & Machine Learning",
    description: "Real projects, code, and a growing machine-learning journey.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1118",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.portfolioTheme=localStorage.getItem('portfolio-theme')==='light'?'light':'dark'}catch(e){document.documentElement.dataset.portfolioTheme='dark'}"}}/></head>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>

        {children}


      </body>
    </html>
  );
}
