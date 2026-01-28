-- Migration V12.10: Grupos Expandidos
-- Adiciona tabelas e campos para modalidades especializadas: Funcional, Caminhada/Trail, Yoga, Lutas

-- Atualizar groupType na tabela groups
ALTER TABLE `groups` MODIFY COLUMN `groupType` ENUM('running', 'cycling', 'triathlon', 'trail', 'swimming', 'fitness', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'other') DEFAULT 'running';

-- Adicionar campo canCreateTraining e notifyChat em group_members
ALTER TABLE `group_members` ADD COLUMN IF NOT EXISTS `canCreateTraining` BOOLEAN DEFAULT FALSE;
ALTER TABLE `group_members` ADD COLUMN IF NOT EXISTS `notifyChat` BOOLEAN DEFAULT TRUE;

-- Tabela: Functional Trainings
CREATE TABLE IF NOT EXISTS `functional_trainings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `createdBy` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `trainingType` ENUM('halteres', 'peso_corporal', 'kettlebell', 'misto') DEFAULT 'misto' NOT NULL,
  `focus` ENUM('forca', 'resistencia', 'mobilidade', 'circuito') DEFAULT 'circuito' NOT NULL,
  `durationMinutes` INT DEFAULT 60,
  `exercises` JSON,
  `scheduledAt` TIMESTAMP NOT NULL,
  `meetingPoint` TEXT,
  `meetingLat` DECIMAL(10, 7),
  `meetingLng` DECIMAL(10, 7),
  `maxParticipants` INT,
  `equipmentNeeded` JSON,
  `goingCount` INT DEFAULT 0,
  `completedCount` INT DEFAULT 0,
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_functional_trainings_group` (`groupId`),
  INDEX `idx_functional_trainings_scheduled` (`scheduledAt`)
);

-- Tabela: Functional Training Participants
CREATE TABLE IF NOT EXISTS `functional_training_participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trainingId` INT NOT NULL,
  `userId` INT NOT NULL,
  `response` ENUM('going', 'maybe', 'not_going') DEFAULT 'going' NOT NULL,
  `checkedIn` BOOLEAN DEFAULT FALSE,
  `checkedInAt` TIMESTAMP NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  `completedAt` TIMESTAMP NULL,
  `totalTime` INT,
  `notes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_ftp_training` (`trainingId`),
  INDEX `idx_ftp_user` (`userId`),
  UNIQUE KEY `uk_ftp_training_user` (`trainingId`, `userId`)
);

-- Tabela: Hikes (Caminhadas/Trilhas)
CREATE TABLE IF NOT EXISTS `hikes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `createdBy` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `trailType` ENUM('urbano', 'trilha_leve', 'trilha_moderada', 'trilha_avancada') DEFAULT 'urbano' NOT NULL,
  `distanceKm` DECIMAL(6, 2),
  `durationMinutes` INT,
  `elevationGain` INT,
  `scheduledAt` TIMESTAMP NOT NULL,
  `meetingPoint` TEXT,
  `meetingLat` DECIMAL(10, 7),
  `meetingLng` DECIMAL(10, 7),
  `routeCoordinates` JSON,
  `maxParticipants` INT,
  `goingCount` INT DEFAULT 0,
  `completedCount` INT DEFAULT 0,
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_hikes_group` (`groupId`),
  INDEX `idx_hikes_scheduled` (`scheduledAt`)
);

-- Tabela: Hike Participants
CREATE TABLE IF NOT EXISTS `hike_participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hikeId` INT NOT NULL,
  `userId` INT NOT NULL,
  `response` ENUM('going', 'maybe', 'not_going') DEFAULT 'going' NOT NULL,
  `checkedIn` BOOLEAN DEFAULT FALSE,
  `checkedInAt` TIMESTAMP NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  `completedAt` TIMESTAMP NULL,
  `distanceCompleted` DECIMAL(6, 2),
  `totalTime` INT,
  `elevationGain` INT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_hp_hike` (`hikeId`),
  INDEX `idx_hp_user` (`userId`),
  UNIQUE KEY `uk_hp_hike_user` (`hikeId`, `userId`)
);

-- Tabela: Yoga Sessions
CREATE TABLE IF NOT EXISTS `yoga_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `createdBy` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `style` ENUM('hatha', 'vinyasa', 'restaurativa', 'ashtanga', 'kundalini', 'yin', 'outro') DEFAULT 'hatha' NOT NULL,
  `level` ENUM('iniciante', 'intermediario', 'avancado', 'todos') DEFAULT 'todos' NOT NULL,
  `durationMinutes` INT DEFAULT 60,
  `instructorName` VARCHAR(100),
  `instructorBio` TEXT,
  `instructorPhotoUrl` TEXT,
  `scheduledAt` TIMESTAMP NOT NULL,
  `isOnline` BOOLEAN DEFAULT FALSE,
  `meetingPoint` TEXT,
  `meetingLat` DECIMAL(10, 7),
  `meetingLng` DECIMAL(10, 7),
  `videoConferenceUrl` TEXT,
  `maxParticipants` INT,
  `goingCount` INT DEFAULT 0,
  `completedCount` INT DEFAULT 0,
  `avgRating` DECIMAL(3, 2),
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_yoga_group` (`groupId`),
  INDEX `idx_yoga_scheduled` (`scheduledAt`)
);

-- Tabela: Yoga Session Participants
CREATE TABLE IF NOT EXISTS `yoga_session_participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sessionId` INT NOT NULL,
  `userId` INT NOT NULL,
  `response` ENUM('going', 'maybe', 'not_going') DEFAULT 'going' NOT NULL,
  `attended` BOOLEAN DEFAULT FALSE,
  `attendedAt` TIMESTAMP NULL,
  `rating` INT,
  `feedback` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_ysp_session` (`sessionId`),
  INDEX `idx_ysp_user` (`userId`),
  UNIQUE KEY `uk_ysp_session_user` (`sessionId`, `userId`)
);

-- Tabela: Fight Trainings (Artes Marciais)
CREATE TABLE IF NOT EXISTS `fight_trainings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `createdBy` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `fightStyle` ENUM('jiu_jitsu', 'muay_thai', 'boxe', 'judo', 'karate', 'mma', 'capoeira', 'outro') DEFAULT 'jiu_jitsu' NOT NULL,
  `beltLevel` ENUM('branca', 'azul', 'roxa', 'marrom', 'preta', 'iniciante', 'intermediario', 'avancado', 'todos') DEFAULT 'todos',
  `trainingType` ENUM('tecnica', 'sparring_leve', 'sparring_intenso', 'preparacao_fisica', 'competicao') DEFAULT 'tecnica' NOT NULL,
  `durationMinutes` INT DEFAULT 90,
  `instructorName` VARCHAR(100),
  `numberOfRounds` INT,
  `roundDurationSeconds` INT,
  `scheduledAt` TIMESTAMP NOT NULL,
  `meetingPoint` TEXT,
  `meetingLat` DECIMAL(10, 7),
  `meetingLng` DECIMAL(10, 7),
  `equipmentNeeded` JSON,
  `maxParticipants` INT,
  `goingCount` INT DEFAULT 0,
  `completedCount` INT DEFAULT 0,
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_fight_group` (`groupId`),
  INDEX `idx_fight_scheduled` (`scheduledAt`)
);

-- Tabela: Fight Training Participants
CREATE TABLE IF NOT EXISTS `fight_training_participants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `trainingId` INT NOT NULL,
  `userId` INT NOT NULL,
  `response` ENUM('going', 'maybe', 'not_going') DEFAULT 'going' NOT NULL,
  `checkedIn` BOOLEAN DEFAULT FALSE,
  `checkedInAt` TIMESTAMP NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  `completedAt` TIMESTAMP NULL,
  `wins` INT DEFAULT 0,
  `losses` INT DEFAULT 0,
  `draws` INT DEFAULT 0,
  `technicalNotes` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_ftp2_training` (`trainingId`),
  INDEX `idx_ftp2_user` (`userId`),
  UNIQUE KEY `uk_ftp2_training_user` (`trainingId`, `userId`)
);

-- Tabela: Group Invites
CREATE TABLE IF NOT EXISTS `group_invites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `invitedUserId` INT NOT NULL,
  `invitedBy` INT NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending' NOT NULL,
  `message` TEXT,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `respondedAt` TIMESTAMP NULL,
  INDEX `idx_gi_group` (`groupId`),
  INDEX `idx_gi_invited` (`invitedUserId`),
  INDEX `idx_gi_status` (`status`)
);

-- Tabela: Group Messages (Chat)
CREATE TABLE IF NOT EXISTS `group_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `senderId` INT NOT NULL,
  `content` TEXT NOT NULL,
  `imageUrl` TEXT,
  `replyToId` INT,
  `status` ENUM('active', 'deleted') DEFAULT 'active' NOT NULL,
  `deletedBy` INT,
  `deletedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_gm_group` (`groupId`),
  INDEX `idx_gm_created` (`createdAt`)
);

-- Tabela: Group Rankings
CREATE TABLE IF NOT EXISTS `group_rankings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `groupId` INT NOT NULL,
  `userId` INT NOT NULL,
  `modality` ENUM('corrida', 'bike', 'natacao', 'funcional', 'caminhada_trail', 'yoga', 'lutas', 'geral') DEFAULT 'geral' NOT NULL,
  `totalParticipations` INT DEFAULT 0,
  `totalDistance` DECIMAL(10, 2) DEFAULT 0,
  `totalTime` INT DEFAULT 0,
  `totalElevation` INT DEFAULT 0,
  `avgRating` DECIMAL(3, 2),
  `totalWins` INT DEFAULT 0,
  `totalLosses` INT DEFAULT 0,
  `currentBelt` VARCHAR(50),
  `points` INT DEFAULT 0,
  `rank` INT,
  `badges` JSON,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX `idx_gr_group` (`groupId`),
  INDEX `idx_gr_user` (`userId`),
  INDEX `idx_gr_modality` (`modality`),
  INDEX `idx_gr_points` (`points` DESC),
  UNIQUE KEY `uk_gr_group_user_modality` (`groupId`, `userId`, `modality`)
);
