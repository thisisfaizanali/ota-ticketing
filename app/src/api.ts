import { locale } from "@/i18n";

export type Event = {
  id: number;
  name: string;
  venue: string;
  date: string;
  priceYen: number;
  ticketsLeft: number;
};

export type Ticket = {
  code: string;
  userId: number;
  eventId: number;
  checkedInAt: string | null;
  createdAt: string;
};

export type TicketWithEvent = Ticket & { event: Event };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: any) {
    super(message);
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Android fetch has no default timeout; a dropped connection would hang forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "X-User-Id": USER_ID },
    });
  } catch {
    // Status 0 = never got a response (offline, timeout); screens translate it.
    throw new ApiError("Network error", 0, null);
  } finally {
    clearTimeout(timer);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status, body);
  return body as T;
}

export const getEvents = () => request<Event[]>("/events");

export const bookEvent = (id: number, quantity: number) =>
  request<Ticket[]>(`/events/${id}/book`, { method: "POST", body: JSON.stringify({ quantity }) });

export const getMyTickets = () => request<TicketWithEvent[]>("/me/tickets");

export const checkIn = (code: string) =>
  request<Ticket & { event?: Event }>("/checkins", { method: "POST", body: JSON.stringify({ code }) });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(locale(), { dateStyle: "medium", timeStyle: "short" });
