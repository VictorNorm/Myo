import {
	statsRepository,
	type ExerciseProgressionData,
	type CompletedExerciseWithDetails,
	type WorkoutProgressData,
	type ProgramBasicInfo,
	type ProgressionHistoryWithExercise,
} from "./repositories/statsRepository";
import logger from "./logger";

// Response interfaces
export interface VolumeData {
	volumeByDate: Array<{
		date: string;
		volume: number;
	}>;
	volumeByMuscleGroup: Array<{
		muscleGroup: string;
		volume: number;
	}>;
	volumeByExercise: Array<{
		exercise: string;
		volume: number;
	}>;
	weeklyData: Array<{
		weekStart: string;
		volume: number;
		weekNumber: number;
	}>;
	totalVolume: number;
}

export interface WorkoutFrequencyData {
	currentStreak: number;       // CHANGED from weeklyStreak
	longestStreak: number;       // ADD this
	totalWorkouts: number;       // CHANGED from completedWorkouts
	avgWorkoutsPerWeek: number;  
	consistency: number;          
	weeklyFrequency: Array<{
		weekStart: string;
		workoutCount: number;
		weekNumber: number;
	}>;
}

export interface ProgramStatistics {
	programInfo: {
		id: number;
		name: string;
		startDate: string;
		totalWorkouts: number;
		status: string;
	};
	daysActive: number;
	completionPercentage: number;
	strengthGains: Array<{
		exercise: string;
		firstWeight: number;
		latestWeight: number;
		percentGain: number;
	}>;
	averagePercentGain: number;
	totalVolume: number;
	mostImprovedExercises: Array<{
		exercise: string;
		percentGain: number;
	}>;
}

const calculateAvgWorkoutsPerWeek = (weeklyFrequency: Array<{workoutCount: number}>): number => {
  if (weeklyFrequency.length === 0) return 0;
  const total = weeklyFrequency.reduce((sum, week) => sum + week.workoutCount, 0);
  return Math.round((total / weeklyFrequency.length) * 10) / 10; // Round to 1 decimal
};

export type TimeFrameType = "week" | "month" | "program" | "all";

// Utility functions
export const getWeekNumber = (date: Date): number => {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const statsService = {
	// Get exercise progression data for a program
	async getExerciseProgression(
		programId: number,
		userId: number
	): Promise<ExerciseProgressionData[]> {
		try {
			const progressionData = await statsRepository.getExerciseProgressionData(
				programId,
				userId
			);

			logger.debug("Retrieved exercise progression data", {
				programId,
				userId,
				exerciseCount: progressionData.length,
			});

			return progressionData;
		} catch (error) {
			logger.error(
				`Error fetching exercise progression: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId,
					userId,
				}
			);
			throw error;
		}
	},

	// Calculate volume data and trends
	async getVolumeData(
		programId: number,
		userId: number,
		timeFrame: TimeFrameType
	): Promise<VolumeData> {
		try {
			// Get program info for date filtering
			const programInfo = await statsRepository.getProgramInfo(programId);
			if (!programInfo) {
				throw new Error("Program not found");
			}

			// Get date filter based on timeframe
			const dateFilter = statsRepository.getDateFilterForTimeFrame(
				programInfo.startDate,
				timeFrame
			);

			// Get completed exercises with muscle group details
			const completedExercises = await statsRepository.getCompletedExercisesWithDetails(
				programId,
				userId,
				dateFilter
			);

			// Calculate volume for each completed exercise
			const exercisesWithVolume = completedExercises.map((exercise) => ({
				...exercise,
				volume: exercise.sets * exercise.reps * Number(exercise.weight),
			}));

			// Calculate volume by date
			const volumeByDateMap = new Map<string, number>();
			for (const exercise of exercisesWithVolume) {
				const dateKey = exercise.completedAt.toISOString().split("T")[0];
				volumeByDateMap.set(
					dateKey,
					(volumeByDateMap.get(dateKey) || 0) + exercise.volume
				);
			}

			const volumeByDate = Array.from(volumeByDateMap.entries())
				.map(([date, volume]) => ({ date, volume }))
				.sort((a, b) => a.date.localeCompare(b.date));

			// Calculate volume by muscle group
			const volumeByMuscleGroupMap = new Map<string, number>();
			for (const exercise of exercisesWithVolume) {
				for (const mg of exercise.exercise.muscle_groups) {
					const muscleGroup = mg.muscle_groups.name;
					volumeByMuscleGroupMap.set(
						muscleGroup,
						(volumeByMuscleGroupMap.get(muscleGroup) || 0) + exercise.volume
					);
				}
			}

			const volumeByMuscleGroup = Array.from(volumeByMuscleGroupMap.entries())
				.map(([muscleGroup, volume]) => ({ muscleGroup, volume }))
				.sort((a, b) => b.volume - a.volume);

			// Calculate volume by exercise
			const volumeByExerciseMap = new Map<string, number>();
			for (const exercise of exercisesWithVolume) {
				const exerciseName = exercise.exercise.name;
				volumeByExerciseMap.set(
					exerciseName,
					(volumeByExerciseMap.get(exerciseName) || 0) + exercise.volume
				);
			}

			const volumeByExercise = Array.from(volumeByExerciseMap.entries())
				.map(([exercise, volume]) => ({ exercise, volume }))
				.sort((a, b) => b.volume - a.volume);

			// Calculate weekly data
			const weeklyDataMap = new Map<number, { volume: number; weekStart: Date }>();
			for (const exercise of exercisesWithVolume) {
				const weekNumber = getWeekNumber(exercise.completedAt);
				const weekStart = new Date(exercise.completedAt);
				weekStart.setDate(weekStart.getDate() - weekStart.getDay());

				if (!weeklyDataMap.has(weekNumber)) {
					weeklyDataMap.set(weekNumber, { volume: 0, weekStart });
				}
				weeklyDataMap.get(weekNumber)!.volume += exercise.volume;
			}

			const weeklyData = Array.from(weeklyDataMap.entries())
				.map(([weekNumber, { volume, weekStart }]) => ({
					weekStart: weekStart.toISOString().split("T")[0],
					volume,
					weekNumber,
				}))
				.sort((a, b) => a.weekNumber - b.weekNumber);

			// Calculate total volume
			const totalVolume = exercisesWithVolume.reduce(
				(sum, exercise) => sum + exercise.volume,
				0
			);

			logger.debug("Calculated volume data", {
				programId,
				userId,
				timeFrame,
				totalVolume,
				exerciseCount: completedExercises.length,
			});

			return {
				volumeByDate,
				volumeByMuscleGroup,
				volumeByExercise,
				weeklyData,
				totalVolume,
			};
		} catch (error) {
			logger.error(
				`Error calculating volume data: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId,
					userId,
					timeFrame,
				}
			);
			throw error;
		}
	},

	// Calculate workout frequency and streak data
	async getWorkoutFrequencyData(
		programId: number,
		userId: number,
		timeFrame: TimeFrameType
	): Promise<WorkoutFrequencyData> {
		try {
			// Get program info
			const programInfo = await statsRepository.getProgramInfo(programId);
			if (!programInfo) {
				throw new Error("Program not found");
			}

			// Get date filter
			const dateFilter = statsRepository.getDateFilterForTimeFrame(
				programInfo.startDate,
				timeFrame
			);

			// Get workout completions (uses new workout_completions table)
			const workoutCompletions = await statsRepository.getWorkoutCompletions(
				programId,
				userId,
				dateFilter
			);

			// Calculate weekly frequency (keep existing)
			const weeklyFrequency = this.calculateWeeklyFrequency(workoutCompletions);

			// Calculate completed workouts count
			const totalWorkouts = workoutCompletions.length;

			// Calculate consistency percentage
			const consistency = this.calculateConsistency(
				workoutCompletions,
				programInfo.weeklyFrequency
			);

			// Calculate weekly streak (≥75% completion)
			const currentStreak = this.calculateWeeklyStreak(
				workoutCompletions,
				programInfo.weeklyFrequency,
				0.75  // 75% threshold
			);

			const longestStreak = this.calculateLongestStreak(workoutCompletions);

			// Calculate average workouts per week
			const avgWorkoutsPerWeek = this.calculateAvgWorkoutsPerWeek(
				workoutCompletions,
				programInfo.startDate
			);

			logger.debug("Calculated workout frequency data", {
				programId,
				userId,
				timeFrame,
				totalWorkouts,
				currentStreak,
				avgWorkoutsPerWeek,
				consistency,
			});
			return {
				currentStreak,
				longestStreak,
				totalWorkouts,
				avgWorkoutsPerWeek,
				consistency,
				weeklyFrequency,
			};
		} catch (error) {
			logger.error(
				`Error calculating workout frequency: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId,
					userId,
					timeFrame,
				}
			);
			throw error;
		}
	},

	// Calculate comprehensive program statistics
	async getProgramStatistics(
		programId: number,
		userId: number
	): Promise<ProgramStatistics> {
		try {
			// Get program info
			const programInfo = await statsRepository.getProgramInfo(programId);
			if (!programInfo) {
				throw new Error("Program not found");
			}

			// Get workout progress for days active calculation
			const workoutProgress = await statsRepository.getWorkoutProgressData(
				programId,
				userId
			);

			// Get progression history for strength gains
			const progressionHistory = await statsRepository.getProgressionHistoryWithExercises(
				programId,
				userId
			);

			// Get completed exercises for volume calculation
			const completedExercises = await statsRepository.getCompletedExercisesForVolume(
				programId,
				userId
			);

			// Calculate days active
			const uniqueDates = new Set(
				workoutProgress.map((wp) => wp.completed_at.toISOString().split("T")[0])
			);
			const daysActive = uniqueDates.size;

			// Calculate completion percentage
			const totalWorkouts = workoutProgress.length;
			const completionPercentage = programInfo.totalWorkouts > 0 
				? Math.round((totalWorkouts / programInfo.totalWorkouts) * 100)
				: 0;

			// Calculate strength gains
			const strengthGains = this.calculateStrengthGains(progressionHistory);

			// Calculate average percent gain
			const averagePercentGain = strengthGains.length > 0
				? strengthGains.reduce((sum, gain) => sum + gain.percentGain, 0) / strengthGains.length
				: 0;

			// Calculate total volume
			const totalVolume = completedExercises.reduce(
				(sum, exercise) => sum + (exercise.sets * exercise.reps * Number(exercise.weight)),
				0
			);

			// Get most improved exercises (top 5)
			const mostImprovedExercises = strengthGains
				.sort((a, b) => b.percentGain - a.percentGain)
				.slice(0, 5)
				.map((gain) => ({
					exercise: gain.exercise,
					percentGain: gain.percentGain,
				}));

			const result: ProgramStatistics = {
				programInfo: {
					id: programInfo.id,
					name: programInfo.name,
					startDate: programInfo.startDate.toISOString(),
					totalWorkouts: programInfo.totalWorkouts,
					status: programInfo.status,
				},
				daysActive,
				completionPercentage,
				strengthGains,
				averagePercentGain: Math.round(averagePercentGain * 100) / 100,
				totalVolume: Math.round(totalVolume),
				mostImprovedExercises,
			};

			logger.debug("Calculated program statistics", {
				programId,
				userId,
				daysActive,
				completionPercentage,
				strengthGainsCount: strengthGains.length,
				totalVolume,
			});

			return result;
		} catch (error) {
			logger.error(
				`Error calculating program statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId,
					userId,
				}
			);
			throw error;
		}
	},

	// Helper methods for calculations
	// Calculate consistency based on weekly completion rate
	calculateConsistency(
		completions: Array<{ workout_id: number; completed_at: Date }>,
		expectedWorkoutsPerWeek: number  // RENAMED parameter
		): number {
		if (completions.length === 0 || expectedWorkoutsPerWeek === 0) {
			return 0;
		}

		// Group completions by week
		const weeklyCompletions = new Map<string, number>();

		for (const completion of completions) {
			const weekNumber = getWeekNumber(completion.completed_at);
			const year = completion.completed_at.getFullYear();
			const weekKey = `${year}-W${weekNumber}`;
			weeklyCompletions.set(weekKey, (weeklyCompletions.get(weekKey) || 0) + 1);
		}

		// Calculate score for each week
		const weeklyScores: number[] = [];
		for (const [weekKey, workoutCount] of weeklyCompletions.entries()) {
			// Cap at 100% - doing more than expected doesn't increase score
			const weekScore = Math.min(1, workoutCount / expectedWorkoutsPerWeek);
			weeklyScores.push(weekScore);
		}

		// Average all weekly scores
		const averageScore = weeklyScores.reduce((sum, score) => sum + score, 0) / weeklyScores.length;
		
		return Math.round(averageScore * 100);
	},

	/**
	 * Calculate weekly streak - counts consecutive weeks with ≥75% workout completion
	 * Promotes consistency while allowing rest days and life flexibility
	 * @param threshold - Minimum completion percentage (default 0.75 = 75%)
	 */
	calculateWeeklyStreak(
		completions: Array<{ workout_id: number; completed_at: Date }>,
		expectedWorkoutsPerWeek: number,
		threshold: number = 0.75  // 75% completion threshold
	): number {
		if (completions.length === 0 || expectedWorkoutsPerWeek === 0) {
			return 0;
		}

		// Group completions by week
		const weeklyCompletions = new Map<string, { 
			count: number; 
			weekStart: Date;
			weekNumber: number;
		}>();

		for (const completion of completions) {
			const completionDate = new Date(completion.completed_at);
			const weekNumber = getWeekNumber(completionDate);
			const year = completionDate.getFullYear();
			const weekKey = `${year}-W${weekNumber}`;

			if (!weeklyCompletions.has(weekKey)) {
				// Calculate week start (Monday)
				const weekStart = new Date(completionDate);
				const day = weekStart.getDay();
				const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
				weekStart.setDate(diff);
				weekStart.setHours(0, 0, 0, 0);

				weeklyCompletions.set(weekKey, {
					count: 0,
					weekStart,
					weekNumber
				});
			}

			const week = weeklyCompletions.get(weekKey)!;
			week.count++;
		}

		// Sort weeks by date
		const sortedWeeks = Array.from(weeklyCompletions.values())
			.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

		// Count streak from most recent week backwards
		let streak = 0;
		const requiredWorkouts = Math.ceil(expectedWorkoutsPerWeek * threshold);

		for (const week of sortedWeeks) {
			// Check if this week meets the threshold
			if (week.count >= requiredWorkouts) {
				streak++;
			} else {
				// Streak broken
				break;
			}
		}

		return streak;
	},

	calculateLongestStreak(
		completions: Array<{ completed_at: Date }>
	): number {
		if (completions.length === 0) {
			return 0;
		}

		// Sort completions by date
		const sortedCompletions = [...completions].sort(
			(a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
		);

		let longestStreak = 0;
		let currentStreak = 1;

		for (let i = 1; i < sortedCompletions.length; i++) {
			const prevDate = new Date(sortedCompletions[i - 1].completed_at);
			const currDate = new Date(sortedCompletions[i].completed_at);
			
			// Calculate days between workouts
			const daysDiff = Math.floor(
				(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			// If within 3 days, continue streak (allows for rest days)
			if (daysDiff <= 3) {
				currentStreak++;
			} else {
				// Streak broken, update longest if current was longer
				longestStreak = Math.max(longestStreak, currentStreak);
				currentStreak = 1;
			}
		}

		// Check final streak
		longestStreak = Math.max(longestStreak, currentStreak);

		return longestStreak;
	},

	calculateAvgWorkoutsPerWeek(
		completions: Array<{ completed_at: Date }>,
		programStartDate: Date
	): number {
		if (completions.length === 0) {
			return 0;
		}

		const now = new Date();
		const startDate = new Date(programStartDate);
		
		// Calculate weeks since program start
		const millisecondsPerWeek = 7 * 24 * 60 * 60 * 1000;
		const weeksSinceStart = Math.max(1, (now.getTime() - startDate.getTime()) / millisecondsPerWeek);
		
		// Calculate average
		const average = completions.length / weeksSinceStart;
		
		// Round to 1 decimal place
		return Math.round(average * 10) / 10;
	},


	calculateWeeklyFrequency(
		completions: Array<{ completed_at: Date }>
	): Array<{
		weekStart: string;
		workoutCount: number;
		weekNumber: number;
	}> {
		const weeklyMap = new Map<number, { count: number; weekStart: Date }>();

		for (const completion of completions) {
			const weekNumber = getWeekNumber(completion.completed_at);
			const weekStart = new Date(completion.completed_at);
			weekStart.setDate(weekStart.getDate() - weekStart.getDay());

			if (!weeklyMap.has(weekNumber)) {
				weeklyMap.set(weekNumber, { count: 0, weekStart });
			}
			weeklyMap.get(weekNumber)!.count++;
		}

		return Array.from(weeklyMap.entries())
			.map(([weekNumber, { count, weekStart }]) => ({
				weekStart: weekStart.toISOString().split("T")[0],
				workoutCount: count,
				weekNumber,
			}))
			.sort((a, b) => a.weekNumber - b.weekNumber);
	},

	calculateStrengthGains(progressionHistory: ProgressionHistoryWithExercise[]): Array<{
		exercise: string;
		firstWeight: number;
		latestWeight: number;
		percentGain: number;
	}> {
		const exerciseGains = new Map<number, {
			name: string;
			firstWeight: number;
			latestWeight: number;
		}>();

		// Group by exercise and find first and latest weights
		for (const progression of progressionHistory) {
			const exerciseId = progression.exercise_id;
			const newWeight = Number(progression.newWeight);

			if (!exerciseGains.has(exerciseId)) {
				exerciseGains.set(exerciseId, {
					name: progression.exercise.name,
					firstWeight: newWeight,
					latestWeight: newWeight,
				});
			} else {
				const existing = exerciseGains.get(exerciseId)!;
				existing.latestWeight = newWeight;
			}
		}

		return Array.from(exerciseGains.values())
			.filter((gain) => gain.firstWeight > 0) // Avoid division by zero
			.map((gain) => ({
				exercise: gain.name,
				firstWeight: gain.firstWeight,
				latestWeight: gain.latestWeight,
				percentGain: Math.round(
					((gain.latestWeight - gain.firstWeight) / gain.firstWeight) * 10000
				) / 100,
			}))
			.filter((gain) => gain.percentGain > 0); // Only show positive gains
	},
};