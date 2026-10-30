import { randomBytes } from "node:crypto";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import { prisma } from "./db";

export const app = express();
app.use(express.json());

// Gate staff, not a fan: no X-User-Id needed.
app.post("/checkins", async (req, res) => {
  const code = req.body?.code;
  if (typeof code !== "string" || code.trim() === "") {
    return res.status(400).json({ error: "code must be a non-empty string" });
  }
  const { count } = await prisma.ticket.updateMany({
    where: { code, checkedInAt: null },
    data: { checkedInAt: new Date() },
  });
  const ticket = await prisma.ticket.findUnique({ where: { code } });
  if (!ticket) return res.status(404).json({ error: "ticket not found" });
  if (count === 0) {
    return res.status(409).json({ error: "ticket already checked in", checkedInAt: ticket.checkedInAt });
  }
  res.json(ticket);
});

const requireUser: RequestHandler = async (req, res, next) => {
  const id = Number(req.header("X-User-Id"));
  const user = Number.isInteger(id) && (await prisma.user.findUnique({ where: { id } }));
  if (!user) return res.status(401).json({ error: "invalid or missing X-User-Id" });
  res.locals.userId = user.id;
  next();
};
app.use(requireUser);

app.get("/events", async (_req, res) => {
  res.json(await prisma.event.findMany({ where: { date: { gt: new Date() } }, orderBy: { date: "asc" } }));
});

app.post("/events/:id/book", async (req, res) => {
  const quantity = req.body?.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) {
    return res.status(400).json({ error: "quantity must be an integer from 1 to 4" });
  }
  const id = Number(req.params.id);
  const event = Number.isInteger(id) && (await prisma.event.findUnique({ where: { id } }));
  if (!event || event.date <= new Date()) return res.status(404).json({ error: "event not found" });

  const userId: number = res.locals.userId;
  const tickets = await prisma.$transaction(async (tx) => {
    // Conditional decrement is the oversell guard: no read-then-write.
    const { count } = await tx.event.updateMany({
      where: { id, ticketsLeft: { gte: quantity } },
      data: { ticketsLeft: { decrement: quantity } },
    });
    if (count === 0) return null;
    return Promise.all(
      Array.from({ length: quantity }, () =>
        tx.ticket.create({ data: { code: randomBytes(8).toString("hex"), userId, eventId: id } }),
      ),
    );
  });
  if (!tickets) return res.status(409).json({ error: "not enough tickets left" });
  res.status(201).json(tickets);
});

app.get("/me/tickets", async (_req, res) => {
  res.json(
    await prisma.ticket.findMany({
      where: { userId: res.locals.userId },
      include: { event: true },
      orderBy: { createdAt: "desc" },
    }),
  );
});

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "malformed JSON" });
  console.error(err);
  res.status(500).json({ error: "internal server error" });
};
app.use(errorHandler);
