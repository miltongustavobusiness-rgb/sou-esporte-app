import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended for athlete profile data.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  username: varchar("username", { length: 30 }).unique(),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // For email/password auth
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "organizer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  
  // Athlete profile fields
  cpf: varchar("cpf", { length: 14 }),
  phone: varchar("phone", { length: 20 }),
  birthDate: timestamp("birthDate"),
  gender: mysqlEnum("gender", ["male", "female", "other", "prefiro_nao_informar"]),
  photoUrl: text("photoUrl"),
  
  // Profile and Billing Status (for Apple/Google compliance)
  profileStatus: mysqlEnum("profileStatus", ["INCOMPLETE", "BASIC_COMPLETE"]).default("INCOMPLETE"),
  billingStatus: mysqlEnum("billingStatus", ["INCOMPLETE", "COMPLETE"]).default("INCOMPLETE"),
  
  // Address (only filled on checkout web, never in app)
  street: text("street"),
  number: varchar("number", { length: 20 }),
  complement: text("complement"),
  neighborhood: text("neighborhood"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  
  // Emergency contact
  emergencyName: text("emergencyName"),
  emergencyPhone: varchar("emergencyPhone", { length: 20 }),
  
  // Health info
  bloodType: varchar("bloodType", { length: 5 }),
  healthInfo: text("healthInfo"),
  
  // Statistics (cached for performance)
  totalRaces: int("totalRaces").default(0),
  totalDistance: decimal("totalDistance", { precision: 10, scale: 2 }).default("0"),
  bestTime5k: int("bestTime5k"), // in seconds
  bestTime10k: int("bestTime10k"),
  bestTime21k: int("bestTime21k"),
  bestTime42k: int("bestTime42k"),
  
  // Social profile fields
  bio: text("bio"),
  gridBio: varchar("gridBio", { length: 150 }),
  followersCount: int("followersCount").default(0),
  followingCount: int("followingCount").default(0),
  
  // Athlete category and sports
  athleteCategory: mysqlEnum("athleteCategory", ["PRO", "AMATEUR", "COACH"]),
  sports: text("sports"), // JSON array of sports/modalidades
  country: varchar("country", { length: 100 }),
  
  // Auth flow fields (V12.9) - REMOVIDOS para compatibilidade com banco atual
  // Para habilitar, execute a migração: database/migrations/V12.9_auth_flow_fields.sql
  // emailVerified: boolean("emailVerified").default(false),
  // emailVerifiedAt: timestamp("emailVerifiedAt"),
  // loginProvider: mysqlEnum("loginProvider", ["email", "phone", "google", "apple", "facebook"]).default("email"),
  // accountStatus: mysqlEnum("accountStatus", ["active", "blocked", "pending_verification"]).default("active"),
  // failedLoginAttempts: int("failedLoginAttempts").default(0),
  // blockedAt: timestamp("blockedAt"),
  // blockedReason: text("blockedReason"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Events table - Running races and competitions
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  shortDescription: text("shortDescription"),
  eventType: mysqlEnum("eventType", [
    "corrida", "ciclismo", "triathlon", "trail", "natacao", "caminhada",
    "ultramaratona", "corrida_montanha", "duathlon", "aquathlon", "ironman", "mtb", "ocr",
    "outro"
  ]).default("corrida"),
  
  // Dates
  eventDate: timestamp("eventDate").notNull(),
  eventTime: varchar("eventTime", { length: 5 }), // HH:mm format (e.g., "07:00")
  eventStartAt: timestamp("eventStartAt"), // Full datetime for countdown (with timezone consideration)
  eventTimezone: varchar("eventTimezone", { length: 50 }).default("America/Sao_Paulo"), // IANA timezone
  registrationStartDate: timestamp("registrationStartDate"),
  registrationEndDate: timestamp("registrationEndDate"),
  
  // Location
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  address: text("address"),
  startLocation: text("startLocation"),
  finishLocation: text("finishLocation"),
  
  // Route coordinates for Google Maps (JSON array of {lat, lng})
  routeCoordinates: json("routeCoordinates"),
  mapCenter: json("mapCenter"), // {lat, lng}
  mapZoom: int("mapZoom").default(14),
  
  // Media
  bannerUrl: text("bannerUrl"),
  logoUrl: text("logoUrl"),
  
  // Organizer
  organizerId: int("organizerId").notNull(),
  organizerName: varchar("organizerName", { length: 255 }),
  organizerContact: text("organizerContact"),
  
  // Status
  status: mysqlEnum("status", ["draft", "published", "cancelled", "finished"]).default("draft").notNull(),
  featured: boolean("featured").default(false),
  
  // Cancellation info
  cancelReason: text("cancelReason"),
  cancelledAt: timestamp("cancelledAt"),
  cancelledByOrganizerId: int("cancelledByOrganizerId"),
  
  // Metrics for ranking
  searchCount: int("searchCount").default(0).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  likesCount: int("likesCount").default(0).notNull(),
  sharesCount: int("sharesCount").default(0).notNull(),
  subscribersCount: int("subscribersCount").default(0).notNull(), // Contagem de inscritos ativos
  
  // Pricing type
  isPaidEvent: boolean("isPaidEvent").default(true).notNull(), // false = evento gratuito, true = evento pago
  
  // Checkout
  checkoutBaseUrl: text("checkoutBaseUrl"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Event categories - Different race distances and age groups
 */
export const eventCategories = mysqlTable("event_categories", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(), // e.g., "5K", "10K", "21K"
  distance: decimal("distance", { precision: 6, scale: 2 }), // in km
  
  // Age restrictions
  minAge: int("minAge"),
  maxAge: int("maxAge"),
  gender: mysqlEnum("gender", ["male", "female", "mixed"]).default("mixed"),
  
  // Pricing
  isPaid: boolean("isPaid").default(true).notNull(), // false = categoria gratuita, true = categoria paga
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  earlyBirdPrice: decimal("earlyBirdPrice", { precision: 10, scale: 2 }),
  earlyBirdEndDate: timestamp("earlyBirdEndDate"),
  
  // Capacity
  maxParticipants: int("maxParticipants"),
  currentParticipants: int("currentParticipants").default(0),
  
  // Start time
  startTime: timestamp("startTime"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventCategory = typeof eventCategories.$inferSelect;
export type InsertEventCategory = typeof eventCategories.$inferInsert;

/**
 * Event kits - Optional items included in registration
 */
export const eventKits = mysqlTable("event_kits", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  
  name: varchar("name", { length: 100 }).notNull(), // e.g., "Basic", "Premium"
  description: text("description"),
  
  // Items included (JSON array)
  items: json("items"), // ["T-shirt", "Medal", "Bag"]
  
  // Pricing (additional to category price)
  additionalPrice: decimal("additionalPrice", { precision: 10, scale: 2 }).default("0"),
  
  // Size options
  sizes: json("sizes"), // ["P", "M", "G", "GG"]
  
  // Availability
  available: boolean("available").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventKit = typeof eventKits.$inferSelect;
export type InsertEventKit = typeof eventKits.$inferInsert;

/**
 * Event photos gallery
 */
export const eventPhotos = mysqlTable("event_photos", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  caption: text("caption"),
  photographer: varchar("photographer", { length: 100 }),
  
  // Ordering
  sortOrder: int("sortOrder").default(0),
  featured: boolean("featured").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventPhoto = typeof eventPhotos.$inferSelect;
export type InsertEventPhoto = typeof eventPhotos.$inferInsert;

/**
 * Registrations - Athletes registered for events
 */
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  
  userId: int("userId").notNull(),
  eventId: int("eventId").notNull(),
  categoryId: int("categoryId").notNull(),
  kitId: int("kitId"),
  
  // Team registration (optional - for team registrations)
  teamId: int("teamId"),
  registeredBy: int("registeredBy"), // User who made the registration (for team registrations)
  
  // Kit details
  kitSize: varchar("kitSize", { length: 10 }),
  
  // Pricing at time of registration
  categoryPrice: decimal("categoryPrice", { precision: 10, scale: 2 }).notNull(),
  kitPrice: decimal("kitPrice", { precision: 10, scale: 2 }).default("0"),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  
  // Checkout token for external payment
  checkoutToken: varchar("checkoutToken", { length: 64 }).notNull().unique(),
  
  // Payment status
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "cancelled", "refunded"]).default("pending").notNull(),
  paymentDate: timestamp("paymentDate"),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  transactionId: varchar("transactionId", { length: 100 }),
  
  // Refund info
  refundStatus: mysqlEnum("refundStatus", ["none", "pending", "processing", "completed", "failed"]).default("none"),
  refundTransactionId: varchar("refundTransactionId", { length: 100 }),
  refundedAt: timestamp("refundedAt"),
  refundReason: text("refundReason"),
  
  // Registration status
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "noshow"]).default("pending").notNull(),
  
  // Race number (assigned after confirmation)
  raceNumber: varchar("raceNumber", { length: 20 }),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

/**
 * Results - Race times and rankings
 */
export const results = mysqlTable("results", {
  id: int("id").autoincrement().primaryKey(),
  
  registrationId: int("registrationId").notNull().unique(),
  userId: int("userId").notNull(),
  eventId: int("eventId").notNull(),
  categoryId: int("categoryId").notNull(),
  
  // Times (in milliseconds for precision)
  chipTime: int("chipTime"), // Official chip time
  gunTime: int("gunTime"), // Gun time
  
  // Pace (seconds per km)
  avgPace: int("avgPace"),
  
  // Rankings
  overallRank: int("overallRank"),
  categoryRank: int("categoryRank"),
  genderRank: int("genderRank"),
  
  // Splits (JSON array of {distance, time})
  splits: json("splits"),
  
  // Certificate
  certificateUrl: text("certificateUrl"),
  certificateGenerated: boolean("certificateGenerated").default(false),
  
  // Status
  status: mysqlEnum("status", ["official", "dnf", "dq", "dns"]).default("official"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Result = typeof results.$inferSelect;
export type InsertResult = typeof results.$inferInsert;

/**
 * FUTURE: Training module tables (structure prepared for expansion)
 * These tables are commented out but show the planned structure
 */

// Training plans
// export const trainingPlans = mysqlTable("training_plans", {
//   id: int("id").autoincrement().primaryKey(),
//   name: varchar("name", { length: 255 }).notNull(),
//   description: text("description"),
//   targetDistance: decimal("targetDistance", { precision: 6, scale: 2 }),
//   durationWeeks: int("durationWeeks"),
//   difficulty: mysqlEnum("difficulty", ["beginner", "intermediate", "advanced"]),
//   createdAt: timestamp("createdAt").defaultNow().notNull(),
// });

// Training sessions
// export const trainingSessions = mysqlTable("training_sessions", {
//   id: int("id").autoincrement().primaryKey(),
//   planId: int("planId"),
//   userId: int("userId").notNull(),
//   scheduledDate: timestamp("scheduledDate"),
//   completedDate: timestamp("completedDate"),
//   type: mysqlEnum("type", ["easy", "tempo", "interval", "long", "recovery"]),
//   targetDistance: decimal("targetDistance", { precision: 6, scale: 2 }),
//   actualDistance: decimal("actualDistance", { precision: 6, scale: 2 }),
//   targetTime: int("targetTime"),
//   actualTime: int("actualTime"),
//   notes: text("notes"),
//   createdAt: timestamp("createdAt").defaultNow().notNull(),
// });


/**
 * Teams - Running teams/clubs (includes free groups and paid communities)
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  
  // Visual identity
  logoUrl: text("logoUrl"),
  bannerUrl: text("bannerUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }), // hex color
  
  // Contact
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  website: text("website"),
  
  // Location
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  
  // Settings
  isPublic: boolean("isPublic").default(true), // visible in search
  allowJoinRequests: boolean("allowJoinRequests").default(true),
  
  // Owner/creator
  ownerId: int("ownerId").notNull(),
  
  // ========== TIPO DE GRUPO (Gratuito ou Pago) ==========
  groupType: mysqlEnum("groupType", ["gratuito", "pago"]).default("gratuito").notNull(),
  
  // ========== COMUNIDADE PAGA - Valores ==========
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).default("0"), // valor da mensalidade
  billingPeriod: mysqlEnum("billingPeriod", ["mensal", "trimestral", "semestral", "anual"]).default("mensal"),
  communityBenefits: text("communityBenefits"), // descrição dos benefícios
  
  // ========== INSTRUTOR ==========
  instructorName: varchar("instructorName", { length: 255 }),
  instructorSpecialty: varchar("instructorSpecialty", { length: 255 }),
  instructorBio: text("instructorBio"),
  instructorPhotoUrl: text("instructorPhotoUrl"),
  
  // ========== MODALIDADE E PREFERÊNCIAS ==========
  modality: mysqlEnum("modality", ["corrida", "triathlon", "bike", "natacao", "funcional", "outro"]).default("corrida"),
  preferredDistances: json("preferredDistances"), // array de distâncias ex: ["5k", "10k", "21k"]
  rules: text("rules"), // regras do grupo
  allowPublicTrainings: boolean("allowPublicTrainings").default(true),
  requireMemberApproval: boolean("requireMemberApproval").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Team members - Relationship between users and teams
 */
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  
  // Role in team
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  
  // Status
  status: mysqlEnum("status", ["pending", "active", "inactive"]).default("pending").notNull(),
  
  // Member info (can override user profile for team context)
  nickname: varchar("nickname", { length: 100 }),
  jerseyNumber: varchar("jerseyNumber", { length: 10 }),
  
  joinedAt: timestamp("joinedAt"),
  invitedBy: int("invitedBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Team invitations - Pending invitations to join teams
 */
export const teamInvitations = mysqlTable("team_invitations", {
  id: int("id").autoincrement().primaryKey(),
  
  teamId: int("teamId").notNull(),
  
  // Can invite by email (for non-registered users) or userId
  email: varchar("email", { length: 320 }),
  userId: int("userId"),
  
  // Invitation details
  invitedBy: int("invitedBy").notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  
  // Token for accepting invitation
  token: varchar("token", { length: 64 }).notNull().unique(),
  
  // Status
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired"]).default("pending").notNull(),
  
  expiresAt: timestamp("expiresAt").notNull(),
  respondedAt: timestamp("respondedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = typeof teamInvitations.$inferInsert;


/**
 * Notifications - User notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  
  userId: int("userId").notNull(),
  
  // Notification content
  type: mysqlEnum("type", ["registration", "payment", "event", "result", "team", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  
  // Related entities (optional)
  eventId: int("eventId"),
  registrationId: int("registrationId"),
  teamId: int("teamId"),
  
  // Status
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("readAt"),
  
  // Action URL (optional deep link)
  actionUrl: text("actionUrl"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * User favorites - Events favorited by users
 */
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  
  userId: int("userId").notNull(),
  eventId: int("eventId").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * Check-ins - Event day check-ins
 */
export const checkins = mysqlTable("checkins", {
  id: int("id").autoincrement().primaryKey(),
  
  registrationId: int("registrationId").notNull(),
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  
  // Check-in details
  checkedInBy: int("checkedInBy").notNull(), // Organizer who did the check-in
  method: mysqlEnum("method", ["qrcode", "manual", "raceNumber"]).notNull(),
  
  // Kit delivery
  kitDelivered: boolean("kitDelivered").default(false),
  kitDeliveredAt: timestamp("kitDeliveredAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = typeof checkins.$inferInsert;


/**
 * Password Reset Tokens - For password recovery flow
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  
  // 6-digit code for mobile-friendly recovery
  code: varchar("code", { length: 6 }).notNull(),
  
  // Token for web link (optional)
  token: varchar("token", { length: 64 }).notNull().unique(),
  
  // Expiration (15 minutes)
  expiresAt: timestamp("expiresAt").notNull(),
  
  // Status
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("usedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;


/**
 * Vouchers - Cupons de desconto para eventos
 */
export const vouchers = mysqlTable("vouchers", {
  id: int("id").autoincrement().primaryKey(),
  
  // Relacionamento com evento (opcional - pode ser global)
  eventId: int("eventId"),
  
  // Código do voucher (único)
  code: varchar("code", { length: 50 }).notNull().unique(),
  
  // Tipo de desconto
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull().default("percentage"),
  
  // Valor do desconto (porcentagem ou valor fixo em reais)
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  
  // Limite de usos (null = ilimitado)
  maxUses: int("maxUses"),
  
  // Usos atuais
  currentUses: int("currentUses").default(0).notNull(),
  
  // Valor mínimo para aplicar o voucher
  minOrderValue: decimal("minOrderValue", { precision: 10, scale: 2 }),
  
  // Validade
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  
  // Status
  active: boolean("active").default(true).notNull(),
  
  // Descrição interna
  description: text("description"),
  
  // Quem criou
  createdBy: int("createdBy").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = typeof vouchers.$inferInsert;

/**
 * Voucher Usage - Registro de uso de vouchers
 */
export const voucherUsages = mysqlTable("voucher_usages", {
  id: int("id").autoincrement().primaryKey(),
  
  voucherId: int("voucherId").notNull(),
  userId: int("userId").notNull(),
  registrationId: int("registrationId"),
  
  // Valor do desconto aplicado
  discountApplied: decimal("discountApplied", { precision: 10, scale: 2 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VoucherUsage = typeof voucherUsages.$inferSelect;
export type InsertVoucherUsage = typeof voucherUsages.$inferInsert;


/**
 * Push Tokens - Device tokens for push notifications
 */
export const pushTokens = mysqlTable("push_tokens", {
  id: int("id").autoincrement().primaryKey(),
  
  userId: int("userId").notNull(),
  
  // Expo push token
  token: varchar("token", { length: 255 }).notNull(),
  
  // Platform (ios, android, web)
  platform: varchar("platform", { length: 20 }).notNull(),
  
  // Device info (optional)
  deviceName: varchar("deviceName", { length: 100 }),
  
  // Status
  active: boolean("active").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;


/**
 * Event likes - Users who liked events
 */
export const eventLikes = mysqlTable("event_likes", {
  id: int("id").autoincrement().primaryKey(),
  
  eventId: int("eventId").notNull(),
  userId: int("userId").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventLike = typeof eventLikes.$inferSelect;
export type InsertEventLike = typeof eventLikes.$inferInsert;

/**
 * Event shares - Tracking event shares by users
 */
export const eventShares = mysqlTable("event_shares", {
  id: int("id").autoincrement().primaryKey(),
  
  eventId: int("eventId").notNull(),
  userId: int("userId"), // Optional - can be null for anonymous shares
  
  // Platform used for sharing
  platform: mysqlEnum("platform", ["whatsapp", "instagram", "facebook", "twitter", "copy_link", "other"]).default("other"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventShare = typeof eventShares.$inferSelect;
export type InsertEventShare = typeof eventShares.$inferInsert;


/**
 * Event Rankings - Pre-calculated ranking cache for "Em Alta" section
 * 
 * This table caches the ranking scores to avoid expensive real-time calculations.
 * Scores are recalculated periodically (every 15 minutes) by a background job.
 */
export const eventRankings = mysqlTable("event_rankings", {
  id: int("id").autoincrement().primaryKey(),
  
  eventId: int("eventId").notNull().unique(),
  
  // Pre-calculated score (higher = more popular)
  score: decimal("score", { precision: 15, scale: 4 }).notNull().default("0"),
  
  // Individual metrics (for debugging and analysis)
  registrationCount: int("registrationCount").default(0),
  viewCount: int("viewCount").default(0),
  likeCount: int("likeCount").default(0),
  shareCount: int("shareCount").default(0),
  favoriteCount: int("favoriteCount").default(0),
  
  // Time-based factors
  daysUntilEvent: int("daysUntilEvent"),
  hoursUntilEvent: int("hoursUntilEvent"),
  
  // Ranking position (1 = most popular)
  rankPosition: int("rankPosition"),
  
  // Last calculation timestamp
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventRanking = typeof eventRankings.$inferSelect;
export type InsertEventRanking = typeof eventRankings.$inferInsert;


// ============================================
// SOCIAL FEED TABLES - Fase 3 do Roadmap
// ============================================

/**
 * Groups - Community groups for athletes
 */
export const groups = mysqlTable("groups", {
  id: int("id").autoincrement().primaryKey(),
  
  // Basic info
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Media
  logoUrl: text("logoUrl"),
  coverUrl: text("coverUrl"),
  
  // Location
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  
  // Settings
  privacy: mysqlEnum("privacy", ["public", "private"]).default("public").notNull(),
  groupType: mysqlEnum("groupType", ["running", "cycling", "triathlon", "trail", "swimming", "fitness", "funcional", "caminhada_trail", "yoga", "lutas", "other"]).default("running"),
  sportTypes: json("sportTypes"), // Array of sport types
  level: mysqlEnum("level", ["beginner", "intermediate", "advanced", "all"]).default("all"),
  
  // Meeting info
  meetingPoint: text("meetingPoint"),
  meetingLat: decimal("meetingLat", { precision: 10, scale: 7 }),
  meetingLng: decimal("meetingLng", { precision: 10, scale: 7 }),
  
  // Membership settings
  allowJoinRequests: boolean("allowJoinRequests").default(true),
  requiresApproval: boolean("requiresApproval").default(false),
  
  // Stats (cached)
  memberCount: int("memberCount").default(0),
  postCount: int("postCount").default(0),
  
  // Owner
  ownerId: int("ownerId").notNull(),
  
  // Status
  status: mysqlEnum("status", ["active", "inactive", "banned"]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

/**
 * Group Members - Users who belong to groups
 */
export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  
  role: mysqlEnum("role", ["owner", "admin", "moderator", "member"]).default("member").notNull(),
  status: mysqlEnum("status", ["active", "pending", "banned"]).default("active").notNull(),
  
  // Permissions (V12.10)
  canCreateTraining: boolean("canCreateTraining").default(false),
  
  // Notification preferences
  notifyPosts: boolean("notifyPosts").default(true),
  notifyTrainings: boolean("notifyTrainings").default(true),
  notifyChat: boolean("notifyChat").default(true),
  
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

/**
 * Posts - Social feed posts
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Author
  authorId: int("authorId").notNull(),
  
  // Group (optional - null for public posts)
  groupId: int("groupId"),
  
  // Content
  content: text("content"),
  
  // Post type
  type: mysqlEnum("type", ["text", "photo", "video", "activity", "announcement", "poll", "training_share"]).default("text").notNull(),
  
  // Media (can have multiple images)
  imageUrl: text("imageUrl"),
  imageUrls: json("imageUrls"), // Array of image URLs
  
  // Video support
  videoUrl: text("videoUrl"),
  videoThumbnailUrl: text("videoThumbnailUrl"),
  
  // Activity data (for activity posts)
  activityData: json("activityData"), // { type, distance, duration, pace, elevation, calories }
  
  // Poll data (for poll posts)
  pollOptions: json("pollOptions"), // Array of { id, text, votes }
  pollEndsAt: timestamp("pollEndsAt"),
  
  // Moderation
  moderationStatus: mysqlEnum("moderationStatus", ["pending", "approved", "rejected", "quarantine"]).default("approved").notNull(),
  moderationNote: text("moderationNote"),
  moderatedAt: timestamp("moderatedAt"),
  moderatedBy: int("moderatedBy"),
  
  // Settings
  isPinned: boolean("isPinned").default(false),
  allowComments: boolean("allowComments").default(true),
  
  // Stats (cached)
  likesCount: int("likesCount").default(0),
  commentsCount: int("commentsCount").default(0),
  sharesCount: int("sharesCount").default(0),
  
  // Reactions breakdown (cached)
  reactions: json("reactions"), // { like: 0, love: 0, fire: 0, clap: 0, strong: 0 }
  
  // Status
  status: mysqlEnum("status", ["active", "deleted", "hidden"]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Post Likes - Users who liked posts
 */
export const postLikes = mysqlTable("post_likes", {
  id: int("id").autoincrement().primaryKey(),
  
  postId: int("postId").notNull(),
  userId: int("userId").notNull(),
  
  // Reaction type
  reactionType: mysqlEnum("reactionType", ["like", "love", "fire", "clap", "strong"]).default("like").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostLike = typeof postLikes.$inferInsert;

/**
 * Comments - Comments on posts
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  
  postId: int("postId").notNull(),
  authorId: int("authorId").notNull(),
  
  // Parent comment (for replies)
  parentId: int("parentId"),
  
  // Content
  content: text("content").notNull(),
  
  // Moderation
  moderationStatus: mysqlEnum("moderationStatus", ["pending", "approved", "rejected"]).default("approved").notNull(),
  moderationNote: text("moderationNote"),
  moderatedAt: timestamp("moderatedAt"),
  moderatedBy: int("moderatedBy"),
  
  // Stats (cached)
  likesCount: int("likesCount").default(0),
  repliesCount: int("repliesCount").default(0),
  
  // Status
  status: mysqlEnum("status", ["active", "deleted", "hidden"]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Comment Likes - Users who liked comments
 */
export const commentLikes = mysqlTable("comment_likes", {
  id: int("id").autoincrement().primaryKey(),
  
  commentId: int("commentId").notNull(),
  userId: int("userId").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommentLike = typeof commentLikes.$inferSelect;
export type InsertCommentLike = typeof commentLikes.$inferInsert;

/**
 * Reports - User reports for posts, comments, and users
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  
  // Reporter
  reporterId: int("reporterId").notNull(),
  
  // Target (one of these will be filled)
  targetType: mysqlEnum("targetType", ["post", "comment", "user", "group"]).notNull(),
  targetId: int("targetId").notNull(),
  
  // Report details
  reason: mysqlEnum("reason", [
    "spam",
    "harassment",
    "hate_speech",
    "violence",
    "nudity",
    "false_information",
    "copyright",
    "other"
  ]).notNull(),
  description: text("description"),
  
  // Evidence (screenshots, etc)
  evidenceUrls: json("evidenceUrls"),
  
  // Status
  status: mysqlEnum("status", ["pending", "reviewing", "resolved", "dismissed"]).default("pending").notNull(),
  
  // Resolution
  resolution: mysqlEnum("resolution", ["no_action", "warning", "content_removed", "user_banned"]),
  resolutionNote: text("resolutionNote"),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: int("resolvedBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

/**
 * Media Uploads - Track uploaded media for moderation
 */
export const mediaUploads = mysqlTable("media_uploads", {
  id: int("id").autoincrement().primaryKey(),
  
  // Uploader
  userId: int("userId").notNull(),
  
  // File info
  originalUrl: text("originalUrl").notNull(),
  processedUrl: text("processedUrl"),
  thumbnailUrl: text("thumbnailUrl"),
  
  fileType: mysqlEnum("fileType", ["image", "video"]).default("image").notNull(),
  fileSize: int("fileSize"), // in bytes
  mimeType: varchar("mimeType", { length: 100 }),
  
  // Dimensions
  width: int("width"),
  height: int("height"),
  
  // Moderation
  moderationStatus: mysqlEnum("moderationStatus", ["pending", "approved", "rejected", "quarantine"]).default("pending").notNull(),
  
  // AI moderation results
  aiModerationScore: decimal("aiModerationScore", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
  aiModerationLabels: json("aiModerationLabels"), // { nudity: 0.1, violence: 0.0, ... }
  aiModerationResult: mysqlEnum("aiModerationResult", ["allow", "review", "block"]),
  
  // Manual review
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  
  // Usage tracking
  usedInPostId: int("usedInPostId"),
  usedInCommentId: int("usedInCommentId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MediaUpload = typeof mediaUploads.$inferSelect;
export type InsertMediaUpload = typeof mediaUploads.$inferInsert;

/**
 * Trainings - Group training sessions
 */
export const trainings = mysqlTable("trainings", {
  id: int("id").autoincrement().primaryKey(),
  
  // Group
  groupId: int("groupId").notNull(),
  
  // Creator
  createdBy: int("createdBy").notNull(),
  
  // Basic info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Training type
  trainingType: mysqlEnum("trainingType", [
    "easy_run", "speed_work", "endurance", "trail", "swimming", "brick", "recovery", "other"
  ]).default("easy_run").notNull(),
  
  // Schedule
  scheduledAt: timestamp("scheduledAt").notNull(),
  durationMinutes: int("durationMinutes"),
  
  // Location
  meetingPoint: text("meetingPoint"),
  meetingLat: decimal("meetingLat", { precision: 10, scale: 7 }),
  meetingLng: decimal("meetingLng", { precision: 10, scale: 7 }),
  
  // Capacity
  maxParticipants: int("maxParticipants"),
  
  // RSVP counts (cached)
  goingCount: int("goingCount").default(0),
  maybeCount: int("maybeCount").default(0),
  notGoingCount: int("notGoingCount").default(0),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  
  // Recurrence (optional)
  isRecurring: boolean("isRecurring").default(false),
  recurrenceRule: varchar("recurrenceRule", { length: 100 }), // RRULE format
  parentTrainingId: int("parentTrainingId"), // For recurring instances
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Training = typeof trainings.$inferSelect;
export type InsertTraining = typeof trainings.$inferInsert;

/**
 * Training RSVPs - User responses to training invitations
 */
export const trainingRsvps = mysqlTable("training_rsvps", {
  id: int("id").autoincrement().primaryKey(),
  
  trainingId: int("trainingId").notNull(),
  userId: int("userId").notNull(),
  
  response: mysqlEnum("response", ["going", "maybe", "not_going"]).notNull(),
  
  // Check-in
  checkedIn: boolean("checkedIn").default(false),
  checkedInAt: timestamp("checkedInAt"),
  checkedInLat: decimal("checkedInLat", { precision: 10, scale: 7 }),
  checkedInLng: decimal("checkedInLng", { precision: 10, scale: 7 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingRsvp = typeof trainingRsvps.$inferSelect;
export type InsertTrainingRsvp = typeof trainingRsvps.$inferInsert;


/**
 * Saved Posts - Posts saved/bookmarked by users
 */
export const savedPosts = mysqlTable("saved_posts", {
  id: int("id").autoincrement().primaryKey(),
  
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedPost = typeof savedPosts.$inferSelect;
export type InsertSavedPost = typeof savedPosts.$inferInsert;


/**
 * User Follows - Track follow relationships between users
 */
export const userFollows = mysqlTable("user_follows", {
  id: int("id").autoincrement().primaryKey(),
  
  followerId: int("followerId").notNull(), // The user who is following
  followingId: int("followingId").notNull(), // The user being followed
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserFollow = typeof userFollows.$inferSelect;
export type InsertUserFollow = typeof userFollows.$inferInsert;

/**
 * Chat Threads - Direct message conversations between users
 */
export const chatThreads = mysqlTable("chat_threads", {
  id: int("id").autoincrement().primaryKey(),
  
  user1Id: int("user1Id").notNull(),
  user2Id: int("user2Id").notNull(),
  lastMessage: text("lastMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow(),
});

export type ChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThread = typeof chatThreads.$inferInsert;

/**
 * Chat Messages - Individual messages within a chat thread
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  
  threadId: int("threadId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;


// ==================== V12.10 - GRUPOS EXPANDIDOS ====================

/**
 * Functional Trainings - Treinos funcionais avançados
 */
export const functionalTrainings = mysqlTable("functional_trainings", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  createdBy: int("createdBy").notNull(),
  
  // Basic info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Functional specific fields
  trainingType: mysqlEnum("trainingType", ["halteres", "peso_corporal", "kettlebell", "misto"]).default("misto").notNull(),
  focus: mysqlEnum("focus", ["forca", "resistencia", "mobilidade", "circuito"]).default("circuito").notNull(),
  durationMinutes: int("durationMinutes").default(60),
  
  // Exercises catalog (JSON array)
  exercises: json("exercises"), // [{ name, sets, reps, rest, equipment, notes }]
  
  // Schedule
  scheduledAt: timestamp("scheduledAt").notNull(),
  
  // Location
  meetingPoint: text("meetingPoint"),
  meetingLat: decimal("meetingLat", { precision: 10, scale: 7 }),
  meetingLng: decimal("meetingLng", { precision: 10, scale: 7 }),
  
  // Capacity
  maxParticipants: int("maxParticipants"),
  
  // Equipment needed
  equipmentNeeded: json("equipmentNeeded"), // ["halteres", "kettlebell", "colchonete"]
  
  // Stats
  goingCount: int("goingCount").default(0),
  completedCount: int("completedCount").default(0),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FunctionalTraining = typeof functionalTrainings.$inferSelect;
export type InsertFunctionalTraining = typeof functionalTrainings.$inferInsert;

/**
 * Functional Training Participants
 */
export const functionalTrainingParticipants = mysqlTable("functional_training_participants", {
  id: int("id").autoincrement().primaryKey(),
  
  trainingId: int("trainingId").notNull(),
  userId: int("userId").notNull(),
  
  response: mysqlEnum("response", ["going", "maybe", "not_going"]).default("going").notNull(),
  
  // Check-in
  checkedIn: boolean("checkedIn").default(false),
  checkedInAt: timestamp("checkedInAt"),
  
  // Results
  completed: boolean("completed").default(false),
  completedAt: timestamp("completedAt"),
  totalTime: int("totalTime"), // in seconds
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FunctionalTrainingParticipant = typeof functionalTrainingParticipants.$inferSelect;
export type InsertFunctionalTrainingParticipant = typeof functionalTrainingParticipants.$inferInsert;

/**
 * Hikes - Caminhadas e Trilhas
 */
export const hikes = mysqlTable("hikes", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  createdBy: int("createdBy").notNull(),
  
  // Basic info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Hike specific fields
  trailType: mysqlEnum("trailType", ["urbano", "trilha_leve", "trilha_moderada", "trilha_avancada"]).default("urbano").notNull(),
  distanceKm: decimal("distanceKm", { precision: 6, scale: 2 }),
  durationMinutes: int("durationMinutes"),
  elevationGain: int("elevationGain"), // in meters
  
  // Schedule
  scheduledAt: timestamp("scheduledAt").notNull(),
  
  // Meeting point
  meetingPoint: text("meetingPoint"),
  meetingLat: decimal("meetingLat", { precision: 10, scale: 7 }),
  meetingLng: decimal("meetingLng", { precision: 10, scale: 7 }),
  
  // Route (JSON array of coordinates)
  routeCoordinates: json("routeCoordinates"), // [{lat, lng}]
  
  // Capacity
  maxParticipants: int("maxParticipants"),
  
  // Stats
  goingCount: int("goingCount").default(0),
  completedCount: int("completedCount").default(0),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Hike = typeof hikes.$inferSelect;
export type InsertHike = typeof hikes.$inferInsert;

/**
 * Hike Participants
 */
export const hikeParticipants = mysqlTable("hike_participants", {
  id: int("id").autoincrement().primaryKey(),
  
  hikeId: int("hikeId").notNull(),
  userId: int("userId").notNull(),
  
  response: mysqlEnum("response", ["going", "maybe", "not_going"]).default("going").notNull(),
  
  // Check-in
  checkedIn: boolean("checkedIn").default(false),
  checkedInAt: timestamp("checkedInAt"),
  
  // Results
  completed: boolean("completed").default(false),
  completedAt: timestamp("completedAt"),
  distanceCompleted: decimal("distanceCompleted", { precision: 6, scale: 2 }),
  totalTime: int("totalTime"), // in seconds
  elevationGain: int("elevationGain"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HikeParticipant = typeof hikeParticipants.$inferSelect;
export type InsertHikeParticipant = typeof hikeParticipants.$inferInsert;

/**
 * Yoga Sessions - Sessões de Yoga
 */
export const yogaSessions = mysqlTable("yoga_sessions", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  createdBy: int("createdBy").notNull(),
  
  // Basic info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Yoga specific fields
  style: mysqlEnum("style", ["hatha", "vinyasa", "restaurativa", "ashtanga", "kundalini", "yin", "outro"]).default("hatha").notNull(),
  level: mysqlEnum("level", ["iniciante", "intermediario", "avancado", "todos"]).default("todos").notNull(),
  durationMinutes: int("durationMinutes").default(60),
  
  // Instructor info
  instructorName: varchar("instructorName", { length: 100 }),
  instructorBio: text("instructorBio"),
  instructorPhotoUrl: text("instructorPhotoUrl"),
  
  // Schedule
  scheduledAt: timestamp("scheduledAt").notNull(),
  
  // Location (can be online or in-person)
  isOnline: boolean("isOnline").default(false),
  meetingPoint: text("meetingPoint"),
  meetingLat: decimal("meetingLat", { precision: 10, scale: 7 }),
  meetingLng: decimal("meetingLng", { precision: 10, scale: 7 }),
  videoConferenceUrl: text("videoConferenceUrl"),
  
  // Capacity
  maxParticipants: int("maxParticipants"),
  
  // Stats
  goingCount: int("goingCount").default(0),
  completedCount: int("completedCount").default(0),
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type YogaSession = typeof yogaSessions.$inferSelect;
export type InsertYogaSession = typeof yogaSessions.$inferInsert;

/**
 * Yoga Session Participants
 */
export const yogaSessionParticipants = mysqlTable("yoga_session_participants", {
  id: int("id").autoincrement().primaryKey(),
  
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  
  response: mysqlEnum("response", ["going", "maybe", "not_going"]).default("going").notNull(),
  
  // Attendance
  attended: boolean("attended").default(false),
  attendedAt: timestamp("attendedAt"),
  
  // Feedback
  rating: int("rating"), // 1-5
  feedback: text("feedback"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type YogaSessionParticipant = typeof yogaSessionParticipants.$inferSelect;
export type InsertYogaSessionParticipant = typeof yogaSessionParticipants.$inferInsert;

/**
 * Fight Trainings - Treinos de Artes Marciais/Lutas
 */
export const fightTrainings = mysqlTable("fight_trainings", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  createdBy: int("createdBy").notNull(),
  
  // Basic info
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Fight specific fields
  fightStyle: mysqlEnum("fightStyle", ["jiu_jitsu", "muay_thai", "boxe", "judo", "karate", "mma", "capoeira", "outro"]).default("jiu_jitsu").notNull(),
  beltLevel: mysqlEnum("beltLevel", ["branca", "azul", "roxa", "marrom", "preta", "iniciante", "intermediario", "avancado", "todos"]).default("todos"),
  trainingType: mysqlEnum("trainingType", ["tecnica", "sparring_leve", "sparring_intenso", "preparacao_fisica", "competicao"]).default("tecnica").notNull(),
  durationMinutes: int("durationMinutes").default(90),
  
  // Instructor/Opponent info
  instructorName: varchar("instructorName", { length: 100 }),
  
  // Rounds (for sparring)
  numberOfRounds: int("numberOfRounds"),
  roundDurationSeconds: int("roundDurationSeconds"),
  
  // Schedule
  scheduledAt: timestamp("scheduledAt").notNull(),
  
  // Location
  meetingPoint: text("meetingPoint"),
  meetingLat: decimal("meetingLat", { precision: 10, scale: 7 }),
  meetingLng: decimal("meetingLng", { precision: 10, scale: 7 }),
  
  // Equipment needed
  equipmentNeeded: json("equipmentNeeded"), // ["kimono", "luvas", "caneleiras"]
  
  // Capacity
  maxParticipants: int("maxParticipants"),
  
  // Stats
  goingCount: int("goingCount").default(0),
  completedCount: int("completedCount").default(0),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FightTraining = typeof fightTrainings.$inferSelect;
export type InsertFightTraining = typeof fightTrainings.$inferInsert;

/**
 * Fight Training Participants
 */
export const fightTrainingParticipants = mysqlTable("fight_training_participants", {
  id: int("id").autoincrement().primaryKey(),
  
  trainingId: int("trainingId").notNull(),
  userId: int("userId").notNull(),
  
  response: mysqlEnum("response", ["going", "maybe", "not_going"]).default("going").notNull(),
  
  // Check-in
  checkedIn: boolean("checkedIn").default(false),
  checkedInAt: timestamp("checkedInAt"),
  
  // Results (for sparring)
  completed: boolean("completed").default(false),
  completedAt: timestamp("completedAt"),
  wins: int("wins").default(0),
  losses: int("losses").default(0),
  draws: int("draws").default(0),
  technicalNotes: text("technicalNotes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FightTrainingParticipant = typeof fightTrainingParticipants.$inferSelect;
export type InsertFightTrainingParticipant = typeof fightTrainingParticipants.$inferInsert;

/**
 * Group Invites - Convites para grupos
 */
export const groupInvites = mysqlTable("group_invites", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  invitedUserId: int("invitedUserId").notNull(),
  invitedBy: int("invitedBy").notNull(),
  
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "cancelled"]).default("pending").notNull(),
  
  message: text("message"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
});

export type GroupInvite = typeof groupInvites.$inferSelect;
export type InsertGroupInvite = typeof groupInvites.$inferInsert;

/**
 * Group Messages - Chat do grupo
 */
export const groupMessages = mysqlTable("group_messages", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  senderId: int("senderId").notNull(),
  
  content: text("content").notNull(),
  
  // Media
  imageUrl: text("imageUrl"),
  videoUrl: text("videoUrl"),
  fileUrl: text("fileUrl"),
  fileName: varchar("fileName", { length: 255 }),
  
  // Reply to
  replyToId: int("replyToId"),
  
  // Status
  status: mysqlEnum("status", ["active", "deleted"]).default("active").notNull(),
  deletedBy: int("deletedBy"),
  deletedAt: timestamp("deletedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = typeof groupMessages.$inferInsert;

/**
 * Group Rankings - Ranking interno do grupo
 */
export const groupRankings = mysqlTable("group_rankings", {
  id: int("id").autoincrement().primaryKey(),
  
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  
  // Ranking by modality
  modality: mysqlEnum("modality", ["corrida", "bike", "natacao", "funcional", "caminhada_trail", "yoga", "lutas", "geral"]).default("geral").notNull(),
  
  // Stats
  totalParticipations: int("totalParticipations").default(0),
  totalDistance: decimal("totalDistance", { precision: 10, scale: 2 }).default("0"), // km
  totalTime: int("totalTime").default(0), // seconds
  totalElevation: int("totalElevation").default(0), // meters
  avgRating: decimal("avgRating", { precision: 3, scale: 2 }),
  
  // Fight specific
  totalWins: int("totalWins").default(0),
  totalLosses: int("totalLosses").default(0),
  currentBelt: varchar("currentBelt", { length: 50 }),
  
  // Points (calculated)
  points: int("points").default(0),
  rank: int("rank"),
  
  // Badges/Achievements (JSON array)
  badges: json("badges"), // ["first_training", "10_trainings", "100km"]
  
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupRanking = typeof groupRankings.$inferSelect;
export type InsertGroupRanking = typeof groupRankings.$inferInsert;


/**
 * Group Message Reactions - Reações às mensagens do chat do grupo
 */
export const groupMessageReactions = mysqlTable("group_message_reactions", {
  id: int("id").autoincrement().primaryKey(),
  
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  
  emoji: varchar("emoji", { length: 10 }).notNull(), // e.g., "❤️", "😂", "👍"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupMessageReaction = typeof groupMessageReactions.$inferSelect;
export type InsertGroupMessageReaction = typeof groupMessageReactions.$inferInsert;
