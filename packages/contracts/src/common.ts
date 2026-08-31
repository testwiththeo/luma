import { z } from 'zod';

/** Immutable internal status types. Every MVP board has exactly one column per status. */
export const STATUS_TYPES = ['inbox', 'ready', 'in_progress', 'blocked', 'done'] as const;
export const statusTypeSchema = z.enum(STATUS_TYPES);
export type StatusType = z.infer<typeof statusTypeSchema>;

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const prioritySchema = z.enum(PRIORITIES);
export type Priority = z.infer<typeof prioritySchema>;

export const TASK_TYPES = [
  'general',
  'test_design',
  'test_execution',
  'exploratory',
  'bug_investigation',
  'bug_verification',
  'test_automation',
  'regression',
  'documentation',
] as const;
export const taskTypeSchema = z.enum(TASK_TYPES);
export type TaskType = z.infer<typeof taskTypeSchema>;

export const BLOCKER_CATEGORIES = [
  'environment',
  'test_data',
  'requirement',
  'dependency',
  'access',
  'waiting_for_fix',
  'waiting_for_review',
  'other',
] as const;
export const blockerCategorySchema = z.enum(BLOCKER_CATEGORIES);
export type BlockerCategory = z.infer<typeof blockerCategorySchema>;

/** A non-whitespace title (BR-001). */
export const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title must contain at least one non-whitespace character.')
  .max(500);

/** UTC epoch milliseconds. */
export const timestampSchema = z.number().int().nonnegative();

/** Stable string ID (UUIDv7 or ULID). */
export const idSchema = z.string().min(1).max(64);
