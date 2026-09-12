import type { Metadata } from "next";
import { DistanceGame } from "@/games/distance/components/distance-game";
import { distanceConfig } from "@/games/distance/config";

export const metadata: Metadata = {
  title: distanceConfig.name,
  description: distanceConfig.tagline,
};

export default function DistancePage() {
  return <DistanceGame />;
}
