import type { Metadata } from "next";

export const metadata: Metadata = { title: "NBA Team Preview", description: "Sportradar fixture test harness" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
