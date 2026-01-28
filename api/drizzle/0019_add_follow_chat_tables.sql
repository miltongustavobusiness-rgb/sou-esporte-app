-- Add user_follows table for follow relationships
CREATE TABLE IF NOT EXISTS `user_follows` (
  `id` int NOT NULL AUTO_INCREMENT,
  `followerId` int NOT NULL,
  `followingId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_follow` (`followerId`, `followingId`),
  KEY `idx_follower` (`followerId`),
  KEY `idx_following` (`followingId`)
);

-- Add chat_threads table for direct messages
CREATE TABLE IF NOT EXISTS `chat_threads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user1Id` int NOT NULL,
  `user2Id` int NOT NULL,
  `lastMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_thread` (`user1Id`, `user2Id`),
  KEY `idx_user1` (`user1Id`),
  KEY `idx_user2` (`user2Id`)
);

-- Add chat_messages table for individual messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `threadId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_thread` (`threadId`),
  KEY `idx_sender` (`senderId`)
);

-- Add follower/following counts to users table if not exists
ALTER TABLE `users` 
  ADD COLUMN IF NOT EXISTS `followersCount` int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `followingCount` int DEFAULT 0;
