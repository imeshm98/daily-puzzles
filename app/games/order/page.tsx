import type { Metadata } from "next";
import { OrderGame } from "@/games/order/components/order-game";
import { orderConfig } from "@/games/order/config";

export const metadata: Metadata = {
  title: orderConfig.name,
  description: orderConfig.tagline,
};

export default function OrderPage() {
  return <OrderGame />;
}
