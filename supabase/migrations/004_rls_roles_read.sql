-- Permite leitura de roles e departments para usuários autenticados (join no perfil)

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read roles" ON roles;
CREATE POLICY "Authenticated read roles" ON roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read departments" ON departments;
CREATE POLICY "Authenticated read departments" ON departments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users read own profile" ON users;
CREATE POLICY "Users read own profile" ON users
  FOR SELECT TO authenticated USING (auth.uid() = id);
