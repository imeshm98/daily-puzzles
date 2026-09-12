import type { Metadata } from "next";
import { ColourMixGame } from "@/games/colourmix/components/colour-mix-game";
import { colourMixConfig } from "@/games/colourmix/config";

export const metadata: Metadata = {
  title: colourMixConfig.name,
  description: colourMixConfig.tagline,
};

export default function ColourMixPage() {
  return <ColourMixGame />;
}
