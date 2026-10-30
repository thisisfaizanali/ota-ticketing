import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/db";

const day = 24 * 60 * 60 * 1000;
let eventId: number;
let userIds: number[];

beforeAll(async () => {
  const users = await Promise.all(
    Array.from({ length: 10 }, (_, i) => prisma.user.create({ data: { name: `test-user-${i}` } })),
  );
  userIds = users.map((u) => u.id);
  const event = await prisma.event.create({
    data: { name: "Test Event", venue: "Test Hall", date: new Date(Date.now() + day), priceYen: 1000, ticketsLeft: 1 },
  });
  eventId = event.id;
});

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { eventId } });
  await prisma.event.delete({ where: { id: eventId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test("concurrent bookings never oversell", async () => {
  const responses = await Promise.all(
    userIds.map((id) =>
      request(app).post(`/events/${eventId}/book`).set("X-User-Id", String(id)).send({ quantity: 1 }),
    ),
  );
  const statuses = responses.map((r) => r.status);
  expect(statuses.filter((s) => s === 201)).toHaveLength(1);
  expect(statuses.filter((s) => s === 409)).toHaveLength(9);
  expect((await prisma.event.findUniqueOrThrow({ where: { id: eventId } })).ticketsLeft).toBe(0);
  expect(await prisma.ticket.count({ where: { eventId } })).toBe(1);
});

test("double check-in returns 409 with the first check-in time", async () => {
  const { code } = await prisma.ticket.findFirstOrThrow({ where: { eventId } });
  const first = await request(app).post("/checkins").send({ code });
  expect(first.status).toBe(200);
  const second = await request(app).post("/checkins").send({ code });
  expect(second.status).toBe(409);
  expect(second.body.checkedInAt).toBe(first.body.checkedInAt);
});
