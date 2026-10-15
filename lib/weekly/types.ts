export interface ReviewMedia { id: string; file: string; sha256: string; bytes: number; type: "image/png" | "video/mp4" }
export interface ReviewPackage { id: string; title: string; purpose: string; primaryMetric: string; technicalBoundary: string; provenance: { source: string; license: string; credit: string; evidence: string[] }[] }
export interface ReviewPost { id: string; packageId: string; platform: "linkedin" | "instagram" | "youtube"; title: string; caption: string; destination: string; scheduledAt: string; channelId: string; media: string[]; settings: Record<string, unknown>; alt: string[]; historicalStatus: string }
export interface ReviewContent { batchId: string; agentId: "anyhvac.george"; theme: string; timezone: "America/New_York"; fixture: boolean; packages: ReviewPackage[]; posts: ReviewPost[]; media: ReviewMedia[]; qa: { technical: string; rights: string; media: string; evidence: string[] } }
export interface ReviewVersion { number: number; digest: string; createdAt: string; reason: string; content: ReviewContent }
export interface ReviewAction { requestId: string; action: "revision" | "edit" | "review" | "approve"; version: number; digest: string; at: string; target?: string; text?: string; caption?: string }
export interface ReviewState { versions: ReviewVersion[]; actions: ReviewAction[] }
