export interface ExerciseWeight {
  exerciseId: number;
  weight: number;
}

export interface BeginnerQuestionnaireData {
  age: number;
  gender: 'male' | 'female';
  experience?: 'none' | 'some';
  availableTime: '25-35' | '40-50';
  frequency: 2 | 3;
}

export interface CreateBeginnerProgramRequest {
  templateId: number;
  questionnaireData: {
    age: number;
    gender: 'male' | 'female';
    frequency: 2 | 3;
  };
  programName?: string;
}