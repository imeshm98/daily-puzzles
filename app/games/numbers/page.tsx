import type { Metadata } from "next";
import { NumbersGame } from "@/games/numbers/components/numbers-game";
import { numbersConfig } from "@/games/numbers/config";

export const metadata: Metadata = {
  title: numbersConfig.name,
  description: numbersConfig.tagline,
};

export default function NumbersPage() {
  return <NumbersGame />;
}
