import axios from "axios";
import type { Application, CampaignCostReport, Feature, Journey, OverviewData, Profile, SavedReport, SyncJob } from "../types";

export type ApplicationInput = {
  name: string;
  packageName: string;
  appUrl: string;
  ga4PropertyId: string;
  appIconData?: string | null;
  appIconUrl?: string | null;
};

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";
export const googleAuthUrl = `${apiBaseUrl}/auth/google`;
export const googleReconnectUrl = `${apiBaseUrl}/auth/google?reconnect=1`;

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const services = {
  me: async () => (await api.get<{ profile: Profile; googleConnected: boolean }>("/auth/me")).data,
  apps: async () => (await api.get<Application[]>("/apps")).data,
  createApp: async (input: ApplicationInput) => (await api.post<Application>("/apps", input)).data,
  updateApp: async (id: string, input: ApplicationInput) => (await api.patch<Application>(`/apps/${id}`, input)).data,
  deleteApp: async (id: string) => { await api.delete(`/apps/${id}`); },
  googlePlayIcon: async (appUrl: string) =>
    (await api.post<{ packageName: string; appIconUrl: string }>("/apps/google-play-icon", { appUrl })).data,
  validateProperty: async (appId: string, propertyId: string) =>
    (await api.post(`/apps/${appId}/ga4/validate-property`, { propertyId })).data,
  features: async (appId: string) => (await api.get<Feature[]>(`/apps/${appId}/features`)).data,
  createFeature: async (appId: string, name: string, events: string[]) =>
    (await api.post<Feature>(`/apps/${appId}/features`, { name, events })).data,
  updateFeatureEvents: async (featureId: string, events: string[]) =>
    (await api.put<Feature>(`/features/${featureId}/events`, { events })).data,
  updateFeature: async (featureId: string, name: string, events: string[]) =>
    (await api.patch<Feature>(`/features/${featureId}`, { name, events })).data,
  deleteFeature: async (featureId: string) => { await api.delete(`/features/${featureId}`); },
  discoverEvents: async (appId: string, startDate: string, endDate: string, appVersion: string) =>
    (await api.get<{ events: string[] }>(`/apps/${appId}/ga4/events`, {
      params: { startDate, endDate, ...(appVersion ? { appVersion } : {}) },
    })).data.events,
  journey: async (appId: string, featureId: string, startDate: string, endDate: string, appVersion: string) =>
    (await api.get<Journey>(`/apps/${appId}/features/${featureId}/journey`, {
      params: { startDate, endDate, ...(appVersion ? { appVersion } : {}) },
    })).data,
  overview: async (appId: string, startDate: string, endDate: string, appVersion: string, country: string) =>
    (await api.get<OverviewData>(`/apps/${appId}/ga4/overview`, {
      params: { startDate, endDate, ...(appVersion ? { appVersion } : {}), ...(country ? { country } : {}) },
    })).data,
  campaigns: async (startDate: string, endDate: string) =>
    (await api.get<CampaignCostReport>("/ga4/campaigns", { params: { startDate, endDate } })).data,
  sync: async (appId: string) => (await api.post<SyncJob>(`/apps/${appId}/sync`)).data,
  saveReport: async (appId: string, name: string, config: Record<string, unknown>) =>
    (await api.post(`/apps/${appId}/reports`, { name, config })).data,
  reports: async (appId: string) => (await api.get<SavedReport[]>(`/apps/${appId}/reports`)).data,
  syncJobs: async (appId: string) => (await api.get<SyncJob[]>(`/apps/${appId}/sync`)).data,
};
