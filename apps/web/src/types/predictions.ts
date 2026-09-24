export type PredictionStage = 'pre_match' | 'live';
export type CalibrationBand = 'low' | 'medium' | 'high';

export interface PredictionPlayerPick {
  playerId?: string;
  playerName?: string;
  probability?: number;
  [key: string]: unknown;
}

export interface PredictionScoreRange {
  type?: string;
  low?: number;
  expected?: number;
  high?: number;
  unit?: string;
}

export interface PartnershipProjection {
  expectedAdditionalRuns?: number;
  horizonBalls?: number;
  reliability?: string;
}

export interface PredictionRun {
  runId: string;
  stage: string;
  modelVersion: string;
  createdAt: string;
  homeWinProb: number;
  awayWinProb: number;
  confidence: number;
  calibrationBand: string;
  explanation: Record<string, unknown>;
  scoreRange?: PredictionScoreRange | null;
  topBatters?: PredictionPlayerPick[] | null;
  topBowlers?: PredictionPlayerPick[] | null;
  xi?: Record<string, unknown> | null;
  momentum?: number | null;
  pressureIndex?: number | null;
  partnershipProjection?: PartnershipProjection | null;
  wicketRisk?: number | null;
  narrative?: string | null;
  narrativeSource?: string | null;
}

export interface MatchPredictions {
  matchId: string;
  preMatch?: PredictionRun | null;
  live?: PredictionRun | null;
}

export interface PredictionHistory {
  matchId: string;
  runs: PredictionRun[];
}

export interface PredictionChartPoint {
  runId?: string;
  stage?: string;
  modelVersion?: string;
  createdAt?: string;
  over?: number | null;
  homeWinProb?: number;
  awayWinProb?: number;
  momentum?: number | null;
  pressureIndex?: number | null;
  reasons?: string[];
}

export interface PredictionChart {
  matchId: string;
  points: PredictionChartPoint[];
}

export interface FormatAccuracy {
  format: string;
  sampleSize: number;
  accuracy: number;
  brierScore: number;
}

export interface ConfidenceBandAccuracy {
  band: string;
  sampleSize: number;
  accuracy: number;
  brierScore: number;
}

export interface PredictionPerformance {
  modelVersion: string;
  sampleSize: number;
  accuracy?: number | null;
  brierScore?: number | null;
  byFormat: FormatAccuracy[];
  byConfidenceBand: ConfidenceBandAccuracy[];
}

export interface MatchSideLabels {
  homeName: string;
  awayName: string;
  homeCode: string;
  awayCode: string;
}

export interface AdminPredictionModelVersion {
  modelVersion: string;
  stage: string;
  runCount: number;
  firstRunAt: string | null;
  lastRunAt: string | null;
  isCurrent: boolean;
}

export interface AdminCalibrationBin {
  bin: number;
  minProbability: number;
  maxProbability: number;
  sampleSize: number;
  meanPredicted: number;
  actualRate: number;
  calibrationError: number;
}

export interface AdminCalibrationFit {
  slope: number;
  intercept: number;
  sampleSize: number;
  brierScore: number | null;
  accuracy: number | null;
  source: string;
  createdAt: string;
}

export interface AdminPredictionCalibration {
  modelVersion: string;
  sampleSize: number;
  expectedCalibrationError: number | null;
  bins: AdminCalibrationBin[];
  latestFit: AdminCalibrationFit | null;
}

export interface AdminPredictionRunDetail extends PredictionRun {
  matchId?: string;
  matchName?: string;
  features?: Record<string, unknown> | null;
}
