import { z } from 'zod';

// mirrors skills/external/nextdns-api/references/api-reference.md — keep in sync

export const ListEntrySchema = z.object({
  active: z.boolean().optional(),
  id: z.string(),
});
export type ListEntry = z.infer<typeof ListEntrySchema>;

export const SecuritySchema = z.object({
  aiThreatDetection: z.boolean().optional(),
  cryptojacking: z.boolean().optional(),
  csam: z.boolean().optional(),
  ddns: z.boolean().optional(),
  dga: z.boolean().optional(),
  dnsRebinding: z.boolean().optional(),
  googleSafeBrowsing: z.boolean().optional(),
  idnHomographs: z.boolean().optional(),
  nrd: z.boolean().optional(),
  parking: z.boolean().optional(),
  threatIntelligenceFeeds: z.boolean().optional(),
  tlds: z.array(ListEntrySchema).optional(),
  typosquatting: z.boolean().optional(),
});
export type Security = z.infer<typeof SecuritySchema>;

export const PrivacySchema = z.object({
  allowAffiliate: z.boolean().optional(),
  blocklists: z.array(ListEntrySchema).optional(),
  disguisedTrackers: z.boolean().optional(),
  natives: z.array(ListEntrySchema).optional(),
});
export type Privacy = z.infer<typeof PrivacySchema>;

export const ParentalControlSchema = z.object({
  blockBypass: z.boolean().optional(),
  categories: z.array(ListEntrySchema).optional(),
  safeSearch: z.boolean().optional(),
  services: z.array(ListEntrySchema).optional(),
  youtubeRestrictedMode: z.boolean().optional(),
});
export type ParentalControl = z.infer<typeof ParentalControlSchema>;

export const SettingsSchema = z.object({
  blockPage: z.object({ enabled: z.boolean().optional() }).optional(),
  logs: z
    .object({
      drop: z.object({ domain: z.boolean().optional(), ip: z.boolean().optional() }).optional(),
      enabled: z.boolean().optional(),
      // the live API accepts more regions than the bundled OpenAPI reference documents (e.g. "ch")
      location: z.string().optional(),
      retention: z.number().optional(),
    })
    .optional(),
  performance: z
    .object({
      cacheBoost: z.boolean().optional(),
      cnameFlattening: z.boolean().optional(),
      ecs: z.boolean().optional(),
    })
    .optional(),
  web3: z.boolean().optional(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const ProfileSchema = z.object({
  allowlist: z.array(ListEntrySchema).optional(),
  denylist: z.array(ListEntrySchema).optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  parentalControl: ParentalControlSchema.optional(),
  privacy: PrivacySchema.optional(),
  security: SecuritySchema.optional(),
  settings: SettingsSchema.optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// 10 different row shapes per dimension — loose record instead of one schema each
export const AnalyticsRowSchema = z.record(z.string(), z.unknown());
export const AnalyticsResponseSchema = z.object({
  data: z.array(AnalyticsRowSchema),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const LogEntrySchema = z.object({
  client: z.string().optional(),
  clientIp: z.string().optional(),
  device: z.record(z.string(), z.unknown()).optional(),
  domain: z.string(),
  encrypted: z.boolean().optional(),
  protocol: z.string().optional(),
  reasons: z.array(z.record(z.string(), z.unknown())).optional(),
  root: z.string().optional(),
  status: z.enum(['default', 'error', 'blocked', 'allowed']).optional(),
  timestamp: z.string(),
  tracker: z.string().optional(),
});

export const LogsResponseSchema = z.object({
  data: z.array(LogEntrySchema),
  meta: z.record(z.string(), z.unknown()).optional(),
});
