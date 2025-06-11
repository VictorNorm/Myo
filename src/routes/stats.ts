import { Router, type Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
import prisma from "../services/db";
import logger from "../services/logger";
dotenv.config();

const router = Router();

/**
 * Get progression history for all exercises in a program
 */
router.get(
	"/progression/programs/:programId/exercises",
	authenticateToken,
	authorizeMiddleware.programAccess,
	async (req: Request, res) => {
		const { programId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			logger.warn("Attempted to access progression without authentication");
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Get all workouts for this program
			const workouts = await prisma.workouts.findMany({
				where: { program_id: Number(programId) },
				include: {
					workout_exercises: {
						include: {
							exercises: true,
						},
					},
				},
			});

			if (!workouts.length) {
				logger.info("No workouts found for program", {
					programId: Number(programId),
				});
				return res
					.status(404)
					.json({ error: "No workouts found for this program" });
			}

			// Get all exercise IDs from all workouts
			const exerciseIds = Array.from(
				new Set(
					workouts.flatMap((workout) =>
						workout.workout_exercises.map((we) => we.exercise_id),
					),
				),
			);

			// Get progression data for each exercise
			const progressionData = await Promise.all(
				exerciseIds.map(async (exerciseId) => {
					// Get exercise details
					const exercise = await prisma.exercises.findUnique({
						where: { id: exerciseId },
					});

					if (!exercise) {
						logger.warn("Exercise not found", { exerciseId });
						return null;
					}

					// Get baseline for this exercise
					const baseline = await prisma.exercise_baselines.findUnique({
						where: {
							exercise_id_user_id_program_id: {
								exercise_id: exerciseId,
								user_id: Number(userId),
								program_id: Number(programId),
							},
						},
					});

					// Get progression history
					const progressionHistory = await prisma.progression_history.findMany({
						where: {
							exercise_id: exerciseId,
							user_id: Number(userId),
							program_id: Number(programId),
						},
						orderBy: {
							createdAt: "desc",
						},
					});

					// Get last completed exercise
					const lastCompleted = await prisma.completed_exercises.findFirst({
						where: {
							exercise_id: exerciseId,
							user_id: Number(userId),
							workout: {
								program_id: Number(programId),
							},
						},
						orderBy: {
							completedAt: "desc",
						},
					});

					return {
						exercise_id: exerciseId,
						name: exercise.name,
						equipment: exercise.equipment,
						category: exercise.category,
						baseline: baseline
							? {
									sets: baseline.sets,
									reps: baseline.reps,
									weight: baseline.weight,
								}
							: null,
						lastCompleted: lastCompleted
							? {
									sets: lastCompleted.sets,
									reps: lastCompleted.reps,
									weight: lastCompleted.weight,
									rating: lastCompleted.rating,
									completedAt: lastCompleted.completedAt,
								}
							: null,
						progressionHistory,
					};
				}),
			);

			const filteredProgressionData = progressionData.filter(Boolean);

			logger.debug("Fetched exercise progression data for program", {
				programId: Number(programId),
				userId,
				totalExercises: exerciseIds.length,
				returnedExercises: filteredProgressionData.length,
			});

			return res.status(200).json(filteredProgressionData);
		} catch (error) {
			logger.error(
				`Error fetching exercise progression: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number(programId),
					userId,
				},
			);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

/**
 * Get completed exercises for a program to calculate volume
 */
router.get(
	"/completed-exercises/programs/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	async (req: Request, res) => {
		const { programId } = req.params;
		const userId = req.user?.id;
		const { timeFrame } = req.query; // 'week', 'month', 'program', 'all'

		if (!userId) {
			logger.warn(
				"Attempted to access completed exercises without authentication",
			);
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Define date filter based on timeFrame
			let dateFilter: Record<string, Date> = {};
			const now = new Date();

			if (timeFrame === "week") {
				const oneWeekAgo = new Date();
				oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
				dateFilter = {
					gte: oneWeekAgo,
					lte: now,
				};
			} else if (timeFrame === "month") {
				const oneMonthAgo = new Date();
				oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
				dateFilter = {
					gte: oneMonthAgo,
					lte: now,
				};
			} else if (timeFrame === "program") {
				// Get program start date
				const program = await prisma.programs.findUnique({
					where: { id: Number(programId) },
					select: { startDate: true },
				});

				if (program) {
					dateFilter = {
						gte: program.startDate,
						lte: now,
					};
				}
			}
			// If timeFrame is 'all' or invalid, don't apply date filter

			// Get all completed exercises for this program
			const completedExercises = await prisma.completed_exercises.findMany({
				where: {
					user_id: Number(userId),
					workout: {
						program_id: Number(programId),
					},
					...(Object.keys(dateFilter).length > 0 && {
						completedAt: dateFilter,
					}),
				},
				include: {
					exercise: {
						include: {
							muscle_groups: {
								include: {
									muscle_groups: true,
								},
							},
						},
					},
					workout: true,
				},
				orderBy: {
					completedAt: "desc",
				},
			});

			// Calculate volume (weight * sets * reps) for each exercise
			const exercisesWithVolume = completedExercises.map((ce) => {
				const volume = Number(ce.weight) * ce.sets * ce.reps;
				return {
					...ce,
					volume,
					// Extract muscle groups for easier access
					muscleGroups: ce.exercise.muscle_groups.map(
						(mg) => mg.muscle_groups.name,
					),
				};
			});

			// Calculate volume by date (for trend analysis)
			const volumeByDate: Record<string, number> = {};
			for (const ex of exercisesWithVolume) {
				const date = ex.completedAt.toISOString().split("T")[0]; // YYYY-MM-DD
				if (!volumeByDate[date]) {
					volumeByDate[date] = 0;
				}
				volumeByDate[date] += ex.volume;
			}

			// Calculate volume by muscle group
			const volumeByMuscle: Record<string, number> = {};
			for (const ex of exercisesWithVolume) {
				for (const muscle of ex.muscleGroups) {
					if (!volumeByMuscle[muscle]) {
						volumeByMuscle[muscle] = 0;
					}
					volumeByMuscle[muscle] += ex.volume;
				}
			}

			// Calculate volume by exercise
			const volumeByExercise: Record<string, number> = {};
			for (const ex of exercisesWithVolume) {
				const exerciseName = ex.exercise.name;
				if (!volumeByExercise[exerciseName]) {
					volumeByExercise[exerciseName] = 0;
				}
				volumeByExercise[exerciseName] += ex.volume;
			}

			// Calculate total volume
			const totalVolume = exercisesWithVolume.reduce(
				(sum, ex) => sum + ex.volume,
				0,
			);

			// Get all dates within the period
			const allDates: Record<string, number> = {};
			if (Object.keys(dateFilter).length > 0) {
				// Assuming dateFilter.gte and dateFilter.lte are Date objects representing UTC boundaries
				const currentDate = new Date(
					`${dateFilter.gte.toISOString().split("T")[0]}T00:00:00.000Z`,
				); // Start of day UTC
				const finalDate = new Date(
					`${dateFilter.lte.toISOString().split("T")[0]}T00:00:00.000Z`,
				); // Start of day UTC

				while (currentDate <= finalDate) {
					const dateStr = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD (UTC)
					allDates[dateStr] = volumeByDate[dateStr] || 0;
					currentDate.setUTCDate(currentDate.getUTCDate() + 1); // Advance by one day in UTC
				}
			}

			// Weekly aggregated data for charts
			const weeklyData: Record<string, { label: string; volume: number }> = {};
			for (const [date, volume] of Object.entries(volumeByDate)) {
				const dateObj = new Date(date);
				const year = dateObj.getFullYear();
				const weekNumber = getWeekNumber(dateObj);
				const weekKey = `${year}-W${weekNumber}`;

				if (!weeklyData[weekKey]) {
					weeklyData[weekKey] = {
						label: `Week ${weekNumber}`,
						volume: 0,
					};
				}
				weeklyData[weekKey].volume += Number(volume);
			}

			logger.debug("Calculated volume data for program", {
				programId: Number(programId),
				userId,
				timeFrame,
				exerciseCount: completedExercises.length,
				totalVolume,
				muscleGroupsCount: Object.keys(volumeByMuscle).length,
			});

			return res.status(200).json({
				completedExercises: exercisesWithVolume,
				volumeByDate,
				volumeByMuscle,
				volumeByExercise,
				weeklyData: Object.values(weeklyData),
				totalVolume,
				allDates,
			});
		} catch (error) {
			logger.error(
				`Error fetching volume data: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number(programId),
					userId,
					timeFrame,
				},
			);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

/**
 * Get workout frequency data
 */
router.get(
	"/workout-progress/programs/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	async (req: Request, res) => {
		const { programId } = req.params;
		const userId = req.user?.id;
		const { timeFrame } = req.query; // 'week', 'month', 'program', 'all'

		if (!userId) {
			logger.warn(
				"Attempted to access workout progress without authentication",
			);
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Define date filter based on timeFrame
			let dateFilter: Record<string, Date> = {};
			const now = new Date();

			if (timeFrame === "week") {
				const oneWeekAgo = new Date();
				oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
				dateFilter = {
					gte: oneWeekAgo,
					lte: now,
				};
			} else if (timeFrame === "month") {
				const oneMonthAgo = new Date();
				oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
				dateFilter = {
					gte: oneMonthAgo,
					lte: now,
				};
			} else if (timeFrame === "program") {
				// Get program start date
				const program = await prisma.programs.findUnique({
					where: { id: Number(programId) },
					select: { startDate: true },
				});

				if (program) {
					dateFilter = {
						gte: program.startDate,
						lte: now,
					};
				}
			}
			// If timeFrame is 'all' or invalid, don't apply date filter

			// Get the program to calculate total workouts
			const program = await prisma.programs.findUnique({
				where: { id: Number(programId) },
				select: {
					startDate: true,
					totalWorkouts: true,
					status: true,
				},
			});

			if (!program) {
				logger.warn("Program not found for workout progress", {
					programId: Number(programId),
				});
				return res.status(404).json({ error: "Program not found" });
			}

			// Get all workout progress records
			const workoutProgress = await prisma.workout_progress.findMany({
				where: {
					user_id: Number(userId),
					program_id: Number(programId),
					...(Object.keys(dateFilter).length > 0 && {
						completed_at: dateFilter,
					}),
				},
				orderBy: {
					completed_at: "asc",
				},
			});

			// Calculate completion dates for streak calculation
			const completionDates = workoutProgress.map(
				(wp) => wp.completed_at.toISOString().split("T")[0],
			);

			// Calculate current streak
			let currentStreak = 0;
			if (completionDates.length > 0) {
				// Check if there's a workout today
				const today = new Date().toISOString().split("T")[0];
				const hasWorkoutToday = completionDates.includes(today);

				// Start from today or yesterday
				const currentDate = new Date();
				if (!hasWorkoutToday) {
					currentDate.setDate(currentDate.getDate() - 1);
				}

				while (true) {
					const dateStr = currentDate.toISOString().split("T")[0];
					if (completionDates.includes(dateStr)) {
						currentStreak++;
						currentDate.setDate(currentDate.getDate() - 1);
					} else {
						break;
					}
				}
			}

			// Calculate longest streak
			let longestStreak = 0;
			let currentLongestStreak = 0;
			let previousDate: Date | null = null;

			for (const dateStr of completionDates) {
				const currentDate = new Date(dateStr);

				if (previousDate === null) {
					currentLongestStreak = 1;
				} else {
					const diffTime = Math.abs(
						currentDate.getTime() - previousDate.getTime(),
					);
					const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

					if (diffDays === 1) {
						currentLongestStreak++;
					} else {
						// Streak broken
						if (currentLongestStreak > longestStreak) {
							longestStreak = currentLongestStreak;
						}
						currentLongestStreak = 1;
					}
				}

				previousDate = currentDate;
			}

			// Check if the current streak is the longest
			if (currentLongestStreak > longestStreak) {
				longestStreak = currentLongestStreak;
			}

			// Calculate weekly frequency
			const weeklyFrequency: Record<
				string,
				{ week: string; workouts: number }
			> = {};
			for (const wp of workoutProgress) {
				const date = new Date(wp.completed_at);
				const year = date.getFullYear();
				const weekNumber = getWeekNumber(date);
				const weekKey = `${year}-W${weekNumber}`;

				if (!weeklyFrequency[weekKey]) {
					weeklyFrequency[weekKey] = {
						week: `Week ${weekNumber}`,
						workouts: 0,
					};
				}
				weeklyFrequency[weekKey].workouts++;
			}

			// Calculate consistency percentage
			const totalScheduledWorkouts = program.totalWorkouts;
			const completedWorkouts = workoutProgress.length;
			const consistency =
				totalScheduledWorkouts > 0
					? Math.round((completedWorkouts / totalScheduledWorkouts) * 100)
					: 0;

			logger.debug("Calculated workout frequency data", {
				programId: Number(programId),
				userId,
				timeFrame,
				completedWorkouts,
				totalScheduledWorkouts,
				currentStreak,
				longestStreak,
				consistency,
			});

			return res.status(200).json({
				totalWorkouts: totalScheduledWorkouts,
				completedWorkouts,
				consistency,
				streaks: {
					current: currentStreak,
					longest: longestStreak,
				},
				weeklyFrequency: Object.values(weeklyFrequency),
				workoutProgress,
			});
		} catch (error) {
			logger.error(
				`Error fetching frequency data: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number(programId),
					userId,
					timeFrame,
				},
			);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

/**
 * Get program statistics
 */
router.get(
	"/programs/:programId/statistics",
	authenticateToken,
	authorizeMiddleware.programAccess,
	async (req: Request, res) => {
		const { programId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			logger.warn(
				"Attempted to access program statistics without authentication",
			);
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Get program details
			const program = await prisma.programs.findUnique({
				where: { id: Number(programId) },
			});

			if (!program) {
				logger.warn("Program not found for statistics", {
					programId: Number(programId),
				});
				return res.status(404).json({ error: "Program not found" });
			}

			// Calculate days active in program
			const startDate = program.startDate;
			const endDate = program.endDate || new Date();
			const totalDays = Math.ceil(
				(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
			);

			// Get workout progress
			const workoutProgress = await prisma.workout_progress.findMany({
				where: {
					user_id: Number(userId),
					program_id: Number(programId),
				},
			});

			// Get distinct dates when workouts were completed
			const completedDates = new Set(
				workoutProgress.map(
					(wp) => wp.completed_at.toISOString().split("T")[0],
				),
			);
			const daysActive = completedDates.size;

			// Calculate program completion percentage
			const completionPercentage =
				program.totalWorkouts > 0
					? Math.round((workoutProgress.length / program.totalWorkouts) * 100)
					: 0;

			// Get all progression history for exercises in this program
			const progressionHistory = await prisma.progression_history.findMany({
				where: {
					user_id: Number(userId),
					program_id: Number(programId),
				},
				include: {
					exercise: true,
				},
			});

			// Calculate average strength gain
			const exerciseGains: Record<
				number,
				{ name: string; firstWeight: number; latestWeight: number }
			> = {};

			for (const ph of progressionHistory) {
				const exerciseId = ph.exercise_id;

				if (!exerciseGains[exerciseId]) {
					exerciseGains[exerciseId] = {
						name: ph.exercise.name,
						firstWeight: Number.parseFloat(ph.oldWeight.toString()),
						latestWeight: Number.parseFloat(ph.newWeight.toString()),
					};
				} else {
					// Update latest weight if this is more recent
					exerciseGains[exerciseId].latestWeight = Number.parseFloat(
						ph.newWeight.toString(),
					);
				}
			}

			const strengthGains = Object.values(exerciseGains).map((ex) => {
				const percentGain =
					ex.firstWeight > 0
						? ((ex.latestWeight - ex.firstWeight) / ex.firstWeight) * 100
						: 0;

				return {
					name: ex.name,
					percentGain: Number.parseFloat(percentGain.toFixed(1)),
					weightGain: Number.parseFloat(
						(ex.latestWeight - ex.firstWeight).toFixed(2),
					),
				};
			});

			// Sort by percent gain
			const sortedGains = [...strengthGains].sort(
				(a, b) => b.percentGain - a.percentGain,
			);

			// Calculate average percent gain
			const totalPercentGain = strengthGains.reduce(
				(sum, ex) => sum + ex.percentGain,
				0,
			);
			const averagePercentGain =
				strengthGains.length > 0
					? Number.parseFloat(
							(totalPercentGain / strengthGains.length).toFixed(1),
						)
					: 0;

			// Get completed exercises to calculate total volume
			const completedExercises = await prisma.completed_exercises.findMany({
				where: {
					user_id: Number(userId),
					workout: {
						program_id: Number(programId),
					},
				},
			});

			// Calculate total volume
			const totalVolume = completedExercises.reduce(
				(sum, ex) =>
					sum + Number.parseFloat(ex.weight.toString()) * ex.sets * ex.reps,
				0,
			);

			logger.debug("Calculated program statistics", {
				programId: Number(programId),
				userId,
				programName: program.name,
				daysActive,
				totalDays,
				completedWorkouts: workoutProgress.length,
				completionPercentage,
				averageStrengthGain: averagePercentGain,
				exercisesWithProgressionData: Object.keys(exerciseGains).length,
			});

			return res.status(200).json({
				program: {
					name: program.name,
					goal: program.goal,
					status: program.status,
					startDate: program.startDate,
					endDate: program.endDate,
					totalWorkouts: program.totalWorkouts,
				},
				statistics: {
					daysActive,
					totalDays,
					completedWorkouts: workoutProgress.length,
					completionPercentage,
					averageStrengthGain: averagePercentGain,
					totalVolume,
					mostImprovedExercises: sortedGains.slice(0, 3),
				},
			});
		} catch (error) {
			logger.error(
				`Error fetching program statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number(programId),
					userId,
				},
			);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

// Helper function to get week number from date
function getWeekNumber(date: Date): number {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 4 - (d.getDay() || 7));
	const yearStart = new Date(d.getFullYear(), 0, 1);
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;
