-- EduLab - Script de creación de tablas en Supabase
-- Ejecuta este SQL en el Editor SQL de tu proyecto Supabase

-- Tabla de actividades
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('individual', 'grupal')),
  access_code TEXT UNIQUE NOT NULL,
  guide_url TEXT,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si ya tienes la tabla creada, ejecuta esto para agregar la columna:
-- ALTER TABLE activities ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Tabla de preguntas
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('short_text', 'essay', 'multiple_choice', 'checkboxes', 'numeric', 'file_upload')),
  text TEXT NOT NULL,
  options JSONB,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de criterios de rúbrica
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  superior_desc TEXT NOT NULL DEFAULT '',
  alto_desc TEXT NOT NULL DEFAULT '',
  basico_desc TEXT NOT NULL DEFAULT '',
  bajo_desc TEXT NOT NULL DEFAULT '',
  weight INTEGER DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de entregas (submissions)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  group_members JSONB,
  answers JSONB NOT NULL DEFAULT '{}',
  files JSONB,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'evaluado')),
  grade NUMERIC(3,1),
  percentage INTEGER,
  feedback TEXT,
  ai_details JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) pero con políticas públicas para simplificar
-- NOTA: Para producción, configura autenticación de Supabase

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Políticas que permiten acceso total (ajusta según tus necesidades de seguridad)
CREATE POLICY "Allow all" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON rubric_criteria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON submissions FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime en las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
