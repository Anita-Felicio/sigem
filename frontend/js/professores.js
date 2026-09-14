// Tela de professores (RF02), seguindo o mesmo padrao da tela de alunos.

const API_URL = 'http://localhost:3000/api/professores';

const formulario = document.getElementById('formulario-professor');
const campoId = document.getElementById('professor-id');
const campoNome = document.getElementById('nome');
const campoTelefone = document.getElementById('telefone');
const campoEmail = document.getElementById('email');
const campoSenha = document.getElementById('senha');
const campoConfirmacaoSenha = document.getElementById('confirmacao-senha');
const campoNascimento = document.getElementById('data-nascimento');
const campoCpf = document.getElementById('cpf');
const campoEspecialidades = document.getElementById('especialidades');
const blocoSenha = document.getElementById('campo-senha');
const blocoConfirmacaoSenha = document.getElementById('campo-confirmacao-senha');
const tituloFormulario = document.getElementById('titulo-formulario');
const botaoCancelar = document.getElementById('botao-cancelar');
const botaoVerSenha = document.getElementById('botao-ver-senha');
const forcaSenha = document.getElementById('forca-senha');
const mensagemSenha = document.getElementById('mensagem-senha');
const corpoTabela = document.getElementById('corpo-tabela');
const mensagem = document.getElementById('mensagem');

(function definirLimitesDeData() {
  const hoje = new Date();
  const maisAntiga = new Date();
  maisAntiga.setFullYear(hoje.getFullYear() - 120);
  campoNascimento.max = hoje.toISOString().slice(0, 10);
  campoNascimento.min = maisAntiga.toISOString().slice(0, 10);
})();

function avaliarSenha(senha) {
  if (senha.length === 0) return { texto: 'Minimo de 8 caracteres.', classe: '' };
  if (senha.length < 8) return { texto: 'Muito curta: minimo de 8 caracteres.', classe: 'fraca' };

  const variedade =
    (/[a-z]/.test(senha) ? 1 : 0) +
    (/[A-Z]/.test(senha) ? 1 : 0) +
    (/[0-9]/.test(senha) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(senha) ? 1 : 0);

  if (variedade >= 3 && senha.length >= 12) return { texto: 'Senha forte.', classe: 'forte' };
  if (variedade >= 2) return { texto: 'Senha media. Misture maiusculas, numeros e simbolos.', classe: 'media' };
  return { texto: 'Senha fraca. Misture maiusculas, numeros e simbolos.', classe: 'fraca' };
}

botaoVerSenha.addEventListener('click', () => {
  const escondida = campoSenha.type === 'password';
  campoSenha.type = escondida ? 'text' : 'password';
  botaoVerSenha.textContent = escondida ? 'Ocultar' : 'Mostrar';
});

campoSenha.addEventListener('input', () => {
  const avaliacao = avaliarSenha(campoSenha.value);
  forcaSenha.textContent = avaliacao.texto;
  forcaSenha.className = 'ajuda ' + avaliacao.classe;
  validarConfirmacaoSenha();
});

function validarConfirmacaoSenha() {
  const diferente = campoSenha.value !== campoConfirmacaoSenha.value;
  const preenchida = campoConfirmacaoSenha.value.length > 0;
  campoConfirmacaoSenha.setCustomValidity(diferente ? 'As senhas nao coincidem' : '');
  mensagemSenha.textContent = diferente && preenchida ? 'As senhas nao coincidem.' : '';
  mensagemSenha.className = diferente && preenchida ? 'ajuda fraca' : 'ajuda';
}

campoConfirmacaoSenha.addEventListener('input', validarConfirmacaoSenha);

// Apresenta o CPF no formato brasileiro, mas o backend grava apenas os digitos.
campoCpf.addEventListener('input', () => {
  const digitos = campoCpf.value.replace(/\D/g, '').slice(0, 11);
  campoCpf.value = digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
});

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = 'mensagem ' + tipo;
}

function celula(texto) {
  const td = document.createElement('td');
  td.textContent = texto || '-';
  return td;
}

function formatarData(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarCpf(cpf) {
  const digitos = (cpf || '').replace(/\D/g, '');
  if (digitos.length !== 11) return cpf || '';
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

async function carregarProfessores() {
  try {
    const resposta = await fetch(API_URL);
    const corpo = await resposta.json();

    if (corpo.status !== 'ok') return mostrarMensagem(corpo.message, 'erro');
    corpoTabela.replaceChildren();

    if (corpo.dados.length === 0) {
      const linha = document.createElement('tr');
      const td = celula('Nenhum professor cadastrado ainda.');
      td.colSpan = 7;
      linha.appendChild(td);
      corpoTabela.appendChild(linha);
      return;
    }

    for (const professor of corpo.dados) {
      const linha = document.createElement('tr');
      linha.appendChild(celula(professor.nome));
      linha.appendChild(celula(professor.telefone));
      linha.appendChild(celula(professor.email));
      linha.appendChild(celula(formatarData(professor.data_nascimento)));
      linha.appendChild(celula(formatarCpf(professor.cpf)));
      linha.appendChild(celula(professor.especialidades));

      const acoes = document.createElement('td');
      const editar = document.createElement('button');
      editar.textContent = 'Editar';
      editar.className = 'secundario';
      editar.addEventListener('click', () => prepararEdicao(professor));

      const excluir = document.createElement('button');
      excluir.textContent = 'Excluir';
      excluir.className = 'perigo';
      excluir.addEventListener('click', () => excluirProfessor(professor));

      acoes.append(editar, ' ', excluir);
      linha.appendChild(acoes);
      corpoTabela.appendChild(linha);
    }
  } catch (e) {
    mostrarMensagem('Nao foi possivel falar com o backend. Ele esta rodando?', 'erro');
  }
}

function prepararEdicao(professor) {
  campoId.value = professor.id;
  campoNome.value = professor.nome;
  campoTelefone.value = professor.telefone;
  campoEmail.value = professor.email;
  campoNascimento.value = professor.data_nascimento || '';
  campoCpf.value = formatarCpf(professor.cpf);
  campoEspecialidades.value = professor.especialidades;

  blocoSenha.hidden = true;
  blocoConfirmacaoSenha.hidden = true;
  campoSenha.required = false;
  campoConfirmacaoSenha.required = false;
  campoConfirmacaoSenha.setCustomValidity('');
  campoSenha.type = 'password';
  botaoVerSenha.textContent = 'Mostrar';
  tituloFormulario.textContent = 'Editar professor';
  botaoCancelar.hidden = false;
  mostrarMensagem('', '');
  campoNome.focus();
}

function limparFormulario() {
  formulario.reset();
  campoId.value = '';
  blocoSenha.hidden = false;
  blocoConfirmacaoSenha.hidden = false;
  campoSenha.required = true;
  campoConfirmacaoSenha.required = true;
  campoConfirmacaoSenha.setCustomValidity('');
  mensagemSenha.textContent = '';
  mensagemSenha.className = 'ajuda';
  campoSenha.type = 'password';
  botaoVerSenha.textContent = 'Mostrar';
  forcaSenha.textContent = 'Minimo de 8 caracteres.';
  forcaSenha.className = 'ajuda';
  tituloFormulario.textContent = 'Cadastrar professor';
  botaoCancelar.hidden = true;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const editando = campoId.value !== '';
  const dados = {
    nome: campoNome.value.trim(),
    telefone: campoTelefone.value.trim(),
    email: campoEmail.value.trim(),
    data_nascimento: campoNascimento.value || null,
    cpf: campoCpf.value,
    especialidades: campoEspecialidades.value.trim()
  };
  if (!editando) {
    dados.senha = campoSenha.value;
    dados.senha_confirmacao = campoConfirmacaoSenha.value;
  }

  try {
    const resposta = await fetch(editando ? `${API_URL}/${campoId.value}` : API_URL, {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const corpo = await resposta.json();

    if (corpo.status !== 'ok') return mostrarMensagem(corpo.message, 'erro');
    mostrarMensagem(editando ? 'Professor atualizado.' : 'Professor cadastrado.', 'sucesso');
    limparFormulario();
    carregarProfessores();
  } catch (e) {
    mostrarMensagem('Nao foi possivel falar com o backend. Ele esta rodando?', 'erro');
  }
});

botaoCancelar.addEventListener('click', () => {
  limparFormulario();
  mostrarMensagem('', '');
});

async function excluirProfessor(professor) {
  if (!confirm(`Excluir o professor ${professor.nome}?`)) return;

  try {
    const resposta = await fetch(`${API_URL}/${professor.id}`, { method: 'DELETE' });
    const corpo = await resposta.json();
    if (corpo.status !== 'ok') return mostrarMensagem(corpo.message, 'erro');

    mostrarMensagem('Professor excluido.', 'sucesso');
    limparFormulario();
    carregarProfessores();
  } catch (e) {
    mostrarMensagem('Nao foi possivel falar com o backend. Ele esta rodando?', 'erro');
  }
}

carregarProfessores();
