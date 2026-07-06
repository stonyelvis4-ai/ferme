import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAILS = ['demo.admin@ferm.plus', 'demo.owner@ferm.plus'];

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: {
      email: {
        in: DEMO_EMAILS
      }
    },
    select: {
      id: true,
      email: true
    }
  });

  const demoOwner = demoUsers.find((user) => user.email === 'demo.owner@ferm.plus');
  const demoAdmin = demoUsers.find((user) => user.email === 'demo.admin@ferm.plus');

  await prisma.farm.deleteMany({
    where: {
      id: 'demo-ferme-mixte-pisciculture'
    }
  });

  await prisma.refreshSession.deleteMany({
    where: {
      userId: {
        in: demoUsers.map((user) => user.id)
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: demoUsers.map((user) => user.id)
      }
    }
  });

  console.log('Demo users removed:', {
    removedAdmin: Boolean(demoAdmin),
    removedOwner: Boolean(demoOwner)
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
