// Rotas de professores (RF02). A autorizacao de administrador depende do RF06;
// por enquanto seguem o mesmo acesso aberto das rotas de alunos.

const express = require('express');
const router = express.Router();
const professorController = require('../controllers/professor.controller');

router.get('/', professorController.listar);
router.get('/:id', professorController.buscarPorId);
router.post('/', professorController.criar);
router.put('/:id', professorController.atualizar);
router.delete('/:id', professorController.excluir);

module.exports = router;
