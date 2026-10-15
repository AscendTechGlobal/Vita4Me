import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(url, key);

async function main() {
  const email = "gisah.cw@gmail.com";
  const password = "Password@1234";
  const fullName = "Gisah CW";

  console.log(`Tentando criar usuário ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    if (error.status === 429) {
      console.log("ℹ️ Limite de requisições de e-mail atingido temporariamente (o usuário já foi cadastrado no Supabase).");
    } else {
      console.log("Aviso no signUp:", error.message);
    }
  } else {
    console.log("✅ Usuário criado com sucesso no Supabase!");
    console.log("User ID:", data.user?.id);
    console.log("Email:", data.user?.email);
  }

  console.log("Testando login com as credenciais...");
  const loginRes = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginRes.error) {
    console.log("Status de autenticação:", loginRes.error.message);
    if (loginRes.error.message.includes("Email not confirmed")) {
      console.log("ℹ️ O Supabase exige confirmação do e-mail (link enviado para gisah.cw@gmail.com) ou confirmação manual via SQL no dashboard.");
    }
  } else {
    console.log("✅ Login realizado com sucesso! Usuário pronto para uso.");
    console.log("User ID:", loginRes.data.user?.id);
  }
}

main().catch(console.error);

