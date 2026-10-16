import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(url, key);

async function main() {
  const email = process.argv[2] || "admin.vita4me@gmail.com";
  const password = process.argv[3] || "Password@1234";
  const fullName = process.argv[4] || "Admin Vita4Me";

  console.log(`Tentando criar usuário: ${email}...`);
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
    console.log("Aviso no signUp:", error.message);
  } else {
    console.log("✅ Usuário registrado no Supabase!");
    console.log("User ID:", data.user?.id);
    console.log("Email:", data.user?.email);
  }

  console.log("Tentando login com as credenciais...");
  const loginRes = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (loginRes.error) {
    console.log("Status do login:", loginRes.error.message);
  } else {
    console.log("✅ Login autenticado com sucesso!");
    console.log("User ID autenticado:", loginRes.data.user?.id);
  }
}

main().catch(console.error);
