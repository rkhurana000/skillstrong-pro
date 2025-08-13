// app/explore/page.tsx
import { redirect } from "next/navigation";

export default function Explore() {
  // Seamless: /explore now opens the coach (your chat) at /chat
  redirect("/chat");
}
