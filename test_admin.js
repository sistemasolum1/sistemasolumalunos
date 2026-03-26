import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qviapzdsojwgqafkcxya.supabase.co';
const supabaseKey = 'sb_publishable_1ayt7Gul2UsfvIO6Qhas3Q_DAjWEY7b';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('Creating admin user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'diegokloppel21@gmail.com',
    password: '123456',
    options: {
      data: {
        name: 'Diego Kloppel',
        role: 'ADMIN'
      }
    }
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user?.id);
  }
}

createAdmin();
