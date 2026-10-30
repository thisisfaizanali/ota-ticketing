import { prisma } from "../src/db";

const day = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * day);

async function main() {
  // Fixed ids keep X-User-Id values stable across re-seeds.
  await prisma.ticket.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [{ id: 1, name: "Aiko" }, { id: 2, name: "Kenji" }, { id: 3, name: "Yui" }],
  });

  await prisma.event.createMany({
    data: [
      { id: 1, name: "Tokyo Jazz Night", venue: "Blue Note Tokyo", date: inDays(3), priceYen: 8000, ticketsLeft: 50 },
      { id: 2, name: "Indie Rock Live", venue: "Shibuya O-East", date: inDays(7), priceYen: 5500, ticketsLeft: 2 },
      { id: 3, name: "J-Pop Festival", venue: "Saitama Super Arena", date: inDays(14), priceYen: 12000, ticketsLeft: 200 },
      { id: 4, name: "Acoustic Evening", venue: "Billboard Live Osaka", date: inDays(21), priceYen: 6500, ticketsLeft: 30 },
      { id: 5, name: "Electronic Showcase", venue: "Zepp Haneda", date: inDays(30), priceYen: 7000, ticketsLeft: 100 },
    ],
  });

  console.log("Seeded 3 users and 5 events");
}

main().finally(() => prisma.$disconnect());
