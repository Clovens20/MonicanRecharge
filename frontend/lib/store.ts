// Local store fallback so the app fully works without Supabase keys (demo mode).
// When Supabase is configured, transactions/contacts will sync there too.

export type TxLocal = {
  id: string;
  reference: string;
  user_email?: string | null;
  operator: string;
  operator_id: number;
  flag: string;
  country_code: string;
  recipient: string;
  amount_usd: number;
  amount_local: number;
  currency: string;
  type: "airtime" | "data_plan";
  plan?: string | null;
  status: "siksè" | "annatant" | "echwe";
  payment_method: "stripe" | "moncash";
  created_at: string;
};

export type ContactLocal = {
  id: string;
  name: string;
  phone: string;
  country_code: string;
  flag: string;
  operator: string;
  operator_id: number;
  created_at: string;
};

const TX_KEY = "monican_recharge_tx";
const CT_KEY = "monican_recharge_contacts";

export function getTx(): TxLocal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TX_KEY) || "[]");
  } catch {
    return [];
  }
}
export function addTx(tx: TxLocal) {
  if (typeof window === "undefined") return;
  const cur = getTx();
  cur.unshift(tx);
  localStorage.setItem(TX_KEY, JSON.stringify(cur.slice(0, 200)));
}

export function getContacts(): ContactLocal[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CT_KEY) || "[]");
  } catch {
    return [];
  }
}
export function addContact(c: ContactLocal) {
  if (typeof window === "undefined") return;
  const cur = getContacts().filter((x) => x.id !== c.id);
  cur.unshift(c);
  localStorage.setItem(CT_KEY, JSON.stringify(cur));
}
export function removeContact(id: string) {
  if (typeof window === "undefined") return;
  const cur = getContacts().filter((x) => x.id !== id);
  localStorage.setItem(CT_KEY, JSON.stringify(cur));
}
