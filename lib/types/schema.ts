import { DeepPartial } from "ai";
import { z } from "zod";

export const sqlQuerySchema = z.object({
    query: z.string().describe("The SQL query to be executed"),
    chartType: z.string().describe("The type of chart to visualize the query results"),
});

export type SQLQuery = DeepPartial<typeof sqlQuerySchema>;

export const jokeSchema = z.object({
    setup: z.string().describe("the setup of the joke"),
    punchline: z.string().describe("the punchline of the joke"),
});

export type Joke = DeepPartial<typeof jokeSchema>;
