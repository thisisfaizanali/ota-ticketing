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
    throw new Error("Can't reach the server. Check your connection and EXPO_PUBLIC_API_URL.");
  } finally {
    clearTimeout(timer);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const getEvents = () => request<Event[]>("/events");

export const bookEvent = (id: number, quantity: number) =>
  request<Ticket[]>(`/events/${id}/book`, { method: "POST", body: JSON.stringify({ quantity }) });

export const getMyTickets = () => request<TicketWithEvent[]>("/me/tickets");

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
