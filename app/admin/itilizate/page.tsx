"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type U = {
  id: string;
  email: string | undefined;
  created_at: string;
  role: string;
  banned: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [detail, setDetail] = useState<U | null>(null);

  async function load() {
    const r = await fetch("/api/admin/users");
    if (r.status === 401) return toast.error("Konekte");
    if (r.status === 403) return toast.error("Aksè refize");
    const d = await r.json();
    if (d.error) return toast.error(d.error);
    setUsers(d.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!roleFilter) return users;
    return users.filter((u) => (u.role || "kliyan") === roleFilter);
  }, [users, roleFilter]);

  async function postAction(userId: string, action: "ban" | "unban" | "role" | "reset", role?: string) {
    const r = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, role }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Erè");
    toast.success("OK");
    load();
    setDetail(null);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-black text-brand-ink">Itilizatè</h1>
      <p className="mt-1 text-sm text-black/55">Jere wòl, sispann, reset modpas (imèl recovery).</p>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="text-sm font-semibold text-emerald-900">Kreye ajan / kasiè</div>
        <p className="mt-1 text-xs text-emerald-800/80">
          Admin lan ka kreye kont a sou paj enskripsyon an, apre sa chwazi itilizatè a isit la epi mete wòl li sou
          <span className="font-semibold"> ajan </span>oswa <span className="font-semibold">kasiè</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="green">
            <Link href="/admin/kesye">Ajoute yon agent caissier</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/enskri">Louvri enskripsyon</Link>
          </Button>
          <Button size="sm" variant="green" onClick={() => setRoleFilter("ajan")}>
            Wè ajan sèlman
          </Button>
          <Button size="sm" variant="green" onClick={() => setRoleFilter("kasiè")}>
            Wè kasiè sèlman
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["", "kliyan", "kasiè", "ajan", "admin"].map((r) => (
          <Button key={r || "tout"} size="sm" variant={roleFilter === r ? "green" : "outline"} onClick={() => setRoleFilter(r)}>
            {r || "Tout"}
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={load}>
          Rafrechi
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/5 bg-brand-bg text-xs uppercase text-black/50">
            <tr>
              <th className="p-3">Imèl</th>
              <th className="p-3">Wòl</th>
              <th className="p-3">Estati</th>
              <th className="p-3">Kreye</th>
              <th className="p-3">Aksyon</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-black/5">
                <td className="p-2">{u.email || "—"}</td>
                <td className="p-2">{u.role || "kliyan"}</td>
                <td className="p-2">{u.banned ? <span className="text-red-600">Sispann</span> : "Aktif"}</td>
                <td className="p-2 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDetail(u)}>
                    Detay
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-sm text-black/45">Pa gen itilizatè.</p>}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold">{detail.email}</h2>
            <p className="mt-1 text-xs text-black/50 font-mono">{detail.id}</p>
            {detail.email ? (
              <Button asChild className="mt-3 w-full" variant="outline" size="sm">
                <Link href={`/admin/tranzaksyon?q=${encodeURIComponent(detail.email)}`}>Tranzaksyon itilizatè a</Link>
              </Button>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {detail.banned ? (
                <Button size="sm" variant="outline" onClick={() => postAction(detail.id, "unban")}>
                  Aktive
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => postAction(detail.id, "ban")}>
                  Sispann
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => postAction(detail.id, "reset")}>
                Reset modpas (imèl)
              </Button>
            </div>
            <div className="mt-4 text-xs font-semibold text-black/50">Chanje wòl</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["kliyan", "kasiè", "ajan", "admin"] as const).map((r) => (
                <Button key={r} size="sm" variant="outline" onClick={() => postAction(detail.id, "role", r)}>
                  {r}
                </Button>
              ))}
            </div>
            <Button className="mt-6 w-full" variant="outline" onClick={() => setDetail(null)}>
              Fèmen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
