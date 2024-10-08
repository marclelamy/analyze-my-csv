"use client";

import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DbContext } from "../app/page";
import { SQLQuery } from "@/lib/types/schema";
import { generateNewSQLQuery, generateTransformSQLResult } from "@/lib/action";
import { useUIState } from "ai/rsc";
import { LineChart } from '@/components/charts/LineChart';
import { LineChartData } from '@/lib/types/chartTypes';

export const SQLQueryComponent = ({
    query,
    chartType,
}: {
    query: string,
    chartType: 'line' | 'bar' | 'pie' | 'scatter',
}) => {

    const [conversation, setConversation] = useUIState();
    const [activeView, setActiveView] = useState<'query' | 'table' | 'chart'>('query');
    const [tableData, setTableData] = useState<any>({});
    const [chartData, setChartData] = useState<LineChartData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { db } = useContext(DbContext);

    // Function to execute the SQL query
    const executeQuery = async (queryToExecute: string, retryCount: number = 0) => {
        if (db && queryToExecute) {
            let result: any;
            try {
                result = db.exec(queryToExecute);
                if (result.length > 0) {
                    setTableData(result[0]);
                    setError(null);
                    setActiveView('table');
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

            try {
                const transformFunctionString = await generateTransformSQLResult(result);
                const transformFunction = new Function('sqlResult', `return (${transformFunctionString})(sqlResult)`);
                const transformedData = transformFunction(result);
                console.log('transformedData', transformedData);
                setChartData(transformedData);
                setActiveView('chart');
            } catch (error) {
                console.error('Error in transform function:', error);
                setError("Error transforming data");
            }
        }
    };

    useEffect(() => {
        executeQuery(query);
    }, [db, query]);

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
                    onClick={() => setActiveView('query')}
                    variant={activeView === 'query' ? "default" : "outline"}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    SQL Query
                </Button>
                {tableData.columns && (
                    <Button
                        onClick={() => setActiveView('table')}
                        variant={activeView === 'table' ? "default" : "outline"}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Data Table
                    </Button>
                )}
                {chartData && (
                    <Button
                        onClick={() => setActiveView('chart')}
                        variant={activeView === 'chart' ? "default" : "outline"}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Chart
                    </Button>
                )}
            </div>
            {error ? (
                <div className="mt-4 text-destructive">
                    Error: {error}
                </div>
            ) : (
                <>
                    {activeView === 'query' && (
                        <>
                            <h3 className="text-secondary-foreground mb-2 font-semibold">Generated SQL Query:</h3>
                            <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                                <code className="text-muted-foreground">
                                    {query}
                                </code>
                            </pre>
                        </>
                    )}
                    {activeView === 'table' && tableData.columns && (
                        <div className="mt-4">
                            <h3 className="text-secondary-foreground mb-2 font-semibold">Data Table:</h3>
                            {renderDataTable()}
                        </div>
                    )}
                    {activeView === 'chart' && chartData && chartType === 'line' && (
                        <div className="mt-4">
                            <LineChart data={chartData} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
