/** Lyen admin — chemins ASCII sèlman (evite 404 ak karaktè espesyal nan URL). */
export const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Overview", key: "overview" },
  { href: "/admin/ajan", label: "Ajan & demann", key: "ajan" },
  { href: "/admin/kesye", label: "Kèsye boutik", key: "kesye" },
  { href: "/admin/tranzaksyon", label: "Tranzaksyon", key: "tx" },
  { href: "/admin/moncash", label: "Moncash", key: "moncash" },
  { href: "/admin/itilizate", label: "Itilizatè", key: "users" },
  { href: "/admin/rapo", label: "Rapò", key: "reports" },
  { href: "/admin/paramet", label: "Paramèt", key: "paramet" },
] as const;
