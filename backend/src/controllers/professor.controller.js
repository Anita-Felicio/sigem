// Controller de professores (RF02): cadastro, edicao, consulta e exclusao.
//
// Assim como alunos, um professor ocupa as tabelas "usuario" e "professor".
// As duas escritas usam a mesma transacao para nunca deixar um cadastro pela
// metade no banco.

const bcrypt = require('bcrypt');
const pool = require('../config/db');
const {
  validarCadastro,
  validarConfirmacaoSenha,
  validarTelefone,
  normalizarCpf,
  validarCpf,
  validarEspecialidades
} = require('../utils/validacao');

const CUSTO_HASH = 10;
const EMAIL_DUPLICADO = '23505';

const COLUNAS = `
  p.id,
  u.nome,
  u.email,
  p.telefone,
  TO_CHAR(p.data_nascimento, 'YYYY-MM-DD') AS data_nascimento,
  p.cpf,
  p.especialidades
`;

function erro(res, status, message, detalhe) {
  return res.status(status).json({ status: 'erro', message, detalhe });
}

async function mensagemDeEmailDuplicado(email) {
  const existente = await pool.query(
    'SELECT ativo FROM usuario WHERE email = $1',
    [email.trim().toLowerCase()]
  );
  if (existente.rows.length > 0 && existente.rows[0].ativo === false) {
    return 'Esse e-mail pertence a um cadastro que foi excluido. Escolha outro e-mail.';
  }
  return 'Ja existe um usuario com esse email';
}

async function mensagemDeCpfDuplicado(cpf) {
  const existente = await pool.query(
    `SELECT u.ativo
     FROM professor p
     JOIN usuario u ON u.id = p.usuario_id
     WHERE p.cpf = $1`,
    [cpf]
  );
  if (existente.rows.length > 0 && existente.rows[0].ativo === false) {
    return 'Esse CPF pertence a um cadastro que foi excluido. Confira o documento informado.';
  }
  return 'Ja existe um professor com esse CPF';
}

function validarProfessor(dados, { exigirSenha = true } = {}) {
  return [
    ...validarCadastro(dados, { exigirSenha }),
    exigirSenha ? validarConfirmacaoSenha(dados.senha, dados.senhaConfirmacao) : null,
    validarTelefone(dados.telefone),
    validarCpf(dados.cpf),
    validarEspecialidades(dados.especialidades)
  ].filter(Boolean);
}

async function listar(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT ${COLUNAS}
      FROM professor p
      JOIN usuario u ON u.id = p.usuario_id
      WHERE u.ativo = true
      ORDER BY u.nome
    `);
    res.json({ status: 'ok', dados: resultado.rows });
  } catch (e) {
    erro(res, 500, 'Falha ao listar os professores', e.message);
  }
}

async function buscarPorId(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT ${COLUNAS}
      FROM professor p
      JOIN usuario u ON u.id = p.usuario_id
      WHERE p.id = $1 AND u.ativo = true
    `, [req.params.id]);

    if (resultado.rows.length === 0) return erro(res, 404, 'Professor nao encontrado');
    res.json({ status: 'ok', dados: resultado.rows[0] });
  } catch (e) {
    erro(res, 500, 'Falha ao buscar o professor', e.message);
  }
}

async function criar(req, res) {
  const {
    nome, email, senha, senha_confirmacao, telefone, data_nascimento, cpf, especialidades
  } = req.body;
  const problemas = validarProfessor(
    {
      nome,
      email,
      senha,
      senhaConfirmacao: senha_confirmacao,
      telefone,
      dataNascimento: data_nascimento,
      cpf,
      especialidades
    }
  );
  if (problemas.length > 0) return erro(res, 400, problemas[0], problemas.join(' | '));

  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim().toLowerCase();
  const telefoneLimpo = telefone.trim();
  const cpfLimpo = normalizarCpf(cpf);
  const especialidadesLimpas = especialidades.trim();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const senhaHash = await bcrypt.hash(senha, CUSTO_HASH);
    const usuario = await client.query(`
      INSERT INTO usuario (nome, email, senha_hash, perfil)
      VALUES ($1, $2, $3, 'professor')
      RETURNING id
    `, [nomeLimpo, emailLimpo, senhaHash]);

    const professor = await client.query(`
      INSERT INTO professor (usuario_id, telefone, data_nascimento, cpf, especialidades)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [usuario.rows[0].id, telefoneLimpo, data_nascimento || null, cpfLimpo, especialidadesLimpas]);

    await client.query('COMMIT');
    res.status(201).json({
      status: 'ok',
      dados: {
        id: professor.rows[0].id,
        nome: nomeLimpo,
        email: emailLimpo,
        telefone: telefoneLimpo,
        data_nascimento: data_nascimento || null,
        cpf: cpfLimpo,
        especialidades: especialidadesLimpas
      }
    });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === EMAIL_DUPLICADO) {
      if (e.constraint === 'professor_cpf_key' || e.constraint === 'professor_cpf_unico') {
        return erro(res, 409, await mensagemDeCpfDuplicado(cpfLimpo));
      }
      return erro(res, 409, await mensagemDeEmailDuplicado(email));
    }
    erro(res, 500, 'Falha ao cadastrar o professor', e.message);
  } finally {
    client.release();
  }
}

async function atualizar(req, res) {
  const { nome, email, telefone, data_nascimento, cpf, especialidades } = req.body;
  const problemas = validarProfessor(
    { nome, email, telefone, dataNascimento: data_nascimento, cpf, especialidades },
    { exigirSenha: false }
  );
  if (problemas.length > 0) return erro(res, 400, problemas[0], problemas.join(' | '));

  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim().toLowerCase();
  const telefoneLimpo = telefone.trim();
  const cpfLimpo = normalizarCpf(cpf);
  const especialidadesLimpas = especialidades.trim();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const usuario = await client.query(`
      UPDATE usuario SET nome = $1, email = $2
      WHERE id = (SELECT usuario_id FROM professor WHERE id = $3) AND ativo = true
      RETURNING id
    `, [nomeLimpo, emailLimpo, req.params.id]);

    if (usuario.rows.length === 0) {
      await client.query('ROLLBACK');
      return erro(res, 404, 'Professor nao encontrado');
    }

    await client.query(`
      UPDATE professor
      SET telefone = $1, data_nascimento = $2, cpf = $3, especialidades = $4
      WHERE id = $5
    `, [telefoneLimpo, data_nascimento || null, cpfLimpo, especialidadesLimpas, req.params.id]);

    await client.query('COMMIT');
    res.json({
      status: 'ok',
      dados: {
        id: Number(req.params.id),
        nome: nomeLimpo,
        email: emailLimpo,
        telefone: telefoneLimpo,
        data_nascimento: data_nascimento || null,
        cpf: cpfLimpo,
        especialidades: especialidadesLimpas
      }
    });
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === EMAIL_DUPLICADO) {
      if (e.constraint === 'professor_cpf_key' || e.constraint === 'professor_cpf_unico') {
        return erro(res, 409, await mensagemDeCpfDuplicado(cpfLimpo));
      }
      return erro(res, 409, await mensagemDeEmailDuplicado(email));
    }
    erro(res, 500, 'Falha ao atualizar o professor', e.message);
  } finally {
    client.release();
  }
}

async function excluir(req, res) {
  try {
    const resultado = await pool.query(`
      UPDATE usuario SET ativo = false
      WHERE id = (SELECT usuario_id FROM professor WHERE id = $1) AND ativo = true
      RETURNING id
    `, [req.params.id]);

    if (resultado.rows.length === 0) return erro(res, 404, 'Professor nao encontrado');
    res.json({ status: 'ok', message: 'Professor excluido' });
  } catch (e) {
    erro(res, 500, 'Falha ao excluir o professor', e.message);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, excluir };
