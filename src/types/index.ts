// Re-export all types from a centralized location
import { FIXED_HEADERS } from '../constants';

export type HeaderKey = (typeof FIXED_HEADERS)[number];

export type CaseRecord = Record<HeaderKey, string> & {
    _id: string;
    _originalIndex: number;
    _party1Role?: string;
    _party2Role?: string;
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

export type Theme = 'light' | 'dark';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}
