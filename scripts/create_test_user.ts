import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(url, key);

async function main() {
  const testEmail = "teste.vita4me@gmail.com";
  const testPassword = "Password@1234";
  const fullName = "Dr. Teste Vita4Me";

  console.log(`Tentando criar usuário: ${testEmail}...`);
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    console.log("Aviso no signUp:", error.message);
    console.log("Tentando login com as credenciais...");
    const loginRes = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (loginRes.error) {
      console.error("Erro no signInWithPassword:", loginRes.error.message);
    } else {
      console.log("✅ Login realizado com sucesso!");
      console.log("User ID:", loginRes.data.user?.id);
      console.log("Email:", loginRes.data.user?.email);
    }
  } else {
    console.log("✅ Usuário criado com sucesso no Supabase!");
    console.log("User ID:", data.user?.id);
    console.log("Email:", data.user?.email);
    console.log("Session:", data.session ? "Sessão criada imediatamente!" : "Confirmação de e-mail pode ser necessária no Supabase");
    
    // Tenta fazer login imediatamente para validar se o email requer confirmação
    const loginRes = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (loginRes.error) {
      console.log("Status de login:", loginRes.error.message);
    } else {
      console.log("✅ Login validado com sucesso! Usuário autenticado e pronto para uso.");
    }
  }
}

main().catch(console.error);
