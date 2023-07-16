"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { action } from "@/lib/actions";
import { Prisma } from "@prisma/client";
import { UnauthorizedError } from "@/lib/exceptions/custom-hooks";

// when snippets rating hits this number
// it will no longer be on the race
// and will be reviewed by admin on the review page

export const saveUserResultAction = action(
  z.object({
    timeTaken: z.union([z.string(), z.number()]),
    errors: z.number().nullable(),
    cpm: z.number(),
    accuracy: z.number().min(0).max(100),
    snippetId: z.string(),
  }),

  async (input, { prisma, user }) => {
    console.log(input, 123);

    if (!user) throw new UnauthorizedError();

    prisma.$transaction(async (tx) => {
      await tx.result.create({
        data: {
          userId: user.id,
          takenTime: input.timeTaken.toString(),
          errorCount: input.errors,
          cpm: input.cpm,
          accuracy: new Prisma.Decimal(input.accuracy),
          snippetId: input.snippetId,
        },
      });

      const avgValues = await tx.result.aggregate({
        where: {
          userId: user.id,
        },
        _avg: {
          accuracy: true,
          cpm: true,
        },
      });
      console.log(avgValues);

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          averageAccuracy: Number(avgValues._avg.accuracy?.toFixed(2)) ?? 0,
          averageCpm: Number(avgValues._avg.cpm?.toFixed(2)) ?? 0,
        },
      });
    });
  }
);
