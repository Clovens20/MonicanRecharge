export type Lang = "en" | "fr" | "es" | "kr";

export const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇺🇸", label: "EN" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "kr", flag: "🇭🇹", label: "KR" },
];

type Dict = Record<string, Record<Lang, string>>;

export const t: Dict = {
  "nav.home": { en: "Home", fr: "Accueil", es: "Inicio", kr: "Akèy" },
  "nav.dashboard": { en: "Dashboard", fr: "Tableau de bord", es: "Panel", kr: "Tablo" },
  "nav.history": { en: "History", fr: "Historique", es: "Historial", kr: "Istwa" },
  "nav.contacts": { en: "Contacts", fr: "Contacts", es: "Contactos", kr: "Kontak" },
  "nav.login": { en: "Sign in", fr: "Connexion", es: "Iniciar", kr: "Konekte" },
  "nav.signup": { en: "Sign up", fr: "Inscription", es: "Registrarse", kr: "Enskri" },
  "nav.logout": { en: "Sign out", fr: "Déconnexion", es: "Cerrar sesión", kr: "Soti" },

  "hero.badge": {
    en: "⚡ Instant Recharge — 150+ Countries",
    fr: "⚡ Recharge Instantanée — 150+ Pays",
    es: "⚡ Recarga Instantánea — 150+ Países",
    kr: "⚡ Recharge Instantane — 150+ Peyi",
  },
  "hero.title": {
    en: "Send Phone Credit",
    fr: "Envoyez des Recharges",
    es: "Envía Recargas",
    kr: "Voye Recharge",
  },
  "hero.title2": {
    en: "Fast, Easy, Anywhere",
    fr: "Rapide, Simple, Partout",
    es: "Rápido, Fácil, Donde Sea",
    kr: "Rapid, Fasil, Kote ou Ye",
  },
  "hero.subtitle": {
    en: "Digicel · Natcom · Haiti & Worldwide",
    fr: "Digicel · Natcom · Haïti et Partout dans le Monde",
    es: "Digicel · Natcom · Haití y Todo el Mundo",
    kr: "Digicel · Natcom · Haiti ak tout lòt peyi",
  },

  "form.step1": { en: "Choose Operator", fr: "Choisir Opérateur", es: "Elegir Operador", kr: "Chwazi Operatè" },
  "form.step2": { en: "Recipient Number", fr: "Numéro Destinataire", es: "Número Destinatario", kr: "Nimewo Destinatè" },
  "form.step3": { en: "Choose Amount", fr: "Choisir Montant", es: "Elegir Monto", kr: "Chwazi Montant" },
  "form.step4": { en: "Pay", fr: "Payer", es: "Pagar", kr: "Peye" },
  "form.airtime": { en: "Airtime", fr: "Crédit d'appel", es: "Saldo", kr: "Minit" },
  "form.data": { en: "Data Plan", fr: "Forfait Données", es: "Plan de Datos", kr: "Forfè Done" },
  "form.custom": { en: "Custom amount", fr: "Montant personnalisé", es: "Monto personalizado", kr: "Lòt montant" },
  "form.recipient_gets": { en: "Recipient gets", fr: "Le destinataire reçoit", es: "El destinatario recibe", kr: "Destinatè resevwa" },
  "form.detected": { en: "Detected", fr: "Détecté", es: "Detectado", kr: "Detekte" },
  "form.phone_placeholder": { en: "509 34XX XXXX", fr: "509 34XX XXXX", es: "509 34XX XXXX", kr: "509 34XX XXXX" },
  "form.country": { en: "Country", fr: "Pays", es: "País", kr: "Peyi" },
  "form.popular": { en: "POPULAR", fr: "POPULAIRE", es: "POPULAR", kr: "POPULÈ" },
  "form.pay_card": { en: "Credit / Debit Card", fr: "Carte Crédit / Débit", es: "Tarjeta Crédito / Débito", kr: "Kat Kredi / Debi" },
  "form.pay_moncash": { en: "Moncash", fr: "Moncash", es: "Moncash", kr: "Moncash" },

  "btn.send": {
    en: "⚡ Send Recharge Now",
    fr: "⚡ Envoyer la Recharge",
    es: "⚡ Enviar Recarga",
    kr: "⚡ Voye Recharge Kounye a",
  },
  "btn.continue": { en: "Continue", fr: "Continuer", es: "Continuar", kr: "Kontinye" },
  "btn.back": { en: "Back", fr: "Retour", es: "Atrás", kr: "Tounen" },

  "trust.instant": { en: "Instant", fr: "Instantané", es: "Instantáneo", kr: "Instantane" },
  "trust.secure": { en: "100% Secure", fr: "100% Sécurisé", es: "100% Seguro", kr: "100% Sekirite" },
  "trust.countries": { en: "150+ Countries", fr: "150+ Pays", es: "150+ Países", kr: "150+ Peyi" },
  "trust.customers": { en: "3000+ Customers", fr: "3000+ Clients", es: "3000+ Clientes", kr: "3000+ Kliyan" },

  "how.title": { en: "How it works", fr: "Comment ça marche", es: "Cómo funciona", kr: "Kijan li mache" },
  "how.s1.title": { en: "Enter Number", fr: "Entrez le numéro", es: "Ingresa número", kr: "Antre Nimewo" },
  "how.s1.desc": { en: "We auto-detect the carrier instantly.", fr: "Nous détectons l'opérateur automatiquement.", es: "Detectamos el operador automáticamente.", kr: "Nou detekte operatè a otomatikman." },
  "how.s2.title": { en: "Choose Amount", fr: "Choisissez montant", es: "Elige monto", kr: "Chwazi Montant" },
  "how.s2.desc": { en: "Pick airtime or a data plan.", fr: "Choisissez crédit ou forfait données.", es: "Elige saldo o datos.", kr: "Chwazi minit oswa forfè done." },
  "how.s3.title": { en: "Send Instantly", fr: "Envoyez instantanément", es: "Envía al instante", kr: "Voye Instantaneman" },
  "how.s3.desc": { en: "The credit lands in seconds.", fr: "Le crédit arrive en quelques secondes.", es: "El saldo llega en segundos.", kr: "Kredi a rive nan kèk segond." },

  "ops.title": { en: "Trusted operators", fr: "Opérateurs de confiance", es: "Operadores de confianza", kr: "Operatè nou sipòte" },

  "status.success": { en: "✅ Recharge sent successfully", fr: "✅ Recharge envoyée avec succès", es: "✅ Recarga enviada con éxito", kr: "✅ Recharge voye ak siksè" },
  "status.pending": { en: "⏳ Processing…", fr: "⏳ En cours…", es: "⏳ Procesando…", kr: "⏳ N ap trete…" },
  "status.failed": { en: "❌ Transaction failed", fr: "❌ Transaction échouée", es: "❌ Transacción fallida", kr: "❌ Tranzaksyon echwe" },

  "auth.login_title": { en: "Welcome back", fr: "Bon retour", es: "Bienvenido de nuevo", kr: "Bonjou ankò" },
  "auth.signup_title": { en: "Create your account", fr: "Créez votre compte", es: "Crea tu cuenta", kr: "Kreye kont ou" },
  "auth.email": { en: "Email", fr: "E-mail", es: "Correo", kr: "Imèl" },
  "auth.password": { en: "Password", fr: "Mot de passe", es: "Contraseña", kr: "Modpas" },
  "auth.full_name": { en: "Full name", fr: "Nom complet", es: "Nombre completo", kr: "Non konplè" },
  "auth.google": { en: "Continue with Google", fr: "Continuer avec Google", es: "Continuar con Google", kr: "Kontinye ak Google" },
  "auth.no_account": { en: "Don't have an account?", fr: "Pas de compte ?", es: "¿No tienes cuenta?", kr: "Pa gen kont?" },
  "auth.have_account": { en: "Already have an account?", fr: "Déjà un compte ?", es: "¿Ya tienes cuenta?", kr: "Ou genyen yon kont deja?" },

  "dash.greet": { en: "Hello", fr: "Bonjour", es: "Hola", kr: "Bonjou" },
  "dash.quick": { en: "Quick recharge", fr: "Recharge rapide", es: "Recarga rápida", kr: "Recharge rapid" },
  "dash.recent": { en: "Recent transactions", fr: "Transactions récentes", es: "Transacciones recientes", kr: "Tranzaksyon resan" },
  "dash.saved": { en: "Saved contacts", fr: "Contacts sauvegardés", es: "Contactos guardados", kr: "Kontak sove" },
  "dash.empty_tx": { en: "No transactions yet", fr: "Aucune transaction", es: "Sin transacciones", kr: "Pa gen tranzaksyon" },
  "dash.empty_contacts": { en: "No saved contacts", fr: "Aucun contact", es: "Sin contactos", kr: "Pa gen kontak" },

  "history.title": { en: "Transaction history", fr: "Historique", es: "Historial", kr: "Istwa Tranzaksyon" },
  "history.search": { en: "Search by phone…", fr: "Rechercher par numéro…", es: "Buscar por número…", kr: "Chèche pa nimewo…" },
  "history.all": { en: "All", fr: "Tout", es: "Todo", kr: "Tout" },
  "history.success": { en: "Success", fr: "Succès", es: "Éxito", kr: "Siksè" },
  "history.failed": { en: "Failed", fr: "Échouée", es: "Fallida", kr: "Echwe" },
  "history.pending": { en: "Pending", fr: "En cours", es: "Pendiente", kr: "Annatant" },

  "contacts.title": { en: "Saved contacts", fr: "Contacts sauvegardés", es: "Contactos guardados", kr: "Kontak Sove" },
  "contacts.add": { en: "Add contact", fr: "Ajouter contact", es: "Añadir contacto", kr: "Ajoute kontak" },
  "contacts.name": { en: "Name", fr: "Nom", es: "Nombre", kr: "Non" },
  "contacts.phone": { en: "Phone", fr: "Téléphone", es: "Teléfono", kr: "Telefòn" },
  "contacts.recharge": { en: "Recharge", fr: "Recharger", es: "Recargar", kr: "Recharge" },
  "contacts.delete": { en: "Delete", fr: "Supprimer", es: "Eliminar", kr: "Efase" },

  "footer.tag": { en: "A sub-platform of monican.shop", fr: "Une sous-plateforme de monican.shop", es: "Una sub-plataforma de monican.shop", kr: "Yon sou-platfòm monican.shop" },
  "footer.rights": { en: "© 2026 Monican LLC. All rights reserved.", fr: "© 2026 Monican LLC. Tous droits réservés.", es: "© 2026 Monican LLC. Todos los derechos reservados.", kr: "© 2026 Monican LLC. Tout dwa rezève." },
};

export function tr(key: string, lang: Lang): string {
  const entry = t[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}
