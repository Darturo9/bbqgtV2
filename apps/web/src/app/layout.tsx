import type { Metadata } from "next";
import { Besley } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import "./globals.css";

const brookline = localFont({
  display: "swap",
  src: "../assets/fonts/Brookline.ttf",
  variable: "--font-brookline",
  weight: "400",
});

const besley = Besley({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-besley",
});

export const metadata: Metadata = {
  title: "BBQBROS",
  description: "Pedidos a domicilio de BBQBROS.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es-GT">
      <body className={`${brookline.variable} ${besley.variable}`}>{children}</body>
    </html>
  );
}
