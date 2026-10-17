import type { Metadata } from "next";
import { InstallPage } from "@/components/pwa/install-page";

export const metadata: Metadata = { title: "Install — Blinq" };

export default function InstallRoute() {
  return <InstallPage />;
}
