import { FIXED_HEADERS } from './constants';

export type HeaderKey = typeof FIXED_HEADERS[number];

export type CaseRecord = Record<HeaderKey, string> & {
  _id: string; // Internal ID for React keys
  _originalIndex: number;
  _party1Role?: string; // Role of the first party (e.g. Şüpheli)
  _party2Role?: string; // Role of the second party (e.g. Müşteki)
};

export interface ProcessedResult {
  data: CaseRecord[];
  logs: LogEntry[];
  commonCount: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
}