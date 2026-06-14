CREATE TABLE `meal_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`logDate` date NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') NOT NULL,
	`foodName` varchar(255) NOT NULL,
	`portionGrams` float NOT NULL,
	`calories` float NOT NULL,
	`protein` float NOT NULL,
	`carbs` float NOT NULL,
	`fat` float NOT NULL,
	`caloriesPer100g` float,
	`proteinPer100g` float,
	`carbsPer100g` float,
	`fatPer100g` float,
	`source` enum('photo_ai','manual_search','barcode') DEFAULT 'manual_search',
	`imageUrl` text,
	`barcode` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meal_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_recipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ingredients` text NOT NULL,
	`instructions` text NOT NULL,
	`totalCalories` float NOT NULL,
	`totalProtein` float NOT NULL,
	`totalCarbs` float NOT NULL,
	`totalFat` float NOT NULL,
	`servings` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_recipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weight` float,
	`height` float,
	`age` int,
	`gender` enum('male','female'),
	`activityLevel` enum('sedentary','light','moderate','active','very_active'),
	`goal` enum('lose_weight','gain_muscle','maintain'),
	`targetCalories` int,
	`targetProtein` int,
	`targetCarbs` int,
	`targetFat` int,
	`dietaryPreferences` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
