export type ComplaintRecipient = "admin" | "ayesha" | "both";

export interface ComplaintRecord {
    complaint_id: number | string;
    name: string;
    email: string;
    recipient: ComplaintRecipient;
    message: string;
    created_at: string;
}

const STORAGE_KEY = "finagent_complaints";

export function readLocalComplaints(): ComplaintRecord[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const records: unknown = saved ? JSON.parse(saved) : [];
        return Array.isArray(records) ? (records as ComplaintRecord[]) : [];
    } catch {
        return [];
    }
}

export function saveLocalComplaints(records: ComplaintRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function cacheLocalComplaint(record: ComplaintRecord) {
    const records = readLocalComplaints().filter(
        (existing) => existing.complaint_id !== record.complaint_id,
    );
    saveLocalComplaints([record, ...records]);
}

export function createLocalComplaint(
    complaint: Omit<ComplaintRecord, "complaint_id" | "created_at">,
): ComplaintRecord {
    return {
        ...complaint,
        complaint_id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
    };
}