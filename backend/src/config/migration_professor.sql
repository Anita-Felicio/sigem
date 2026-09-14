-- Migração para bancos SIGEM criados antes do cadastro completo de professores.
-- Execute uma vez no banco sigem_db:
--   psql -U postgres -d sigem_db -f src/config/migration_professor.sql

ALTER TABLE professor
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS data_nascimento DATE,
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
  ADD COLUMN IF NOT EXISTS especialidades TEXT;

-- Os campos passam a ser obrigatórios para novos cadastros. Antes de executar
-- estas linhas, preencha os valores dos professores antigos, se houver algum.
-- A restrição UNIQUE do CPF também impede dois professores com o mesmo documento.
CREATE UNIQUE INDEX IF NOT EXISTS professor_cpf_unico
  ON professor (cpf);
