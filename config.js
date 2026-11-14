// Datos del proyecto de Supabase (botón Connect, o Project Settings → API / API Keys).
// SUPABASE_ANON_KEY acepta la publishable key (sb_publishable_…) o la anon key legacy (eyJ…).
// La anon key es pública por diseño: la seguridad la dan el login y las reglas (RLS).
window.VITO_CONFIG = {
  SUPABASE_URL: "https://vimmydvcqolanafwdrtn.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_KP1fKkHimht5MRN2u4bTfg_ySrEQP-2",
  // Clave pública para los avisos al celular (la privada va como secreto en GitHub)
  VAPID_PUBLIC_KEY: "BJw9qxkW_mU4ENtOMOP92Wb3ke5muj4Ur0YDGnSOumfiIaLLPzUWIbc-cq827gf5HPKlOjqNp8sxopQSH5UEKtY"
};
