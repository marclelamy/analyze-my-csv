"use client";

import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DbContext } from "../app/page";
import { SQLQuery } from "@/lib/types/schema";
import { generateNewSQLQuery, generateTransformSQLResult } from "@/lib/action";
import { useUIState } from "ai/rsc";

export const SQLQueryComponent = ({
    query,
    chartType,
}: {
    query: string,
    chartType: 'line' | 'bar' | 'pie' | 'scatter',
}) => {

    const [conversation, setConversation] = useUIState();
    const [showQuery, setShowQuery] = useState(false);
    const [tableData, setTableData] = useState<any>({});
    // const [chartData, setChartData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const { db } = useContext(DbContext);

    // Function to execute the SQL query
    const executeQuery = async (queryToExecute: string, retryCount: number = 0) => {
        // console.log('executing query', queryToExecute);
        if (db && queryToExecute) {
            let result: any;
            try {
                result = db.exec(queryToExecute);
                if (result.length > 0) {
                    // console.log('\nresult', result);
                    setTableData(result[0]);
                    setError(null);
                } else {
                    setTableData({});
                    setError("Query returned no results");
                    return;
                }
            } catch (error: unknown) {
                console.error('Error executing query:', error);
                setTableData({});
                let errorMessage: string;
                if (error instanceof Error) {
                    errorMessage = error.message;
                } else {
                    errorMessage = "An unknown error occurred";
                }

                // Call the new function to generate a new query
                if (retryCount < 3) {
                    console.log('generating new query');
                    const newQuery = await generateNewSQLQuery(queryToExecute, errorMessage, conversation[0]);
                    if (newQuery) {
                        executeQuery(newQuery, retryCount + 1);
                    } else {
                        setError(errorMessage);
                    }
                } else {
                    setError(errorMessage);
                }
                return;
            }

            // Transform function part outside of try-catch for SQL execution
            try {
                const transformFunctionString = await generateTransformSQLResult(result);
                // console.log('transformFunctionString', transformFunctionString);
                // Create a function from the string
                const transformFunction = new Function('sqlResult', `return (${transformFunctionString})(sqlResult)`);

                // console.log('transformFunction', transformFunction);

                // Execute the function with the result
                const transformedData = transformFunction(result);
                console.log('transformedData', transformedData);
                // TODO: Use transformedData to update your chart or state
            } catch (error) {
                console.error('Error in transform function:', error);
                setError("Error transforming data");
            }
        }
    };

    // Execute query when component mounts or query changes
    useEffect(() => {
        executeQuery(query);
    }, [db, query]);

    // Function to render the data table
    const renderDataTable = () => {
        if (!tableData.columns || !tableData.values) return null;

        return (
            <Table className="mt-4">
                <TableHeader>
                    <TableRow>
                        {tableData.columns.map((header: string, index: number) => (
                            <TableHead key={index}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tableData.values.map((row: any[], rowIndex: number) => (
                        <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <div className="bg-secondary p-4 rounded-md m-4 max-w-prose">
            <div className="flex gap-2 mb-4">
                <Button
                    onClick={() => setShowQuery(!showQuery)}
                    variant="outline"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {showQuery ? "Hide SQL Query" : "Show SQL Query"}
                </Button>
            </div>
            {chartType}
            {showQuery && (
                <>
                    <h3 className="text-secondary-foreground mb-2 font-semibold">Generated SQL Query:</h3>
                    <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                        <code className="text-muted-foreground">
                            {query}
                        </code>
                    </pre>
                </>
            )}
            {error ? (
                <div className="mt-4 text-destructive">
                    Error: {error}
                </div>
            ) : (
                renderDataTable()
            )}
        </div>
    );
};
