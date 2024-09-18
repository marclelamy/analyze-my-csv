"use server";

import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import { convertToCoreMessages } from 'ai';
import { openai } from "@ai-sdk/openai";
import { ReactNode } from "react";
import { z } from "zod";
import { nanoid } from "nanoid";
import { JokeComponent } from "@/components/joke-component";
import { SQLQueryComponent } from "@/components/sql-query-component";
import { generateObject } from "ai";
import { jokeSchema, sqlQuerySchema } from "@/lib/types/schema";
import { ChartType, ChartData, LineChartData, LineChartDataPoint } from '@/lib/types/chartTypes';

interface TableInfo {
    tableName: string;
    columns: string[];
}

export interface ServerMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ClientMessage {
    id: string;
    role: "user" | "assistant";
    display: ReactNode;
}

export async function updateSystemPrompt(tableInfo: TableInfo): Promise<void> {
    "use server";

    const history = getMutableAIState();
    const systemMessage = {
        role: "system",
        content: `
            You are a SQLite expert tasked with generating SQL queries to help users understand their CSV data.

            Table name: ${tableInfo.tableName}
            Columns: ${tableInfo.columns.join(", ")}

            CRITICAL RULES:
            1. ONLY generate valid SQLite queries. Use ONLY functions and syntax that are natively supported by SQLite.
            2. DO NOT use functions from other SQL dialects. If unsure, use basic SQL operations that work in SQLite.
            3. ALWAYS use the exact table name "${tableInfo.tableName}" in the FROM clause.
            4. ONLY use the column names provided above. Do not invent or assume any other columns.
            5. For date/time operations, string manipulations, or any complex operations, use ONLY SQLite-compatible functions and techniques.
            6. If a user's request cannot be answered with SQLite-compatible operations using the available columns, respond with "INVALID REQUEST" and nothing else.
            7. Do not provide any explanations or text outside of the SQL query itself.
            8. Ensure all queries are complete and executable in SQLite.

            Your task is to generate SQLite-compatible queries based on user requests. Always prioritize SQLite compatibility over complex operations. If a request is unclear or impossible to fulfill with SQLite and the given schema, respond with "INVALID REQUEST" and nothing else.
            You often make mistake by using functions that are not supported by SQLite. Please be careful and check the documentation of SQLite before using any function.
`
    };
    console.log('adding system prompt', systemMessage);

    history.done((messages: ServerMessage[]) => [systemMessage, ...messages]);
}

export async function continueConversation(
    input: string,
): Promise<ClientMessage> {
    "use server";

    const history = getMutableAIState();

    const result = await streamUI({
        model: openai("gpt-4o-mini"),
        messages: [...history.get(), { role: "user", content: input }],
        text: ({ content, done }) => {
            if (done) {
                history.done((messages: ServerMessage[]) => [
                    ...messages,
                    { role: "assistant", content: content},
                ]);
            }
            return <div>{content}</div>;
        },
        tools: {
            generateSQLQuery: {
                description: "Generate a SQL query and chart type.",
                parameters: z.object({
                    userRequest: z.string().describe("The user's request for data analysis"),
                }),
                generate: async function* ({ userRequest }) {
                    yield <div>Generating SQL query, chart type, and transformation function...</div>;
                    const queryAndTransformResult = await generateObject({
                        model: openai("gpt-4o-mini"),
                        schema: queryAndTransformSchema,
                        prompt:
                            "Generate a SQLite-compatible SQL query and appropriate chart type" +
                            userRequest 
                    });
                    return <SQLQueryComponent 
                        query={queryAndTransformResult.object.query}
                        chartType={queryAndTransformResult.object.chartType}
                    />;
                },
            },
        },
    });

    return {
        id: nanoid(),
        role: "assistant",
        display: result.value,
    };
}

const queryAndTransformSchema = z.object({
    query: z.string().describe("The SQL query to execute"),
    chartType: z.enum(['line']).describe("The type of chart to display"),
});

export async function generateNewSQLQuery(originalQuery: string, errorMessage: string, conversation?: any): Promise<string | null> {
    "use server";

    console.log('\n\n\n\n\n\ngetConversationHistory', conversation);

    const sqlQuerySchema = z.object({
        query: z.string().describe("The corrected SQL query"),
    });

    const input = `
        You are an expert in SQLite. The following SQL query resulted in an error:
        
        Original query: ${originalQuery}
        Error message: ${errorMessage}
        
        Please generate a corrected version of this query that addresses the error and works with SQLite.
        Only return the corrected SQL query, nothing else.
    `

    const messages = [
        conversation, 
        { role: "user", content: input, id: nanoid() }
    ];

    console.log('messages', messages);
    console.log('core messages', convertToCoreMessages(messages));

    const conversationContent = conversation?.display || conversation?.content;
    const coreMessages = convertToCoreMessages([
        { role: "user", content: conversationContent },
        { role: "user", content: input }
    ]);

    console.log('fixed core messages', coreMessages);

    try {
        const result = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: sqlQuerySchema,
            messages: coreMessages,
        });

        console.log('result', result.object);

        return result.object.query;
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error generating new SQL query:", error.message);
        } else {
            console.error("Unknown error generating new SQL query");
        }
        return null;
    }
}

export async function generateTransformSQLResult(sqlResult: any): Promise<string> {
    if (!sqlResult || !Array.isArray(sqlResult) || sqlResult.length === 0) {
        throw new Error("Invalid SQL result format");
    }

    const result = sqlResult[0];
    const { columns } = result;

    if (!columns || !Array.isArray(columns)) {
        throw new Error("Invalid SQL result structure");
    }

    const prompt = `
        I have a SQL query result with the following structure:
        - It's an array with one element.
        - This element is an object with two keys: 'columns' and 'values'.
        - 'columns' is an array of column names (strings): ${columns.join(", ")}
        - 'values' is an array of arrays. Each inner array represents a row of data corresponding to the columns.

        Please write a JavaScript function that transforms this data into the LineChartData format.
        The LineChartData type is defined as follows:

        interface LineChartDataPoint {
          x: number | string;
          y: number;
          series: string;
        }

        interface LineChartData {
          title: string;
          description: string;
          data: LineChartDataPoint[];
        }

        The function should:
        1. Determine which column should be used for the x-axis, y-axis, and optionally the series.
        2. Convert the SQL result into an array of LineChartDataPoint objects.
        3. Return a LineChartData object with an appropriate title and description.

        The function should take one parameter:
        1. sqlResult: Array<{ columns: string[], values: (string | number)[][] }> - The entire SQL result object as described above

        Please provide only the JavaScript function, without any explanations.
    `;

    try {
        const transformFunctionSchema = z.object({
            function: z.string().describe("The JavaScript function to transform SQL results into LineChartData"),
        });

        const result = await generateObject({
            model: openai("gpt-4o-mini"),
            schema: transformFunctionSchema,
            prompt: prompt,
        });

        return result.object.function;
    } catch (error) {
        console.error("Error generating transform function:", error);
        throw error;
    }
}

export const AI = createAI<ServerMessage[], ClientMessage[]>({
    actions: {
        continueConversation,
        updateSystemPrompt,
    },
    initialAIState: [],
    initialUIState: [],
});
