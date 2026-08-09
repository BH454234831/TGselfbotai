import { prisma } from "../../db/prisma/service";

export async function handleRelationTool(args: any, userid: number) {
    console.log(args)
    if (!args) return
    const { trust, warm, respect, affection, conflict } = args;
    console.log("trust: ", trust)
    await prisma.relation.upsert({
        where: { telegramUserid: userid },
        update: {
            telegramUserid: userid,
            warm: warm,
            trust: trust,
            respect: respect,
            affection: affection,
            conflict: conflict,
            interactionFrequenct: { increment: 1 }
        },
        create: {
            telegramUserid: userid,
            warm: warm,
            trust: trust,
            respect: respect,
            affection: affection,
            conflict: conflict,
            interactionFrequenct: 1
        }
    })
}
export async function handleFactTool(args: any, userid: number) {
    console.log(args)
    if (!args) return
    args.forEach(async (fact: { class: any; content: any; important?: 0.5 | undefined; id: number }) => {
        const { class: cls, content, important = 0.5, id } = fact;

        const existing = await prisma.facts.findFirst({
            where: { id: id }
        });
        if (existing) {
            await prisma.facts.update({
                where: { id: existing.id },
                data: { important: Math.min((existing.important + important) / 2, 1), content: content, class: cls }
            });
        } else {
            await prisma.facts.create({
                data: { telegramUserid: userid, class: cls, content, important }
            });
        }
    });
}