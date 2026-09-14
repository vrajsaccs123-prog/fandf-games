/**
 * Root "/" — redirect to the game catalogue.
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/games");
}
