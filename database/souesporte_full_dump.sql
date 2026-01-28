/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.6.23-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: souesporte
-- ------------------------------------------------------
-- Server version	10.6.23-MariaDB-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__drizzle_migrations`
--

DROP TABLE IF EXISTS `__drizzle_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `__drizzle_migrations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__drizzle_migrations`
--

LOCK TABLES `__drizzle_migrations` WRITE;
/*!40000 ALTER TABLE `__drizzle_migrations` DISABLE KEYS */;
INSERT INTO `__drizzle_migrations` VALUES (1,'814a08e40d7fc2bcfd458759d18319198ca8ae394f2fa15617a78678e9c9c93b',1767891273037),(2,'7b05ec0e88bda58e5125173479c93501a911d8912e9c71ba0602aac22c497abb',1767891405175),(3,'aa3b719574962aa938d51615c94c3432838fbc9818578709d947847c2c0c1a88',1768326088843),(4,'f667cf9b112682f597414d359fd331aacfb7ec6b577ea24ebc6edfb2fb823826',1768476717642),(5,'b6ab6fba0518a9f65065683e8165012b7e15b9594fc5866bbe374ca20d8b11ee',1768493329979),(6,'a5a4b165dab111a8c3f709b38d9227f8a38ad07e63a76926007253d5474e687d',1768499464275),(7,'7002e92e0f69b077dedc7d067f8d5dbdaeee37872387ab00112cfc08bedc8256',1768502357082),(8,'7da70521736e82bd1fd4d9a827f673e7665db465cc81fbe81627883c4f109e31',1768586628936),(9,'8905c789659f54091ede85065ace38482ebad43f339d4dcd051c7b840ff5ea8f',1768787029388),(10,'1e95f63193156c7fb3c49e286c6b87ef0ccf9b1b13c9c4210e7f6fe313644aed',1768791009987),(11,'2344208e3639fa79fedf783c0030091f3cd4ecbec3c3cc0451658194dd14f3f1',1768838225958),(12,'83f5cc118fd0d355f3d7fb25064fc7f7a907fddef88758d9641eb0e66c37d66d',1768839193532),(13,'0782fe58d052fd59c938e26516d787bb6073a5c9fb4e86f2c8b9b1ee97c4c7c6',1768859437329),(14,'a6d4ae5102a2253aea7c2e66074536638cbb45da104d085ba3e810383488c71a',1768861338720),(15,'dbec3dea6517ccb78168e804149268873c8fe28c3c2a4f2e17a2b5dc1f322f2e',1768871565403),(16,'bc97de5e469e958ee95d14af3d12ca46cdf809cec39dc4b24694aea8e72ed64f',1768873077922),(17,'3a9c71c328c1865edaeefc0a0b81e8e35ad9222acb60a46efad77bc9fb3e87ef',1768941279800);
/*!40000 ALTER TABLE `__drizzle_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_message_reactions`
--

DROP TABLE IF EXISTS `chat_message_reactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_message_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `messageId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `emoji` varchar(10) NOT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reaction` (`messageId`,`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_message_reactions`
--

LOCK TABLES `chat_message_reactions` WRITE;
/*!40000 ALTER TABLE `chat_message_reactions` DISABLE KEYS */;
INSERT INTO `chat_message_reactions` VALUES (1,3,780086,'❤️','2026-01-25 22:26:01');
/*!40000 ALTER TABLE `chat_message_reactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `threadId` int(11) NOT NULL,
  `senderId` int(11) NOT NULL,
  `content` text NOT NULL,
  `isRead` tinyint(1) DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `replyToMessageId` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_thread` (`threadId`),
  KEY `idx_sender` (`senderId`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,1,780086,'Teste de mensagem V10.7',0,'2026-01-25 00:51:40',NULL),(2,1,780086,'Teste de mensagem V10.7',0,'2026-01-25 00:51:48',NULL),(3,1,780086,'Olá',0,'2026-01-25 01:22:56',NULL),(5,1,780086,'Apagou porque?',0,'2026-01-25 23:23:41',NULL),(6,1,780086,'😂😂😂😂',0,'2026-01-25 23:23:47',NULL),(7,1,780086,'😂😂😂😂😂😂😂😂😂👏',0,'2026-01-25 23:23:58',NULL);
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_thread_deletions`
--

DROP TABLE IF EXISTS `chat_thread_deletions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_thread_deletions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `threadId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `deletedAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_deletion` (`threadId`,`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_thread_deletions`
--

LOCK TABLES `chat_thread_deletions` WRITE;
/*!40000 ALTER TABLE `chat_thread_deletions` DISABLE KEYS */;
/*!40000 ALTER TABLE `chat_thread_deletions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_threads`
--

DROP TABLE IF EXISTS `chat_threads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_threads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user1Id` int(11) NOT NULL,
  `user2Id` int(11) NOT NULL,
  `lastMessage` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastMessageAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_thread` (`user1Id`,`user2Id`),
  KEY `idx_user1` (`user1Id`),
  KEY `idx_user2` (`user2Id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_threads`
--

LOCK TABLES `chat_threads` WRITE;
/*!40000 ALTER TABLE `chat_threads` DISABLE KEYS */;
INSERT INTO `chat_threads` VALUES (1,780086,1110006,NULL,'2026-01-25 00:51:03','2026-01-25 23:23:58','2026-01-25 23:23:58');
/*!40000 ALTER TABLE `chat_threads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `checkins`
--

DROP TABLE IF EXISTS `checkins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `registrationId` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `checkedInBy` int(11) NOT NULL,
  `method` enum('qrcode','manual','raceNumber') NOT NULL,
  `kitDelivered` tinyint(1) DEFAULT 0,
  `kitDeliveredAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `checkins`
--

LOCK TABLES `checkins` WRITE;
/*!40000 ALTER TABLE `checkins` DISABLE KEYS */;
/*!40000 ALTER TABLE `checkins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment_likes`
--

DROP TABLE IF EXISTS `comment_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `commentId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment_likes`
--

LOCK TABLES `comment_likes` WRITE;
/*!40000 ALTER TABLE `comment_likes` DISABLE KEYS */;
INSERT INTO `comment_likes` VALUES (1,4,780086,'2026-01-23 00:00:07'),(2,5,780086,'2026-01-23 15:54:18'),(3,7,780086,'2026-01-23 15:59:10'),(4,9,780086,'2026-01-25 01:31:52'),(5,12,780086,'2026-01-25 23:15:01');
/*!40000 ALTER TABLE `comment_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comments`
--

DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `postId` int(11) NOT NULL,
  `authorId` int(11) NOT NULL,
  `parentId` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `moderationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  `moderationNote` text DEFAULT NULL,
  `moderatedAt` timestamp NULL DEFAULT NULL,
  `moderatedBy` int(11) DEFAULT NULL,
  `likesCount` int(11) DEFAULT 0,
  `repliesCount` int(11) DEFAULT 0,
  `status` enum('active','deleted','hidden') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comments`
--

LOCK TABLES `comments` WRITE;
/*!40000 ALTER TABLE `comments` DISABLE KEYS */;
INSERT INTO `comments` VALUES (1,1,780086,NULL,'Comentei ❤️❤️','approved',NULL,NULL,NULL,0,0,'active','2026-01-22 22:53:43','2026-01-22 22:53:43'),(2,1,780086,NULL,'De novo','approved',NULL,NULL,NULL,0,0,'active','2026-01-22 23:11:53','2026-01-22 23:11:53'),(3,2,780086,NULL,'Veio sem foto','approved',NULL,NULL,NULL,0,0,'active','2026-01-22 23:16:26','2026-01-22 23:16:26'),(4,3,780086,NULL,'Kd a enquete ?','approved',NULL,NULL,NULL,1,0,'deleted','2026-01-22 23:35:30','2026-01-23 00:13:44'),(5,8,780086,NULL,'Olá','approved',NULL,NULL,NULL,1,0,'active','2026-01-23 15:54:01','2026-01-23 15:54:18'),(6,8,780086,NULL,'Quem?','approved',NULL,NULL,NULL,0,0,'active','2026-01-23 15:54:26','2026-01-23 15:54:26'),(7,9,780086,NULL,'Bom dia! ☀️','approved',NULL,NULL,NULL,1,0,'active','2026-01-23 15:59:07','2026-01-23 15:59:10'),(8,9,780086,NULL,'Oihdnjx','approved',NULL,NULL,NULL,0,0,'deleted','2026-01-23 15:59:15','2026-01-23 15:59:18'),(9,10,1110006,NULL,'Kd o vídeo?','approved',NULL,NULL,NULL,1,0,'active','2026-01-23 20:02:54','2026-01-25 01:31:52'),(10,12,780086,NULL,'E oque rapaz','approved',NULL,NULL,NULL,0,0,'active','2026-01-23 20:06:12','2026-01-23 20:06:12'),(11,11,780086,NULL,'Posta vídeo e foto','approved',NULL,NULL,NULL,0,0,'active','2026-01-23 20:06:24','2026-01-23 20:06:24'),(12,13,780086,NULL,'Ola','approved',NULL,NULL,NULL,1,0,'active','2026-01-25 23:14:56','2026-01-25 23:15:01');
/*!40000 ALTER TABLE `comments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_categories`
--

DROP TABLE IF EXISTS `event_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `distance` decimal(6,2) DEFAULT NULL,
  `minAge` int(11) DEFAULT NULL,
  `maxAge` int(11) DEFAULT NULL,
  `gender` enum('male','female','mixed') DEFAULT 'mixed',
  `price` decimal(10,2) NOT NULL,
  `earlyBirdPrice` decimal(10,2) DEFAULT NULL,
  `earlyBirdEndDate` timestamp NULL DEFAULT NULL,
  `maxParticipants` int(11) DEFAULT NULL,
  `currentParticipants` int(11) DEFAULT 0,
  `startTime` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `isPaid` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=120002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_categories`
--

LOCK TABLES `event_categories` WRITE;
/*!40000 ALTER TABLE `event_categories` DISABLE KEYS */;
INSERT INTO `event_categories` VALUES (90001,120001,'Elite Jovem Masculino ',5.00,NULL,NULL,'male',100.00,NULL,NULL,500,0,NULL,'2026-01-19 05:33:59',1),(120001,150001,'Elite Misto ',5.00,NULL,NULL,'mixed',0.00,NULL,NULL,200,0,NULL,'2026-01-20 03:06:40',0);
/*!40000 ALTER TABLE `event_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_kits`
--

DROP TABLE IF EXISTS `event_kits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_kits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`items`)),
  `additionalPrice` decimal(10,2) DEFAULT 0.00,
  `sizes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sizes`)),
  `available` tinyint(1) DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_kits`
--

LOCK TABLES `event_kits` WRITE;
/*!40000 ALTER TABLE `event_kits` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_kits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_likes`
--

DROP TABLE IF EXISTS `event_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_likes`
--

LOCK TABLES `event_likes` WRITE;
/*!40000 ALTER TABLE `event_likes` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_photos`
--

DROP TABLE IF EXISTS `event_photos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `url` text NOT NULL,
  `thumbnailUrl` text DEFAULT NULL,
  `caption` text DEFAULT NULL,
  `photographer` varchar(100) DEFAULT NULL,
  `sortOrder` int(11) DEFAULT 0,
  `featured` tinyint(1) DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_photos`
--

LOCK TABLES `event_photos` WRITE;
/*!40000 ALTER TABLE `event_photos` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_photos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_rankings`
--

DROP TABLE IF EXISTS `event_rankings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_rankings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `score` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `registrationCount` int(11) DEFAULT 0,
  `viewCount` int(11) DEFAULT 0,
  `likeCount` int(11) DEFAULT 0,
  `shareCount` int(11) DEFAULT 0,
  `favoriteCount` int(11) DEFAULT 0,
  `daysUntilEvent` int(11) DEFAULT NULL,
  `hoursUntilEvent` int(11) DEFAULT NULL,
  `rankPosition` int(11) DEFAULT NULL,
  `calculatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_rankings_eventId_unique` (`eventId`)
) ENGINE=InnoDB AUTO_INCREMENT=341 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_rankings`
--

LOCK TABLES `event_rankings` WRITE;
/*!40000 ALTER TABLE `event_rankings` DISABLE KEYS */;
INSERT INTO `event_rankings` VALUES (1,150001,5.5147,0,21,0,0,0,209,5029,1,'2026-01-26 17:09:32','2026-01-21 18:59:25','2026-01-26 17:09:32'),(2,120001,1.5000,0,15,0,0,0,138,3325,2,'2026-01-26 17:09:32','2026-01-21 18:59:25','2026-01-26 17:09:32');
/*!40000 ALTER TABLE `event_rankings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_shares`
--

DROP TABLE IF EXISTS `event_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_shares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) NOT NULL,
  `userId` int(11) DEFAULT NULL,
  `platform` enum('whatsapp','instagram','facebook','twitter','copy_link','other') DEFAULT 'other',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_shares`
--

LOCK TABLES `event_shares` WRITE;
/*!40000 ALTER TABLE `event_shares` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_shares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `events`
--

DROP TABLE IF EXISTS `events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `shortDescription` text DEFAULT NULL,
  `eventDate` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `registrationStartDate` timestamp NULL DEFAULT NULL,
  `registrationEndDate` timestamp NULL DEFAULT NULL,
  `city` varchar(100) NOT NULL,
  `state` varchar(2) NOT NULL,
  `address` text DEFAULT NULL,
  `startLocation` text DEFAULT NULL,
  `finishLocation` text DEFAULT NULL,
  `routeCoordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`routeCoordinates`)),
  `mapCenter` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`mapCenter`)),
  `mapZoom` int(11) DEFAULT 14,
  `bannerUrl` text DEFAULT NULL,
  `logoUrl` text DEFAULT NULL,
  `organizerId` int(11) NOT NULL,
  `organizerName` varchar(255) DEFAULT NULL,
  `organizerContact` text DEFAULT NULL,
  `status` enum('draft','published','cancelled','finished') NOT NULL DEFAULT 'draft',
  `featured` tinyint(1) DEFAULT 0,
  `checkoutBaseUrl` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `eventType` enum('corrida','ciclismo','triathlon','trail','natacao','caminhada','ultramaratona','corrida_montanha','duathlon','aquathlon','ironman','mtb','ocr','outro') DEFAULT 'corrida',
  `cancelReason` text DEFAULT NULL,
  `cancelledAt` timestamp NULL DEFAULT NULL,
  `cancelledByOrganizerId` int(11) DEFAULT NULL,
  `searchCount` int(11) NOT NULL DEFAULT 0,
  `viewCount` int(11) NOT NULL DEFAULT 0,
  `likesCount` int(11) NOT NULL DEFAULT 0,
  `sharesCount` int(11) NOT NULL DEFAULT 0,
  `isPaidEvent` tinyint(1) NOT NULL DEFAULT 1,
  `eventTime` varchar(5) DEFAULT NULL,
  `eventStartAt` timestamp NULL DEFAULT NULL,
  `eventTimezone` varchar(50) DEFAULT 'America/Sao_Paulo',
  `subscribersCount` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `events_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=150002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `events`
--

LOCK TABLES `events` WRITE;
/*!40000 ALTER TABLE `events` DISABLE KEYS */;
INSERT INTO `events` VALUES (120001,'Corrida da fortuna de maré ','corrida-da-fortuna-de-mare-1768782839646','Vou escrever qqr coisa \n\nVou escrever qqr coisa \n\nVou escrever qqr coisa \n\nVou escrever qqr coisa \n\nVou escrever qqr coisa ','Criado para fins beneficentes ','2026-06-14 07:00:00',NULL,NULL,'Guarapari ','ES',NULL,NULL,NULL,NULL,NULL,14,'https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/events/1768784972470-2xTZr-OW-event_banner_120001_1768784971548.png',NULL,780086,'Nike Eventos ',NULL,'published',0,NULL,'2026-01-19 05:33:59','2026-01-22 16:02:28','corrida',NULL,NULL,NULL,24,15,2,3,1,NULL,'2026-06-14 11:00:00','America/Sao_Paulo',0),(150001,'Triatlón Beneficente Santa María ','triatlon-beneficente-santa-maria-1768860398440','O Triatlón Beneficente Santa María é um evento esportivo gratuito e sem fins lucrativos, criado para incentivar a prática do esporte, promover a qualidade de vida e apoiar uma causa social importante.\n\nReunindo atletas de diferentes níveis, o evento celebra o espírito do triathlon — natação, ciclismo e corrida — em um ambiente de inclusão, respeito e solidariedade. Mais do que competir, os participantes têm a oportunidade de contribuir com uma iniciativa beneficente e viver uma experiência esportiva marcante junto à comunidade de Santa María.\n\nVenha participar, superar seus desafios e transformar esporte em impacto positivo.\n','O Triatlón Beneficente Santa María é um evento esportivo gratuito que une esporte, superação e solidariedade, promovendo saúde, integração e apoio a uma causa social. Participe, desafie seus limites e faça a diferença. ','2026-08-24 07:00:00',NULL,NULL,'Vila Velha ','ES',NULL,NULL,NULL,NULL,NULL,14,'https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/events/1768860399730-MJVpJ7d9-event_banner_1768860398441.png',NULL,780086,'Asics ',NULL,'published',0,NULL,'2026-01-20 03:06:40','2026-01-22 16:23:41','corrida',NULL,NULL,NULL,0,21,1,0,0,NULL,'2026-08-24 11:00:00','America/Sao_Paulo',0);
/*!40000 ALTER TABLE `events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorites` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorites`
--

LOCK TABLES `favorites` WRITE;
/*!40000 ALTER TABLE `favorites` DISABLE KEYS */;
/*!40000 ALTER TABLE `favorites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `follow_notifications`
--

DROP TABLE IF EXISTS `follow_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `follow_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `fromUserId` int(11) NOT NULL,
  `type` enum('follow_request','follow_accepted','new_follower') NOT NULL,
  `isRead` tinyint(1) DEFAULT 0,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `follow_notifications`
--

LOCK TABLES `follow_notifications` WRITE;
/*!40000 ALTER TABLE `follow_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `follow_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_members`
--

DROP TABLE IF EXISTS `group_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `role` enum('owner','admin','moderator','member') NOT NULL DEFAULT 'member',
  `status` enum('active','pending','banned') NOT NULL DEFAULT 'active',
  `notifyPosts` tinyint(1) DEFAULT 1,
  `notifyTrainings` tinyint(1) DEFAULT 1,
  `joinedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_members`
--

LOCK TABLES `group_members` WRITE;
/*!40000 ALTER TABLE `group_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `groups`
--

DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `logoUrl` text DEFAULT NULL,
  `coverUrl` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `privacy` enum('public','private') NOT NULL DEFAULT 'public',
  `groupType` enum('running','cycling','triathlon','trail','swimming','fitness','other') DEFAULT 'running',
  `sportTypes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sportTypes`)),
  `level` enum('beginner','intermediate','advanced','all') DEFAULT 'all',
  `meetingPoint` text DEFAULT NULL,
  `meetingLat` decimal(10,7) DEFAULT NULL,
  `meetingLng` decimal(10,7) DEFAULT NULL,
  `allowJoinRequests` tinyint(1) DEFAULT 1,
  `requiresApproval` tinyint(1) DEFAULT 0,
  `memberCount` int(11) DEFAULT 0,
  `postCount` int(11) DEFAULT 0,
  `ownerId` int(11) NOT NULL,
  `status` enum('active','inactive','banned') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `groups`
--

LOCK TABLES `groups` WRITE;
/*!40000 ALTER TABLE `groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media_uploads`
--

DROP TABLE IF EXISTS `media_uploads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_uploads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `originalUrl` text NOT NULL,
  `processedUrl` text DEFAULT NULL,
  `thumbnailUrl` text DEFAULT NULL,
  `fileType` enum('image','video') NOT NULL DEFAULT 'image',
  `fileSize` int(11) DEFAULT NULL,
  `mimeType` varchar(100) DEFAULT NULL,
  `width` int(11) DEFAULT NULL,
  `height` int(11) DEFAULT NULL,
  `moderationStatus` enum('pending','approved','rejected','quarantine') NOT NULL DEFAULT 'pending',
  `aiModerationScore` decimal(5,4) DEFAULT NULL,
  `aiModerationLabels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`aiModerationLabels`)),
  `aiModerationResult` enum('allow','review','block') DEFAULT NULL,
  `reviewedAt` timestamp NULL DEFAULT NULL,
  `reviewedBy` int(11) DEFAULT NULL,
  `reviewNote` text DEFAULT NULL,
  `usedInPostId` int(11) DEFAULT NULL,
  `usedInCommentId` int(11) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_uploads`
--

LOCK TABLES `media_uploads` WRITE;
/*!40000 ALTER TABLE `media_uploads` DISABLE KEYS */;
/*!40000 ALTER TABLE `media_uploads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `type` enum('registration','payment','event','result','team','system') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `eventId` int(11) DEFAULT NULL,
  `registrationId` int(11) DEFAULT NULL,
  `teamId` int(11) DEFAULT NULL,
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `readAt` timestamp NULL DEFAULT NULL,
  `actionUrl` text DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `email` varchar(320) NOT NULL,
  `code` varchar(6) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expiresAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `usedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `password_reset_tokens_token_unique` (`token`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,30014,'contato@ilutas.com.br','306341','fhYle2MVcFixXgFVbwHcmyow5m_ZtZnd2WYU0R576HjRsZxjErKXle9KHg0tsSiV','2026-01-21 21:44:44',1,'2026-01-21 21:31:15','2026-01-21 21:29:44'),(2,30014,'contato@ilutas.com.br','735608','3K8LYOKjLRAeuHUh3nCZXGn7OqYP0dYlNtnO4fQHd7x_aTWy0fz0wp5eXixqNu89','2026-01-22 19:12:35',1,NULL,'2026-01-22 18:57:35'),(3,30014,'contato@ilutas.com.br','669854','cJFJBI8ykuPCpeT-NdfolJ4cfpP5JGlEietfyM4JLnRsKgMueLegmi62vwyplU3R','2026-01-22 19:14:53',1,'2026-01-22 19:00:49','2026-01-22 18:59:53'),(4,1110003,'gladstonmuniz78@gmail.com','782343','0y94K5xrupeiUQ_O-d-Y7idqjMOac39D0RTV1-UereQ3rZB9x7skAnASS__PDxMT','2026-01-22 19:18:36',1,NULL,'2026-01-22 19:03:36'),(5,1110003,'gladstonmuniz78@gmail.com','505255','mZaDz6Vnsc0_14QL0HcSwJD3vo9ss1u-Ax1kpGUyPkEE0mAkTBq3uLysMismuH_e','2026-01-22 19:19:45',1,NULL,'2026-01-22 19:04:45'),(6,1110003,'gladstonmuniz78@gmail.com','171342','eaKb1liW8PmX3pk5WuRVc8tmI0WOmFChEeAuO22pvGo1R46f0ha1Xkx6CvP1hGEr','2026-01-22 19:23:08',0,NULL,'2026-01-22 19:08:07'),(7,1110004,'gladston.muniz@ilutas.com.br','595748','T2S8M8KkLD_g0lo2La5C4qcbxYwHN6tFwkhGXraTagBSSbFO1rbOddwWtu5_ro7q','2026-01-22 19:26:27',1,'2026-01-22 19:12:00','2026-01-22 19:11:26'),(8,1110005,'comercial@ilutas.com.br','814784','VEe9xBWYQRwBKzCR6IDuNcUlXU9zhGY89hbl-QedqOY8a2e4_LQhvm1mFEwLLae7','2026-01-22 19:33:54',0,NULL,'2026-01-22 19:18:54'),(9,1110006,'rh@ilutas.com.br','654802','fPKYAmkXu-Pd8_kW1vqHgLhjshbNdt6ialp950RLyHAI6o-RdW3rI5n_BsEMIPrX','2026-01-22 19:36:40',1,'2026-01-22 19:21:58','2026-01-22 19:21:40'),(10,1110007,'djddj@djsj.dkn','903422','WB3TbTX15bsvkKnqFP85MgdIyIwwb05q0_tP0ogF1s0CsKujNtqL1f7_ODN8kYsJ','2026-01-22 19:46:18',1,NULL,'2026-01-22 19:31:17'),(11,1110007,'djddj@djsj.dkn','509234','_n8vhtDoz6nRlK1Kgpn62y04O6Ydi8RaM_vjeb8xwVLGHNFQaskSEg-do6z_6dTS','2026-01-22 19:46:24',1,NULL,'2026-01-22 19:31:24'),(12,1110007,'djddj@djsj.dkn','950340','1RbjOqDczSeV6Y1lMjWj1-JAGfMhnohWbxhnBmbFavSh62nM0H6J4NXWL9g8-d0k','2026-01-22 19:47:16',0,NULL,'2026-01-22 19:32:15'),(13,1110008,'sjsjsh@jsh.dkn','798444','ln3cTJ8gKEtOn1xkVdfCOabnvmxEab6GXRZCbwA2C4h06v9WoCu5rcuH1u6YOI0z','2026-01-22 19:47:43',0,NULL,'2026-01-22 19:32:42'),(14,780086,'miltongustavo@hotmail.com','625422','gMQz_ziAuZmt4lygKovcrKNykjVNvGE5o7Rsi6KszFEdbNgDUZtVtiz2A4esC-OC','2026-01-22 19:49:47',1,NULL,'2026-01-22 19:34:46'),(15,1110006,'rh@ilutas.com.br','308982','7utpBfnuU4FbNka703Ms-0SX06Nx7AP-fKTzke81ALjmexovbrbgUk_qEoQ1Sqip','2026-01-22 19:57:43',1,'2026-01-22 19:43:13','2026-01-22 19:42:43'),(16,780086,'miltongustavo@hotmail.com','841754','E9eMcBIyMGgoSTzgKNgCJthOyY0TD-IjUcJYclSJnLSkV9P2GqA5DVsNv5tmAh02','2026-01-22 19:58:41',1,'2026-01-22 19:45:05','2026-01-22 19:43:40'),(17,1110006,'rh@ilutas.com.br','662830','arkeOXn69mJyL8Eau_9r58VY6wr--xypj3rv9wLSwz_n6G23wSAtYTcaPvfrBm-g','2026-01-22 20:05:16',1,'2026-01-22 19:50:36','2026-01-22 19:50:16'),(18,780086,'miltongustavo@hotmail.com','599146','P7H9p1a45hvWS-gKzwQ8KoghJ0mOu8-fhujrsVn25KUAE_5NeGD7_JxOhTO3244c','2026-01-22 20:05:20',1,NULL,'2026-01-22 19:50:19'),(19,30014,'contato@ilutas.com.br','726717','2BAnWkuUA7Iml4eqt412kBb4s8VVPI4N8W23zQup5edKIIrrQIw-eMN54wkb0vS9','2026-01-22 20:07:47',1,'2026-01-22 19:53:04','2026-01-22 19:52:46'),(20,1110006,'rh@ilutas.com.br','207503','zoPNh3oHoLeItGUAfJA42vD4Pn_x8X9BCAT-T7o3L3QO_mm6wVSgiHHV0xHR2h70','2026-01-22 20:09:20',1,'2026-01-22 19:54:36','2026-01-22 19:54:19'),(21,780086,'miltongustavo@hotmail.com','964924','IufoEG-NmdpBmHJ6KRl-Cfg4ERL5m15Ijj5sMDJQ0NHb6xQcGpX9u6M4E9ENqGcP','2026-01-22 20:09:32',1,'2026-01-22 19:55:36','2026-01-22 19:54:31'),(22,1110006,'rh@ilutas.com.br','560597','x3pThZTy4_OF3zeHtOy9B89w6ahPOrKQ6dej_NTNiAybC0nEML7tEsMFA6u79_Pn','2026-01-22 20:11:56',1,'2026-01-22 19:57:09','2026-01-22 19:56:55'),(23,780086,'miltongustavo@hotmail.com','366354','TZklufMIeKqx3w1n48J_O9wRSJM_iHmiB9_OKAv10sb7girTHPpr6bSvKmtz1yKB','2026-01-22 20:49:32',1,'2026-01-22 20:35:01','2026-01-22 20:34:31'),(24,1110006,'rh@ilutas.com.br','759850','e0C8RibjdilVuRu-3QvSxZu8jhwJPtJ133ur_i61r4LBgOLjDMXmr1yR0nJ60kgw','2026-01-22 20:50:08',1,NULL,'2026-01-22 20:35:08'),(25,780086,'miltongustavo@hotmail.com','950153','u47oDKGJNPO1liDWyTuwFExJCk1fVbE3xej4Uhf11iZaQc2tLTK3J0I7Ph3sdlq-','2026-01-22 20:50:17',1,'2026-01-22 20:36:01','2026-01-22 20:35:16'),(26,780086,'miltongustavo@hotmail.com','161229','jHW8gb2TIBSCwTX79mNQZ-QIUJtIeny3i2KgQdK3bNGii2zkZvfWcr8b0hor3Rkf','2026-01-22 21:13:30',1,NULL,'2026-01-22 20:58:29'),(27,780086,'miltongustavo@hotmail.com','756064','De_YrUqplMUBQHaBztAYT0NJBUQgD6Jf83kQCHKu62JF0t9uO1Gid9M1pImwzoFa','2026-01-22 21:15:20',1,'2026-01-22 21:02:34','2026-01-22 21:00:20'),(28,1110006,'rh@ilutas.com.br','458813','jKgah3X27MnlsRqEg3K32vJgUuDfISQsr5r84c4rCF6YjhvjiwFyrNFT4FEHzV5V','2026-01-22 23:42:40',1,NULL,'2026-01-22 23:27:39'),(29,1110006,'rh@ilutas.com.br','918770','ZfWvd77BzweSm2BJVRVpLQrBBtX_38MBLKlu1QBMfBeWel-0XLJMUjRGm7odYnU2','2026-01-23 00:43:38',1,NULL,'2026-01-23 00:28:38'),(30,780086,'miltongustavo@hotmail.com','725415','G7S_RrT76cfhGWp9FEBYaZgBFx_XFCgxo3a5cSGtMaIK09B8006SZXO8NQ8N_TFX','2026-01-23 20:42:16',1,NULL,'2026-01-23 15:27:15'),(31,780086,'miltongustavo@hotmail.com','213157','HxxWV4aZql_q-Etp_-vzzH6pSuiqjvBIJCn-kWUammRNYRK3mqETNQUpsd5RmLJR','2026-01-23 20:45:27',1,NULL,'2026-01-23 15:30:27'),(32,780086,'miltongustavo@hotmail.com','490373','bDbPTjiewU6Pv9ZjRc6KIpH-nCg64XqNSAWgZ75D7ZO4Vci1fdNFqn0Xv5Bs9F-g','2026-01-23 20:46:00',1,NULL,'2026-01-23 15:31:00'),(33,780086,'miltongustavo@hotmail.com','611835','R7uVuSmbYRGDw2iasP541-chTnF5SVoP6NaVa_GRaL_87GvUnbqDYGD0Xk1XeUsX','2026-01-23 20:54:13',1,NULL,'2026-01-23 15:39:12'),(34,780086,'miltongustavo@hotmail.com','684506','eSfgCNERati90RCcSpmA7ydY-064zoJO4VRiZzZdneanvRs-eoFHMmhMsxdICwF-','2026-01-23 20:54:35',1,'2026-01-23 20:40:16','2026-01-23 15:39:35'),(35,1110009,'test@test.com','530340','9pmdpLrYLoAUo_7BaJ-6OD47SK2Kskpr8oRRdl3fXiqJwZ0DwUWSeaILvzhSd2fX','2026-01-23 21:04:36',0,NULL,'2026-01-23 15:49:36'),(36,1110006,'rh@ilutas.com.br','840630','dFyprVS4z-AI5oUvin9du1Vcz8oW6jn8KPlRUqiI95mNblduTGCLk1ZvbG7ps9Ri','2026-01-24 00:39:53',1,'2026-01-24 00:26:47','2026-01-23 19:24:52'),(37,780086,'miltongustavo@hotmail.com','196567','JbOuzfkW8eYHGcEotKcjpEMyFe53DIZXUPpPXrtUnBnKwXxJyoVcr9K8aE0Vi6A0','2026-01-24 00:52:01',1,'2026-01-24 00:37:37','2026-01-23 19:37:00'),(38,1110006,'rh@ilutas.com.br','459108','jtX-zXvxDu_DE5-0ACqllLc5B57WymICxCq-omsG3v4dp22Fj8TlnERzlWjD8fZS','2026-01-24 00:54:27',1,'2026-01-24 00:40:54','2026-01-23 19:39:26'),(39,1110006,'rh@ilutas.com.br','824071','mr7L_9ct2Qg1pbWRwyUJIA_Mvg_2uwWBg8IYXuCU60AvcKCNynmP5ea_RPT1AL9g','2026-01-24 01:14:15',1,'2026-01-24 00:59:44','2026-01-23 19:59:14'),(40,780086,'miltongustavo@hotmail.com','968327','_EOSi-DXs1rjGAShBoIeaYAEOjBQk4lLUEjhrZYPFoVVHsE-SWk5pjqzvB6Y7H80','2026-01-25 01:34:18',1,NULL,'2026-01-25 01:19:17'),(41,780086,'miltongustavo@hotmail.com','640522','lnemzCT321_Bf7kcLMQ-5Jnmocii6sWaACto0XGY2mMVYQZ4eC5GjPpM1prHaD7e','2026-01-25 01:34:54',1,'2026-01-25 01:21:54','2026-01-25 01:19:53'),(42,780086,'miltongustavo@hotmail.com','210459','FbnaYxylU9C8IX6Gbjn77SmkIO1LHA3GcC5v0kV65PiAsgEAm3PbFU_XeUnvP4sX','2026-01-25 15:57:22',1,NULL,'2026-01-25 15:42:22'),(43,780086,'miltongustavo@hotmail.com','275507','VJyUeyqfVm5UFwuoyoKruUPXsePF29OFSF7MQfc8KI03gsDgm1cIhEU1PSS5-gHm','2026-01-25 16:03:24',1,NULL,'2026-01-25 15:48:24'),(44,780086,'miltongustavo@hotmail.com','881140','nVnGVS-TZrADcjTz3rgaDFwoZyMjkEXC6BFh77UL1G4JHEKnnxSyP0k7fG-XS_19','2026-01-25 16:16:51',1,NULL,'2026-01-25 16:01:50'),(45,780086,'miltongustavo@hotmail.com','261734','gSTE1Cmt6mglf-d9FMAoEslC_eB9caERnhoX13TrRswdUhv_46O1tHe4LyQlyIZO','2026-01-25 16:17:16',1,'2026-01-25 16:03:39','2026-01-25 16:02:16'),(46,780086,'miltongustavo@hotmail.com','627345','wAY8Y23nVjGIactlghdoafkaFGCLCYk5s-QFikLC-YAw9j258UsY7rqN0NsxGOLm','2026-01-25 21:47:50',1,NULL,'2026-01-25 21:47:21'),(47,780086,'miltongustavo@hotmail.com','339948','t5zdOSBL1WsR-KM166EpcwnQ9KvTzj1IF3yZ0OaPfnhRsIdeSVutvuJTh_yT69XU','2026-01-25 21:50:11',1,NULL,'2026-01-25 21:47:50'),(48,780086,'miltongustavo@hotmail.com','987019','yTEYMlh18hb_e8nKmfu-glS4SCmMLGsTDZlVtaowhBWS1HcqC2ULolbqTQQ_Llq0','2026-01-25 21:50:28',1,NULL,'2026-01-25 21:50:11'),(49,780086,'miltongustavo@hotmail.com','866573','jx8uwDUDAvZNw5uf6tq1lqRLI3OCyFU7ygAnz50Fj4woQvWY5ImxzC8MvbQbs4nx','2026-01-25 21:51:07',1,'2026-01-25 21:51:07','2026-01-25 21:50:28');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post_likes`
--

DROP TABLE IF EXISTS `post_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_likes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `postId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `reactionType` enum('like','love','fire','clap','strong') NOT NULL DEFAULT 'like',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_likes`
--

LOCK TABLES `post_likes` WRITE;
/*!40000 ALTER TABLE `post_likes` DISABLE KEYS */;
INSERT INTO `post_likes` VALUES (1,1,780086,'like','2026-01-22 22:54:16'),(2,2,780086,'like','2026-01-22 23:16:10'),(3,3,780086,'like','2026-01-22 23:51:27'),(4,8,780086,'like','2026-01-23 15:54:12'),(5,9,780086,'like','2026-01-23 15:58:57'),(6,10,1110006,'like','2026-01-23 20:02:47'),(7,11,1110006,'like','2026-01-23 20:03:17'),(8,11,780086,'like','2026-01-23 20:06:29'),(9,12,780086,'like','2026-01-23 20:06:30'),(10,10,780086,'like','2026-01-23 20:06:35');
/*!40000 ALTER TABLE `post_likes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `authorId` int(11) NOT NULL,
  `groupId` int(11) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `type` enum('text','photo','video','activity','announcement','poll','training_share') NOT NULL DEFAULT 'text',
  `imageUrl` text DEFAULT NULL,
  `imageUrls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`imageUrls`)),
  `videoUrl` text DEFAULT NULL,
  `videoThumbnailUrl` text DEFAULT NULL,
  `activityData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`activityData`)),
  `pollOptions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`pollOptions`)),
  `pollEndsAt` timestamp NULL DEFAULT NULL,
  `moderationStatus` enum('pending','approved','rejected','quarantine') NOT NULL DEFAULT 'approved',
  `moderationNote` text DEFAULT NULL,
  `moderatedAt` timestamp NULL DEFAULT NULL,
  `moderatedBy` int(11) DEFAULT NULL,
  `isPinned` tinyint(1) DEFAULT 0,
  `allowComments` tinyint(1) DEFAULT 1,
  `likesCount` int(11) DEFAULT 0,
  `commentsCount` int(11) DEFAULT 0,
  `sharesCount` int(11) DEFAULT 0,
  `reactions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`reactions`)),
  `status` enum('active','deleted','hidden') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `videoAspectMode` varchar(10) DEFAULT 'fit',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts`
--

LOCK TABLES `posts` WRITE;
/*!40000 ALTER TABLE `posts` DISABLE KEYS */;
INSERT INTO `posts` VALUES (1,780086,NULL,'Olá','photo','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/ImageManipulator/9256F6A2-6B7D-47A5-ACCF-2AD78F44CAE9.jpg',NULL,NULL,NULL,NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,1,2,0,'\"{\\\"like\\\":1,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-22 22:48:55','2026-01-22 23:11:53','fit'),(2,780086,NULL,'Teste de repost','text',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,1,1,1,'\"{\\\"like\\\":1,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-22 23:12:44','2026-01-22 23:20:35','fit'),(3,780086,NULL,'Será que o verme viu???','poll',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,1,0,0,'\"{\\\"like\\\":1,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-22 23:35:02','2026-01-23 00:13:44','fit'),(4,780086,NULL,'Será?','activity',NULL,NULL,NULL,NULL,'\"{\\\"distance\\\":5,\\\"duration\\\":27,\\\"pace\\\":\\\"6:32\\\"}\"',NULL,NULL,'approved',NULL,NULL,NULL,0,1,0,0,0,'\"{\\\"like\\\":0,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','deleted','2026-01-22 23:41:35','2026-01-22 23:51:35','fit'),(5,780086,NULL,'Olha aí o resultado','activity','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/ImageManipulator/725DE5F6-872E-43E6-9E10-2EAF0DC80EF5.jpg',NULL,NULL,NULL,'\"{\\\"type\\\":\\\"run\\\",\\\"distance\\\":10,\\\"duration\\\":65,\\\"pace\\\":\\\"5:34\\\"}\"',NULL,NULL,'approved',NULL,NULL,NULL,0,1,0,0,0,'\"{\\\"like\\\":0,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-22 23:52:56','2026-01-22 23:52:56','fit'),(6,780086,NULL,'Aqui vai …','video',NULL,NULL,'file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/ImagePicker/64F0A159-5D19-4DDD-A735-0E88FE5C76EE.mov','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/VideoThumbnails/374C49AD-5525-4FB1-A467-7E540BE50818.jpg',NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,0,0,0,'\"{\\\"like\\\":0,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','deleted','2026-01-23 00:11:02','2026-01-23 00:12:03','fit'),(7,780086,NULL,'…','video',NULL,NULL,'file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/ImagePicker/6D59B1CD-9E8A-4FF9-9ABF-EDA1CFEB6B9E.mov','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/VideoThumbnails/83BBC7F1-1AB5-4854-A042-F564215F768B.jpg',NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,0,0,0,'\"{\\\"like\\\":0,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 00:13:17','2026-01-23 00:13:17','fit'),(8,780086,NULL,'Essa hora na escada …','video',NULL,NULL,'file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/ImagePicker/7C843975-6D5D-4830-BABD-2B5CF95BCEDE.mov','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d905242a-4c84-4c7e-9171-1f5ceb7fc330/VideoThumbnails/3C02AE62-FD42-4A65-A3E4-27CA478D6D17.jpg',NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,1,2,0,'\"{\\\"like\\\":1,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 00:51:57','2026-01-23 15:54:26','fit'),(9,780086,NULL,'Hj de manhã','video',NULL,NULL,'file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d8a35d24-9cba-4e29-bc43-316c87dbc3e1/ImagePicker/7CC139D1-84C9-4C8A-8824-3C71A5A2B6DF.mov','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d8a35d24-9cba-4e29-bc43-316c87dbc3e1/VideoThumbnails/FA26DA94-EEAB-40A3-8FF0-C7155682FACC.jpg',NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,1,1,0,'\"{\\\"like\\\":1,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 15:52:28','2026-01-23 15:59:18','fit'),(10,780086,NULL,'Pega a visão','video',NULL,NULL,'file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d8a35d24-9cba-4e29-bc43-316c87dbc3e1/ImagePicker/72928BD7-D6B5-4545-9204-545310462C94.mov','file:///var/mobile/Containers/Data/Application/D33294F0-D297-4A06-BE38-F406CC5DADC0/Library/Caches/ExponentExperienceData/@anonymous/souesporte-mobile-d8a35d24-9cba-4e29-bc43-316c87dbc3e1/VideoThumbnails/17426FB6-A7C5-4A9D-947B-660160B668D3.jpg',NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,2,1,0,'\"{\\\"like\\\":2,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 16:00:19','2026-01-23 20:06:35','fit'),(11,1110006,NULL,'Boa tarde moçada linda','text',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,2,1,0,'\"{\\\"like\\\":2,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 20:01:49','2026-01-23 20:06:29','fit'),(12,1110006,NULL,'Vamos treinar?','poll',NULL,NULL,NULL,NULL,NULL,'\"[{\\\"id\\\":1,\\\"text\\\":\\\"Eu\\\",\\\"votes\\\":0},{\\\"id\\\":2,\\\"text\\\":\\\"Nós\\\",\\\"votes\\\":0},{\\\"id\\\":3,\\\"text\\\":\\\"Todos\\\",\\\"votes\\\":0}]\"',NULL,'approved',NULL,NULL,NULL,0,1,1,1,0,'\"{\\\"like\\\":1,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 20:02:39','2026-01-23 20:06:30','fit'),(13,1110006,NULL,'','photo','https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/profiles/1768590938177-sxMkGRf--profile.jpg',NULL,NULL,NULL,NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,0,1,0,'\"{\\\"like\\\":0,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 20:13:31','2026-01-25 23:14:56','fit'),(14,1110006,NULL,'Kd a galera da maromba???','photo','https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/profiles/1768590938177-sxMkGRf--profile.jpg',NULL,NULL,NULL,NULL,NULL,NULL,'approved',NULL,NULL,NULL,0,1,0,0,0,'\"{\\\"like\\\":0,\\\"love\\\":0,\\\"fire\\\":0,\\\"clap\\\":0,\\\"strong\\\":0}\"','active','2026-01-23 20:14:17','2026-01-24 01:07:41','fit');
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `push_tokens`
--

DROP TABLE IF EXISTS `push_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `platform` varchar(20) NOT NULL,
  `deviceName` varchar(100) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `push_tokens`
--

LOCK TABLES `push_tokens` WRITE;
/*!40000 ALTER TABLE `push_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `push_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registrations`
--

DROP TABLE IF EXISTS `registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `categoryId` int(11) NOT NULL,
  `kitId` int(11) DEFAULT NULL,
  `kitSize` varchar(10) DEFAULT NULL,
  `categoryPrice` decimal(10,2) NOT NULL,
  `kitPrice` decimal(10,2) DEFAULT 0.00,
  `totalPrice` decimal(10,2) NOT NULL,
  `checkoutToken` varchar(64) NOT NULL,
  `paymentStatus` enum('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',
  `paymentDate` timestamp NULL DEFAULT NULL,
  `paymentMethod` varchar(50) DEFAULT NULL,
  `transactionId` varchar(100) DEFAULT NULL,
  `status` enum('pending','confirmed','cancelled','noshow') NOT NULL DEFAULT 'pending',
  `raceNumber` varchar(20) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `teamId` int(11) DEFAULT NULL,
  `registeredBy` int(11) DEFAULT NULL,
  `refundStatus` enum('none','pending','processing','completed','failed') DEFAULT 'none',
  `refundTransactionId` varchar(100) DEFAULT NULL,
  `refundedAt` timestamp NULL DEFAULT NULL,
  `refundReason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registrations_checkoutToken_unique` (`checkoutToken`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registrations`
--

LOCK TABLES `registrations` WRITE;
/*!40000 ALTER TABLE `registrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reporterId` int(11) NOT NULL,
  `targetType` enum('post','comment','user','group') NOT NULL,
  `targetId` int(11) NOT NULL,
  `reason` enum('spam','harassment','hate_speech','violence','nudity','false_information','copyright','other') NOT NULL,
  `description` text DEFAULT NULL,
  `evidenceUrls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`evidenceUrls`)),
  `status` enum('pending','reviewing','resolved','dismissed') NOT NULL DEFAULT 'pending',
  `resolution` enum('no_action','warning','content_removed','user_banned') DEFAULT NULL,
  `resolutionNote` text DEFAULT NULL,
  `resolvedAt` timestamp NULL DEFAULT NULL,
  `resolvedBy` int(11) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `results`
--

DROP TABLE IF EXISTS `results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `results` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `registrationId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `eventId` int(11) NOT NULL,
  `categoryId` int(11) NOT NULL,
  `chipTime` int(11) DEFAULT NULL,
  `gunTime` int(11) DEFAULT NULL,
  `avgPace` int(11) DEFAULT NULL,
  `overallRank` int(11) DEFAULT NULL,
  `categoryRank` int(11) DEFAULT NULL,
  `genderRank` int(11) DEFAULT NULL,
  `splits` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`splits`)),
  `certificateUrl` text DEFAULT NULL,
  `certificateGenerated` tinyint(1) DEFAULT 0,
  `status` enum('official','dnf','dq','dns') DEFAULT 'official',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `results_registrationId_unique` (`registrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `results`
--

LOCK TABLES `results` WRITE;
/*!40000 ALTER TABLE `results` DISABLE KEYS */;
/*!40000 ALTER TABLE `results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_posts`
--

DROP TABLE IF EXISTS `saved_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `postId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_posts`
--

LOCK TABLES `saved_posts` WRITE;
/*!40000 ALTER TABLE `saved_posts` DISABLE KEYS */;
INSERT INTO `saved_posts` VALUES (1,780086,1,'2026-01-22 23:15:06');
/*!40000 ALTER TABLE `saved_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `social_notifications`
--

DROP TABLE IF EXISTS `social_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `social_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `fromUserId` int(11) NOT NULL,
  `type` enum('new_follower','follow_request','follow_accepted','like','comment','mention','new_post','share','message','event_registration','event_cancel') NOT NULL,
  `postId` int(11) DEFAULT NULL,
  `commentId` int(11) DEFAULT NULL,
  `eventId` int(11) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `isRead` tinyint(1) DEFAULT 0,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_userId` (`userId`),
  KEY `idx_fromUserId` (`fromUserId`),
  KEY `idx_createdAt` (`createdAt`),
  KEY `idx_isRead` (`isRead`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `social_notifications`
--

LOCK TABLES `social_notifications` WRITE;
/*!40000 ALTER TABLE `social_notifications` DISABLE KEYS */;
INSERT INTO `social_notifications` VALUES (1,780086,930001,'new_follower',NULL,NULL,NULL,NULL,1,'2026-01-25 16:07:01'),(2,780086,1110006,'like',1,NULL,NULL,NULL,1,'2026-01-25 16:02:01'),(3,780086,930001,'comment',1,NULL,NULL,NULL,1,'2026-01-25 15:57:01'),(4,780086,1110006,'follow_request',NULL,NULL,NULL,NULL,1,'2026-01-25 15:42:01'),(5,780086,930001,'like',2,NULL,NULL,NULL,1,'2026-01-25 15:12:01'),(6,930001,780086,'new_follower',NULL,NULL,NULL,NULL,0,'2026-01-25 16:10:01'),(7,930001,780086,'like',3,NULL,NULL,NULL,0,'2026-01-25 15:52:01');
/*!40000 ALTER TABLE `social_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_invitations`
--

DROP TABLE IF EXISTS `team_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_invitations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teamId` int(11) NOT NULL,
  `email` varchar(320) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `invitedBy` int(11) NOT NULL,
  `role` enum('admin','member') NOT NULL DEFAULT 'member',
  `token` varchar(64) NOT NULL,
  `status` enum('pending','accepted','rejected','expired') NOT NULL DEFAULT 'pending',
  `expiresAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `respondedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_invitations_token_unique` (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_invitations`
--

LOCK TABLES `team_invitations` WRITE;
/*!40000 ALTER TABLE `team_invitations` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_invitations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_members`
--

DROP TABLE IF EXISTS `team_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teamId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
  `status` enum('pending','active','inactive') NOT NULL DEFAULT 'pending',
  `nickname` varchar(100) DEFAULT NULL,
  `jerseyNumber` varchar(10) DEFAULT NULL,
  `joinedAt` timestamp NULL DEFAULT NULL,
  `invitedBy` int(11) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `logoUrl` text DEFAULT NULL,
  `bannerUrl` text DEFAULT NULL,
  `primaryColor` varchar(7) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `website` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `isPublic` tinyint(1) DEFAULT 1,
  `allowJoinRequests` tinyint(1) DEFAULT 1,
  `ownerId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `groupType` enum('gratuito','pago') NOT NULL DEFAULT 'gratuito',
  `monthlyPrice` decimal(10,2) DEFAULT 0.00,
  `billingPeriod` enum('mensal','trimestral','semestral','anual') DEFAULT 'mensal',
  `communityBenefits` text DEFAULT NULL,
  `instructorName` varchar(255) DEFAULT NULL,
  `instructorSpecialty` varchar(255) DEFAULT NULL,
  `instructorBio` text DEFAULT NULL,
  `instructorPhotoUrl` text DEFAULT NULL,
  `modality` enum('corrida','triathlon','bike','natacao','funcional','outro') DEFAULT 'corrida',
  `preferredDistances` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferredDistances`)),
  `rules` text DEFAULT NULL,
  `allowPublicTrainings` tinyint(1) DEFAULT 1,
  `requireMemberApproval` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teams_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `training_rsvps`
--

DROP TABLE IF EXISTS `training_rsvps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_rsvps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trainingId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `response` enum('going','maybe','not_going') NOT NULL,
  `checkedIn` tinyint(1) DEFAULT 0,
  `checkedInAt` timestamp NULL DEFAULT NULL,
  `checkedInLat` decimal(10,7) DEFAULT NULL,
  `checkedInLng` decimal(10,7) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `training_rsvps`
--

LOCK TABLES `training_rsvps` WRITE;
/*!40000 ALTER TABLE `training_rsvps` DISABLE KEYS */;
/*!40000 ALTER TABLE `training_rsvps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainings`
--

DROP TABLE IF EXISTS `trainings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `groupId` int(11) NOT NULL,
  `createdBy` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `trainingType` enum('easy_run','speed_work','endurance','trail','swimming','brick','recovery','other') NOT NULL DEFAULT 'easy_run',
  `scheduledAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `durationMinutes` int(11) DEFAULT NULL,
  `meetingPoint` text DEFAULT NULL,
  `meetingLat` decimal(10,7) DEFAULT NULL,
  `meetingLng` decimal(10,7) DEFAULT NULL,
  `maxParticipants` int(11) DEFAULT NULL,
  `goingCount` int(11) DEFAULT 0,
  `maybeCount` int(11) DEFAULT 0,
  `notGoingCount` int(11) DEFAULT 0,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `isRecurring` tinyint(1) DEFAULT 0,
  `recurrenceRule` varchar(100) DEFAULT NULL,
  `parentTrainingId` int(11) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainings`
--

LOCK TABLES `trainings` WRITE;
/*!40000 ALTER TABLE `trainings` DISABLE KEYS */;
/*!40000 ALTER TABLE `trainings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_blocks`
--

DROP TABLE IF EXISTS `user_blocks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_blocks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `blockerId` int(11) NOT NULL,
  `blockedId` int(11) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_block` (`blockerId`,`blockedId`),
  KEY `idx_blocker` (`blockerId`),
  KEY `idx_blocked` (`blockedId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_blocks`
--

LOCK TABLES `user_blocks` WRITE;
/*!40000 ALTER TABLE `user_blocks` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_blocks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_follows`
--

DROP TABLE IF EXISTS `user_follows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_follows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `followerId` int(11) NOT NULL,
  `followingId` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('pending','accepted','rejected') DEFAULT 'accepted',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`followerId`,`followingId`),
  KEY `idx_follower` (`followerId`),
  KEY `idx_following` (`followingId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_follows`
--

LOCK TABLES `user_follows` WRITE;
/*!40000 ALTER TABLE `user_follows` DISABLE KEYS */;
INSERT INTO `user_follows` VALUES (5,780086,1110006,'2026-01-24 01:13:46','accepted'),(6,1110006,780086,'2026-01-25 00:43:28','accepted');
/*!40000 ALTER TABLE `user_follows` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_reports`
--

DROP TABLE IF EXISTS `user_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reporterId` int(11) NOT NULL,
  `reportedUserId` int(11) DEFAULT NULL,
  `reportedPostId` int(11) DEFAULT NULL,
  `reportedMessageId` int(11) DEFAULT NULL,
  `reason` enum('spam','harassment','inappropriate_content','fake_profile','other') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
  `createdAt` timestamp NULL DEFAULT current_timestamp(),
  `reviewedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reporter` (`reporterId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_reports`
--

LOCK TABLES `user_reports` WRITE;
/*!40000 ALTER TABLE `user_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openId` varchar(64) NOT NULL,
  `name` text DEFAULT NULL,
  `username` varchar(30) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `loginMethod` varchar(64) DEFAULT NULL,
  `role` enum('user','admin','organizer') NOT NULL DEFAULT 'user',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `lastSignedIn` timestamp NOT NULL DEFAULT current_timestamp(),
  `cpf` varchar(14) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthDate` timestamp NULL DEFAULT NULL,
  `gender` enum('male','female','other','prefiro_nao_informar') DEFAULT NULL,
  `photoUrl` text DEFAULT NULL,
  `street` text DEFAULT NULL,
  `number` varchar(20) DEFAULT NULL,
  `complement` text DEFAULT NULL,
  `neighborhood` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(2) DEFAULT NULL,
  `zipCode` varchar(10) DEFAULT NULL,
  `emergencyName` text DEFAULT NULL,
  `emergencyPhone` varchar(20) DEFAULT NULL,
  `bloodType` varchar(5) DEFAULT NULL,
  `healthInfo` text DEFAULT NULL,
  `totalRaces` int(11) DEFAULT 0,
  `totalDistance` decimal(10,2) DEFAULT 0.00,
  `bestTime5k` int(11) DEFAULT NULL,
  `bestTime10k` int(11) DEFAULT NULL,
  `bestTime21k` int(11) DEFAULT NULL,
  `bestTime42k` int(11) DEFAULT NULL,
  `passwordHash` varchar(255) DEFAULT NULL,
  `profileStatus` enum('INCOMPLETE','BASIC_COMPLETE') DEFAULT 'INCOMPLETE',
  `billingStatus` enum('INCOMPLETE','COMPLETE') DEFAULT 'INCOMPLETE',
  `followersCount` int(11) DEFAULT 0,
  `followingCount` int(11) DEFAULT 0,
  `gridBio` varchar(150) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `isPrivate` tinyint(1) DEFAULT 0,
  `athleteCategory` enum('PRO','AMATEUR','COACH') DEFAULT NULL,
  `sports` text DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=1110010 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'iambsaUEge6xSGFR8ubhMg','Test','test_1','test@test.com','google','admin','2026-01-08 22:07:08','2026-01-25 00:43:18','2026-01-21 01:41:03',NULL,NULL,'1990-01-01 10:00:00','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'BASIC_COMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(30014,'4pd8UBGFjbxSy5vZKacbhx','Gladston Muniz','gladston_muniz_30014','contato@ilutas.com.br','google','user','2026-01-08 23:15:04','2026-01-25 00:43:18','2026-01-22 19:53:04',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'408da8b885ece59ca63cd622c07a4bbc:1e22c2fb3badcfa5e65177d85aace277027ba3570e117a52e0f72485580597ed5786312b05ddab3b8af9bc863d7834a6b0d9704fc8a368a3b011b612a3351dc8','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(540003,'mobile-u9RwAtBVY6qcm9BU','Test User','test_user_540003','test123@example.com','email','user','2026-01-15 06:28:07','2026-01-25 00:43:18','2026-01-15 06:28:07',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(540005,'mobile-JIQ-yed1x6WWM4ML','Teste Usuario','teste_usuario_540005','teste999@example.com','email','user','2026-01-15 06:31:01','2026-01-25 00:43:18','2026-01-15 06:31:01','12345678900','11999999999','1990-01-01 05:00:00','male',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','COMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(540021,'mobile-Um9ryAEuWTtrpL5-','Teste User','teste_user_540021','teste123@teste.com','email','user','2026-01-15 07:09:11','2026-01-25 00:43:18','2026-01-15 07:09:28','12345678901','11999999999',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','COMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(600001,'mobile-3RqcnbTySA8f9Tv5','Usuario Teste','usuario_teste_600001','usuario.teste@example.com','email','user','2026-01-15 16:58:06','2026-01-25 00:43:18','2026-01-15 17:01:11','98765432100',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','COMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(780082,'mobile-VUw3AKcnH2v1evi5','Novo Usuario','novo_usuario_780082','novo@example.com','email','user','2026-01-15 21:18:28','2026-01-25 00:43:18','2026-01-15 21:18:34','99988877766','11888888888',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'f219cfc8ea8ef839389c29f62331dffb:af7883bfd7ea6f81bd6988c52986bc003afa978a73f908f4d8768e6445b9bfa13222b256d8b1208343aff1682bc919a9d27f68d38c5fa9c1956b54d68553ecbc','INCOMPLETE','COMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(780086,'mobile-XPPxQjThcMhk7Yz4','Milton Gustavo ','milton_gustavo','miltongustavo@hotmail.com','email','user','2026-01-15 21:32:41','2026-01-25 23:16:17','2026-01-25 21:51:07','08278699755','27999897080','1978-12-28 08:00:00','male','https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/profiles/1768494760255-RR3r3h-V-profile.jpg',NULL,NULL,NULL,NULL,'Vitória','ES',NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'d6da620573c762f2ddf0ef05e9e56780:0598149320aabb36900f042d5b0c81ed56e9771a6bea9391804aa962c5d05ceaf765711f3b355cd9865ccffdc90bbf76a846ae643ebce28e144b7a443b9419c2','BASIC_COMPLETE','COMPLETE',0,1,'Amo correr! Essa é minha paixão! \nNike.com',NULL,0,'PRO','[\"corrida\",\"ciclismo\"]','Brasil'),(840001,'mobile-1Bi6lTTmN_VQcuYS','Test Reset User','test_reset_user_840001','test-reset-1768499761828@example.com','email','user','2026-01-15 22:56:02','2026-01-25 00:43:18','2026-01-15 22:56:02',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'33c0bdbff86933be752f40c9f7d88426:83a76b584cc36c63e9e79fbfe4d4c6c3c22d3c7800c3d76d41a86b7449efc2d2d71fc0fe8e03bd101a84cf447c73559b80504cd7d6dd11c9379fed1b7db6aeb6','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840002,'mobile-jJ76KX3XxNMFx_6B','Test Reset User','test_reset_user_840002','test-reset-1768499777393@example.com','email','user','2026-01-15 22:56:17','2026-01-25 00:43:18','2026-01-15 22:56:17',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'9ba97116d8ae639d5e8a1d549898833d:1dca363e80b0b1390491433dd9786d798b69130a5737bbf0dbb7f70232df2c14e95df3c43bc3deda6ba63548e43b36e2b4184da95603abce2ce094b982c80e93','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840003,'mobile-F5erKWB-tU3uGxn5','Test Reset User','test_reset_user_840003','test-reset-1768499822283@example.com','email','user','2026-01-15 22:57:02','2026-01-25 00:43:18','2026-01-15 22:57:02',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'85bec9b0934ec983afa9bdfd5c974240:68f561e273e9b20f0a02564d029279d44d3ed28d649309d790a86a691c9a8e7717196d7733d3776e29fe8cd205ecb928aca79651d3fb268f7a793b88ae997a22','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840004,'mobile-0EqueJ2860H2D-rb','Test Validate User','test_validate_user_840004','test-validate-1768499822639@example.com','email','user','2026-01-15 22:57:02','2026-01-25 00:43:18','2026-01-15 22:57:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'b0cbf50c79a877b93191e47fa9b3dc12:83133e04877501ab811968f3d9cf88ddd46f0b1485d455a03102fd674dd1d97d2dbb87d4b7ef89f8ce5c348ac3130705945edaf1b4d1fa575da96e4420dac66f','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840005,'mobile-8IMKyN0FXINKD3f7','Test Reject User','test_reject_user_840005','test-reject-1768499822802@example.com','email','user','2026-01-15 22:57:02','2026-01-25 00:43:18','2026-01-15 22:57:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'3ccb083785723a86856bf1e7af21b743:d0865050d38f698d3190ef6016a7fa96ef1318a58faf2517779dc680cb0338bc364607485fb17af21322998e3c7809dd62f66d4f41d26cbb725f1dc5a1bb49b2','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840006,'mobile-59eQ7Yl4RHUSSdfb','Test Use User','test_use_user_840006','test-use-1768499822958@example.com','email','user','2026-01-15 22:57:02','2026-01-25 00:43:18','2026-01-15 22:57:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'1557337910208868a6a763e4182519e6:ad0456152b442c5942238c3e64a3581f0e4b15d7177bda4379524493c3ff2cbd9eae110177f7edb4037aa206da03bce86e96cb3e959e755020f14f018051b2c7','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840007,'mobile-I5Ox4OVeC0TKP_ch','Test Find User','test_find_user_840007','test-find-1768499823117@example.com','email','user','2026-01-15 22:57:03','2026-01-25 00:43:18','2026-01-15 22:57:03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'9d51a7100f24c72ff33d7679e6ff2c1e:8208c3bca9284008fd4a09a281e2bdca25244d27bede59c632fec9487b853762f2e66efdaeb079e852a402dff87066d230cae35f418ae1853a672d4905b6646c','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840008,'mobile-BiorOUXiaQ7u86ly','Test Reset User','test_reset_user_840008','test-reset-1768499871165@example.com','email','user','2026-01-15 22:57:51','2026-01-25 00:43:18','2026-01-15 22:57:51',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'6f5cde4e0c36b50b052d555fb123ae98:e18022d029322384a80b4256626ba35a4ae2054c2af87e5ed28c1a82b7ffe884ef23ec24a0295aeb728473f3be8c4bd611cdfbfd21e08ae660b0d16d0949678a','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840009,'mobile-t-8ArN4DUhubbO3j','Test Validate User','test_validate_user_840009','test-validate-1768499871533@example.com','email','user','2026-01-15 22:57:51','2026-01-25 00:43:18','2026-01-15 22:57:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'07cd6dd092866267d16b9a3adfac0234:baf1e546f64c5f92e693dc801c145d80bbbbbc3ddec3757a6b1efab53914b4b8563eae5d6e732dd4b01bc47ee30327d5a70bdcd11d4502c1ee57c97a01dae90b','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840010,'mobile-oYpoadUdqc-nJ2O9','Test Reject User','test_reject_user_840010','test-reject-1768499871698@example.com','email','user','2026-01-15 22:57:51','2026-01-25 00:43:18','2026-01-15 22:57:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'4f7c2baa4471c9ec8cd7676b2853a45f:e6a11d339ffb5a951441b7a221dc12323981a65921dde94bf704b4b7fe3049a4424de276a6e9701634cdad1bb4c617c4c6221380ee34235bc1534ecb197cd232','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840011,'mobile-qjnzAVX89E2vpcfe','Test Use User','test_use_user_840011','test-use-1768499871856@example.com','email','user','2026-01-15 22:57:51','2026-01-25 00:43:18','2026-01-15 22:57:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'21d4f13bd4e45ebd2b2bdb914147d049:6df5c918afc67d16c58cb6f5bf839cb11dd8e82e74ae6927cc62ff6c33cead7fb8238e2abc941e395cd6b1f60bf92d3e57978a5a2963c8e6deceeb81afd2eb5f','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840012,'mobile-7nQkWKuIAaoobNt_','Test Find User','test_find_user_840012','test-find-1768499872013@example.com','email','user','2026-01-15 22:57:52','2026-01-25 00:43:18','2026-01-15 22:57:52',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'b068975adfa63d6b4b4c7a8ccf7bae86:4390e25d71ce550564e5d40fc4bf11f89b49efeb63b8fe2ca25414dcd8b62dc2f3d7ee339d5be9c3ddef9adb2cc7a10d3e36eb9b8a7e42a03d4797b82c73f01b','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840013,'mobile-NLyQKata_sDFSjJA','Test Reset User','test_reset_user_840013','test-reset-1768499889396@example.com','email','user','2026-01-15 22:58:09','2026-01-25 00:43:18','2026-01-15 22:58:09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'b8147bb5b187f4f182e48224a9b37d5e:ba5c55b014bafd243f175586d18ac9f8406a7b47410f2101ff8e05b03548678b5e0b667a42fca1528a13ce0e66b6b4363955c61688d77aac93926d7874fd8662','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840014,'mobile-l2f-4sqwhcPO9DBP','Test Validate User','test_validate_user_840014','test-validate-1768499889772@example.com','email','user','2026-01-15 22:58:09','2026-01-25 00:43:18','2026-01-15 22:58:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'e5b54a620b9b6d6e2c0f30f3933caf98:84993806bb237ca30a596ef6e65c4ab5fc3e6f9a156f278482d0130767701da9cdef0722d2cb93b284deaea44a61734f4ce44cd7d523b6cd1233a11fbbafb50b','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840015,'mobile-M0JAleFKla_njJRY','Test Reject User','test_reject_user_840015','test-reject-1768499889945@example.com','email','user','2026-01-15 22:58:09','2026-01-25 00:43:18','2026-01-15 22:58:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'d95f86079a7092b81ae5ca591ad3afa6:7eae9f20b4d3c1430e10bad22d7ad7e259d3b1cd5d78fd2eddf926f91d1e3d23f39654dc5d8b07ce825b4cb09ef9ed109555a3204e8f6595cd75bedfdb89f15a','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840016,'mobile-W5pN6kX7Eo9hx6XB','Test Use User','test_use_user_840016','test-use-1768499890107@example.com','email','user','2026-01-15 22:58:10','2026-01-25 00:43:18','2026-01-15 22:58:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'e7631647322bec2d5504f7a02a528532:09d0b060665d1720e8063471b8f9a9c5384c0fbf4406325522f42be8ab8ee860023383d4d018ef5c48e70b5aeffbf20008119b6455ab3fcca249381a9ddd5765','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(840017,'mobile-3N_WhzqCdLcZzNnz','Test Find User','test_find_user_840017','test-find-1768499890269@example.com','email','user','2026-01-15 22:58:10','2026-01-25 00:43:18','2026-01-15 22:58:10',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'e742f42cee2ca70d1297b5dc30168f90:2449e88f054d434a8def1952351fb6319fc297aaacc7329ccba6780269007402d042e5d9e1f420ee94665585d20c89b3e0c095451d9a4478d4b37fe9bf379aa3','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(870001,'mobile-BrckAlUlfGEBfwZt','Teste Atualizado','teste_atualizado_870001','testesemcpf@teste.com','email','user','2026-01-16 00:00:03','2026-01-25 00:43:18','2026-01-16 00:00:08','11122233344','11966666666','1990-05-15 04:00:00','male',NULL,NULL,NULL,NULL,NULL,'São Paulo','SP',NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'30dd8c0575d75482edf3bf15901398f1:7d3be6aaea9bcc9d5621c8495f3d3870bfa715240e8e634b905562d6561e951f246205f8d5a495358ba7678a7d1799cb920a1b65d77b834b27b7e41bec5ae95b','INCOMPLETE','COMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(930001,'mobile-YSJjq_XypGIS-KwY','Gladston Muniz','gladston_muniz_930001','gladston@ilutas.com.br','email','user','2026-01-17 00:15:38','2026-01-25 00:43:18','2026-01-17 00:18:39','07876429750','27996600345','1978-04-22 08:00:00','male','https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/profiles/1768590938177-sxMkGRf--profile.jpg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'94f9c13257b06714adb659b8bcd7ff7c:be13f81cef8eb1316ea250bfd2e1910a6f54ffbfafcbd1fe05de53888573a397b823deaa6d030efe0910a3f9d8583cfb87f69779b8d4f8e82ea9b8f1c9ff3281','BASIC_COMPLETE','COMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110002,'mobile-gbLgh8LiK23muyBU','Teste Usuario','teste_usuario_1110002','teste@souesporte.com','email','user','2026-01-19 01:30:27','2026-01-25 00:43:18','2026-01-19 01:30:32',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,'255ce278e6c28a22698cccd0e8926345:0e5bb49eeb448f085f884af7e1176bb010d0515967ea1b36d977b382c7c487a00c0d64d0182a008bf51dd453fa2067243a9575d8e9b1d0934b65bb46276b681e','INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110003,'otp-ESvdx_KzhsJXkwze',NULL,'user_1110003','gladstonmuniz78@gmail.com','otp','user','2026-01-22 19:03:36','2026-01-25 00:43:18','2026-01-22 19:03:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110004,'otp-jC7vNR-I4zGjcU-f',NULL,'user_1110004','gladston.muniz@ilutas.com.br','otp','user','2026-01-22 19:11:26','2026-01-25 00:43:18','2026-01-22 19:12:00',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110005,'otp-otAdAc5FzMWA11ad',NULL,'user_1110005','comercial@ilutas.com.br','otp','user','2026-01-22 19:18:54','2026-01-25 00:43:18','2026-01-22 19:18:54',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110006,'otp-j1hZSP4oeW4sc4sI','Gladston Muniz','gladston_muniz','rh@ilutas.com.br','otp','user','2026-01-22 19:21:40','2026-01-25 00:43:18','2026-01-24 00:59:44',NULL,'(27) 99945-0345','1978-04-22 10:00:00','male','https://d2xsxph8kpxj0f.cloudfront.net/310419663028325284/Kq79SmAWASdepGQX53hVjC/profiles/1768590938177-sxMkGRf--profile.jpg',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'BASIC_COMPLETE','INCOMPLETE',1,0,'Corredor apaixonado por maratonas','Esportes: corrida, ciclismo',0,NULL,NULL,NULL),(1110007,'otp-E5UiBii4za5o7Wwm',NULL,'user_1110007','djddj@djsj.dkn','otp','user','2026-01-22 19:31:17','2026-01-25 00:43:18','2026-01-22 19:31:18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110008,'otp-aZUhqrXgLIEe_hjK',NULL,'user_1110008','sjsjsh@jsh.dkn','otp','user','2026-01-22 19:32:42','2026-01-25 00:43:18','2026-01-22 19:32:43',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL),(1110009,'otp-u2D8lSo3W39rNQcJ',NULL,'user_1110009','test@test.com','otp','user','2026-01-23 15:49:36','2026-01-25 00:43:18','2026-01-23 20:49:36',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,0.00,NULL,NULL,NULL,NULL,NULL,'INCOMPLETE','INCOMPLETE',0,0,NULL,NULL,0,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voucher_usages`
--

DROP TABLE IF EXISTS `voucher_usages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `voucher_usages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `voucherId` int(11) NOT NULL,
  `userId` int(11) NOT NULL,
  `registrationId` int(11) DEFAULT NULL,
  `discountApplied` decimal(10,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voucher_usages`
--

LOCK TABLES `voucher_usages` WRITE;
/*!40000 ALTER TABLE `voucher_usages` DISABLE KEYS */;
/*!40000 ALTER TABLE `voucher_usages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vouchers`
--

DROP TABLE IF EXISTS `vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `vouchers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `eventId` int(11) DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `discountType` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `discountValue` decimal(10,2) NOT NULL,
  `maxUses` int(11) DEFAULT NULL,
  `currentUses` int(11) NOT NULL DEFAULT 0,
  `minOrderValue` decimal(10,2) DEFAULT NULL,
  `validFrom` timestamp NULL DEFAULT NULL,
  `validUntil` timestamp NULL DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `description` text DEFAULT NULL,
  `createdBy` int(11) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `vouchers_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vouchers`
--

LOCK TABLES `vouchers` WRITE;
/*!40000 ALTER TABLE `vouchers` DISABLE KEYS */;
/*!40000 ALTER TABLE `vouchers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'souesporte'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-26 12:10:22
