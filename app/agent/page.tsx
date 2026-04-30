import { redirect } from "next/navigation";

/** Lyen piblik pou revandè / sous-ajan — redirije vè tablo ajan. */
export default function AgentPlatformPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const raw = searchParams.nouvo;
  const nouvo = Array.isArray(raw) ? raw[0] : raw;
  const suffix = nouvo === "1" ? "?nouvo=1" : "";
  redirect(`/tableau-de-bord/ajan${suffix}`);
}
