import { type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const logsRouter = createTRPCRouter({
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int(),
        cursor: z.string().nullish(),
        userId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { client, QueryCommand, tableName } = ctx.dynamodb;

      const cursor = input.cursor
        ? JSON.parse(Buffer.from(input.cursor, "base64").toString("utf-8"))
        : undefined;

      const queryParameters: QueryCommandInput = {
        TableName: tableName,
        KeyConditionExpression: "pk = :pkValue",
        ExpressionAttributeValues: {
          ":pkValue": "log",
        },
        ScanIndexForward: false,
        Limit: input.limit,
        ExclusiveStartKey: cursor,
      };

      if (input.userId) {
        queryParameters.FilterExpression = "userId = :userIdValue";
        queryParameters.ExpressionAttributeValues![":userIdValue"] =
          input.userId;
      }

      const response = await client.send(new QueryCommand(queryParameters));

      let nextCursor = null;

      if (response.LastEvaluatedKey) {
        nextCursor = Buffer.from(
          JSON.stringify(response.LastEvaluatedKey),
        ).toString("base64");
      }

      const logsSchema = z.array(
        z.object({
          pk: z.string(),
          sk: z.string(),
          name: z.string(),
          userId: z.string(),
          input: z.any(),
          output: z.any(),
        }),
      );

      const logs = logsSchema.parse(response.Items);

      return {
        logs,
        nextCursor,
        count: response.Count ?? 0,
      };
    }),
});
