-- Criação do banco de dados (ajuste o nome se desejar)
CREATE DATABASE IF NOT EXISTS `infos_curriculo`;
USE `infos_curriculo`;

-- 1. Tabela de Perfil Profissional (Dados Mestres)
CREATE TABLE IF NOT EXISTS `perfil` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `nome_completo` VARCHAR(255) NOT NULL,
    `email` VARCHAR(150),
    `telefone` VARCHAR(20),
    `localizacao` VARCHAR(255),
    `linkedin` VARCHAR(255),
    `github` VARCHAR(255),
    `resumo_base` TEXT,
    `data_nascimento` DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Experiências Profissionais
CREATE TABLE IF NOT EXISTS `experiencias` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `empresa` VARCHAR(255) NOT NULL,
    `cargo` VARCHAR(150) NOT NULL,
    `data_inicio` VARCHAR(50),
    `data_fim` VARCHAR(50),
    `descricao_atividades` TEXT,
    `principais_conquistas` TEXT,
    `categoria` VARCHAR(100), -- Ex: Tecnologia, Administrativa
    `tags_tecnicas` TEXT        -- Armazena skills como 'Node.js, Docker'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabela de Formação e Projetos Pessoais
CREATE TABLE IF NOT EXISTS `formacao_e_projetos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tipo` ENUM('Educação', 'Projeto Pessoal / Freelance') NOT NULL,
    `instituicao_projeto` VARCHAR(255),
    `titulo_curso` VARCHAR(255),
    `status` VARCHAR(100),
    `descricao_detalhada` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabela de Educação Extra e Cursos (Certificações)
CREATE TABLE IF NOT EXISTS `educacao_e_cursos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `emissor_instituicao` VARCHAR(255),
    `titulo_do_curso` VARCHAR(255),
    `descricao` TEXT,
    `destaque` ENUM('Sim', 'Não') DEFAULT 'Não'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabela de Idiomas
CREATE TABLE IF NOT EXISTS `idiomas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `idioma` VARCHAR(100) NOT NULL,
    `nivel_cefr` VARCHAR(100),
    `certificacao_exame` VARCHAR(255),
    `historico_de_escolas` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabela de Histórico de Gerações (Log de Atividade)
CREATE TABLE IF NOT EXISTS `historico_geracoes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vaga_titulo` VARCHAR(255),
    `score` INT DEFAULT NULL,
    `keywords_focadas` TEXT,
    `status` ENUM('concluido', 'falha') DEFAULT 'concluido',
    `pdf_path` VARCHAR(500),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;