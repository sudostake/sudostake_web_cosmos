import type { Metadata } from "next";
import { Geist_Mono, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixelDisplay = Press_Start_2P({
  variable: "--font-pixel-display",
  weight: "400",
  subsets: ["latin"],
});

const pixelBody = VT323({
  variable: "--font-pixel-body",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SudoStake | Stake-Backed Liquidity",
  description:
    "Borrow or lend without unstaking. Unlock USDC liquidity while validator rewards keep compounding.",
  openGraph: {
    title: "SudoStake | Stake-Backed Liquidity",
    description:
      "Borrow or lend without unstaking. Unlock USDC liquidity while validator rewards keep compounding.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SudoStake | Stake-Backed Liquidity",
    description:
      "Borrow or lend without unstaking. Unlock USDC liquidity while validator rewards keep compounding.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelDisplay.variable} ${pixelBody.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
