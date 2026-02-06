-- --------------------------------------------------------
-- Servidor:                     127.0.0.1
-- Versão do servidor:           8.0.43 - MySQL Community Server - GPL
-- OS do Servidor:               Win64
-- HeidiSQL Versão:              12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Copiando dados para a tabela infos_curriculo.educacao_e_cursos: ~4 rows (aproximadamente)
INSERT INTO `educacao_e_cursos` (`id`, `emissor_instituicao`, `titulo_do_curso`, `descricao`, `destaque`) VALUES
	(1, 'Google', 'Fundamentos de Suporte de TI (IT Support Professional)', 'Certificação profissional que cobre troubleshooting, redes, sistemas operacionais e segurança.', 'Sim'),
	(2, 'Cisco', 'IT Customer Support Basics', 'Foco em suporte ao cliente técnico e resolução de problemas de hardware e software.', 'Sim'),
	(3, 'Fundação Bradesco', 'Administrador de Banco de Dados', 'Fundamentos de SQL, modelagem de dados e gerenciamento de bases.', 'Sim'),
	(4, 'Origamid', 'Web Design & Front-End', 'Desenvolvimento de interfaces modernas com foco em HTML, CSS e UX.', 'Sim');

-- Copiando dados para a tabela infos_curriculo.experiencias: ~2 rows (aproximadamente)
INSERT INTO `experiencias` (`id`, `empresa`, `cargo`, `data_inicio`, `data_fim`, `descricao_atividades`, `principais_conquistas`, `categoria`, `tags_tecnicas`) VALUES
	(1, 'Tribunal de Justiça do Estado de São Paulo - Comarca de Salto', 'Estagiário Administrativo', 'Janeiro/2025', 'Dezembro/2025', 'Auxiliar no recebimento e preparação de cargas dos expedientes/de processos físicos da unidade.\nAuxiliar no acondicionamento, empacotamento e embalagem de material...', 'Desenvolvimento e implementação de um sistema em Excel para controle de prazos e desarquivamentos...', 'Administrativa', NULL),
	(2, 'Freelancer', 'Desenvolvedor de Software Full Stack / Web Developer', 'Outubro/2025', 'Atual', 'Criação de fluxos de automação com n8n e Node.js para processamento de dados em tempo real...', 'Arquitetura de uma solução completa de automação em três camadas...', 'Tecnologia', 'Node.js, n8n, JavaScript, Docker, VPS, PM2, Express.js, PostgreSQL, MySQL, APIs REST');

-- Copiando dados para a tabela infos_curriculo.formacao_e_projetos: ~3 rows (aproximadamente)
INSERT INTO `formacao_e_projetos` (`id`, `tipo`, `instituicao_projeto`, `titulo_curso`, `status`, `descricao_detalhada`) VALUES
	(1, 'Educação', 'Instituto Federal de Educação, Ciência e Tecnologia de São Paulo - IFSP', 'Curso Técnico em Informática para Internet Integrado ao Ensino Médio', 'Concluído (Dezembro/2025)', 'Formação técnica focada em desenvolvimento web, lógica de programação, banco de dados e redes de computadores.'),
	(2, 'Educação', 'Instituto Federal de Educação, Ciência e Tecnologia de São Paulo - IFSP', 'Curso Técnico em Administração', 'Em andamento (Previsão: Julho/2026)', 'Foco em rotinas administrativas, gestão de processos, logística e controles internos.'),
	(3, 'Projeto Pessoal / Freelance', 'Sistema de Automação Shopee', 'Desenvolvedor de Automação', 'Concluído (Outubro/2025)', 'Desenvolvimento de uma solução completa integrando n8n, API da Shopee e Node.js...');

-- Copiando dados para a tabela infos_curriculo.historico_geracoes: ~10 rows (aproximadamente)
INSERT INTO `historico_geracoes` (`id`, `vaga_titulo`, `score`, `keywords_focadas`, `status`, `pdf_path`, `created_at`, `createdAt`, `updatedAt`) VALUES
	(1, 'Desenvolvedor FullStack Jr.', 85, NULL, 'concluido', NULL, '2026-01-20 23:29:06', '2026-01-20 23:29:06', '2026-01-20 23:29:11'),
	(2, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:31:18', '2026-01-20 23:31:18', '2026-01-20 23:31:18'),
	(3, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:34:15', '2026-01-20 23:34:15', '2026-01-20 23:34:16'),
	(4, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:36:22', '2026-01-20 23:36:22', '2026-01-20 23:36:23'),
	(5, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:36:51', '2026-01-20 23:36:51', '2026-01-20 23:36:51'),
	(6, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:43:41', '2026-01-20 23:43:41', '2026-01-20 23:43:43'),
	(7, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:44:04', '2026-01-20 23:44:04', '2026-01-20 23:44:07'),
	(8, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:45:30', '2026-01-20 23:45:30', '2026-01-20 23:45:32'),
	(9, 'Desenvolvedor FullStack Jr.', NULL, NULL, 'falha', NULL, '2026-01-20 23:48:44', '2026-01-20 23:48:44', '2026-01-20 23:48:47'),
	(10, 'Desenvolvedor FullStack Jr.', 95, NULL, 'concluido', 'C:\\Users\\Bryan Andrade\\Documents\\CurriculoAI\\src\\templates\\CV_Bryan_10.pdf', '2026-01-20 23:49:29', '2026-01-20 23:49:29', '2026-01-20 23:49:52');

-- Copiando dados para a tabela infos_curriculo.idiomas: ~2 rows (aproximadamente)
INSERT INTO `idiomas` (`id`, `idioma`, `nivel_cefr`, `certificacao_exame`, `historico_de_escolas`) VALUES
	(1, 'Inglês', 'B2 - Intermediário Avançado / Advanced', 'Duolingo English Test - 115 pontos', 'CNA Salto - Master 1 (2025).\nInflux Salto - Conversação Avançada (2024-2025)...'),
	(2, 'Português', 'Nativo (Native)', NULL, NULL);

-- Copiando dados para a tabela infos_curriculo.perfil: ~0 rows (aproximadamente)
INSERT INTO `perfil` (`id`, `nome_completo`, `email`, `telefone`, `localizacao`, `linkedin`, `github`, `resumo_base`, `data_nascimento`) VALUES
	(1, 'Bryan Rodrigues de Andrade', 'bryanrodriguesdeandrade@gmail.com', '+55 11 91479-6414', 'Salto, São Paulo, Brasil', 'https://www.linkedin.com/in/andradetk/', 'https://github.com/AndradeTK', 'Profissional com sólida formação técnica em Informática e Administração pelo IFSP. Possuo experiência prática em rotinas administrativas complexas no Tribunal de Justiça (TJSP), onde desenvolvi sistemas de automação em Excel para otimização de fluxos. Atuo também como Desenvolvedor Full Stack freelancer, com foco em Node.js, n8n e integração de APIs financeiras e de automação. Inglês nível avançado (B2) e certificado em Suporte de TI pelo Google. Atualmente focado em criar soluções tecnológicas que otimizam processos de negócio.', '2007-08-29');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
