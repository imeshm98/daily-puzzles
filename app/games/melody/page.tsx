import type { Metadata } from "next";
import { MelodyGame } from "@/games/melody/components/melody-game";
import { melodyConfig } from "@/games/melody/config";

export const metadata: Metadata = {
  title: melodyConfig.name,
  description: melodyConfig.tagline,
};

export default function MelodyPage() {
  return <MelodyGame />;
}
