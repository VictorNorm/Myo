import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
   await prisma.exercises.upsert({
        where: {id: 1},
        create: {name: "Pullup", id: 1},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 2},
        create: {name: "Bicep curl", id: 2},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 3},
        create: {name: "Bench supported high row", id: 3},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 4},
        create: {name: "Bench supported reverse flyes", id: 4},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 5},
        create: {name: "Super ROM lateral raises", id: 5},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 6},
        create: {name: "Cable reverse flyes", id: 6},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 7},
        create: {name: "Forearm curls", id: 7},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 8},
        create: {name: "RDL", id: 8},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 9},
        create: {name: "Nordic hamstring", id: 9},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 10},
        create: {name: "Calf raises", id: 10},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 11},
        create: {name: "Leg extension", id: 11},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 12},
        create: {name: "Smith machine squat", id: 12},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 13},
        create: {name: "Dumbbell bench press", id: 13},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 14},
        create: {name: "Pushup", id: 14},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 15},
        create: {name: "Overhead tricep extension", id: 15},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 16},
        create: {name: "Tricep pushdown", id: 16},
        update: {}
    });
    await prisma.exercises.upsert({
        where: {id: 16},
        create: {name: "Tricep pushdown", id: 16},
        update: {}
    });
}
main().then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })